import assert from "node:assert/strict";
import { access, lstat, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createPackageFixture, importPlugin } from "./helpers/package-fixture.mjs";

const names = [
  "my-ext-code-review",
  "my-ext-db-ops",
  "my-ext-feature-dev",
  "my-ext-fix",
  "my-ext-opencode-ext-dev",
  "my-ext-superpowers-planner",
];
const baselinePermissionAgents = ["my-ext-db-ops", "my-ext-feature-dev", "my-ext-fix", "my-ext-opencode-ext-dev", "my-ext-superpowers-planner"];

test("config preserves and idempotently appends paths, instructions, agents and permissions", async (t) => {
  const root = await createPackageFixture(t);
  const { createHooks } = await importPlugin(root);
  const permission = { bash: "deny" };
  const existingAgent = { mode: "primary", prompt: "existing" };
  const config = {
    skills: { paths: ["existing-skill"], custom: true },
    instructions: ["existing.md"],
    agent: { existing: existingAgent },
    permission,
  };
  const hooks = createHooks({ packageRoot: root, localEntry: false });

  await hooks.config(config);
  await hooks.config(config);

  assert.deepEqual(config.skills.paths, ["existing-skill", path.join(root, "skills")]);
  assert.equal(config.skills.custom, true);
  assert.deepEqual(config.instructions, ["existing.md", path.join(root, ".opencode", "bootstrap.md")]);
  assert.strictEqual(config.agent.existing, existingAgent);
  assert.strictEqual(config.permission, permission);
  assert.deepEqual(Object.keys(config.agent).filter((name) => name.startsWith("my-ext-")).sort(), names);
  for (const name of names) {
    assert.equal(config.agent[name].mode, "subagent");
    assert.equal(config.agent[name].model, undefined);
    assert.equal(
      config.agent[name].permission.edit,
      baselinePermissionAgents.includes(name) ? "ask" : "deny",
    );
    assert.equal(config.agent[name].permission.external_directory, "ask");
    assert.ok(config.agent[name].prompt.length > 0);
  }
});

test("same-name user agent wins", async (t) => {
  const root = await createPackageFixture(t);
  const { createHooks } = await importPlugin(root);
  const user = { mode: "primary", prompt: "user prompt" };
  const config = { agent: { "my-ext-fix": user } };

  await createHooks({ packageRoot: root, localEntry: false, logger: { info() {}, warn() {} } }).config(config);

  assert.strictEqual(config.agent["my-ext-fix"], user);
});

test("registered permissions are deeply isolated from the cache and other registrations", async (t) => {
  const root = await createPackageFixture(t);
  const { createHooks } = await importPlugin(root);
  const hooks = createHooks({ packageRoot: root, localEntry: false });
  const first = {};
  const second = {};

  await hooks.config(first);
  first.agent["my-ext-db-ops"].permission.bash["*"] = "deny";
  first.agent["my-ext-db-ops"].permission.task["*"] = "allow";
  await hooks.config(second);

  assert.notStrictEqual(first.agent["my-ext-db-ops"].permission, first.agent["my-ext-fix"].permission);
  assert.notStrictEqual(first.agent["my-ext-db-ops"].permission.bash, first.agent["my-ext-fix"].permission.bash);
  assert.notStrictEqual(first.agent["my-ext-db-ops"].permission.task, first.agent["my-ext-fix"].permission.task);
  assert.equal(first.agent["my-ext-fix"].permission.bash["*"], "ask");
  assert.equal(first.agent["my-ext-fix"].permission.task["*"], "deny");
  assert.notStrictEqual(first.agent["my-ext-db-ops"].permission, second.agent["my-ext-db-ops"].permission);
  assert.notStrictEqual(first.agent["my-ext-db-ops"].permission.bash, second.agent["my-ext-db-ops"].permission.bash);
  assert.notStrictEqual(first.agent["my-ext-db-ops"].permission.task, second.agent["my-ext-db-ops"].permission.task);
  assert.equal(second.agent["my-ext-db-ops"].permission.bash["*"], "ask");
  assert.equal(second.agent["my-ext-db-ops"].permission.task["*"], "deny");
});

test("Windows and POSIX literal paths produce the same registration shape", async (t) => {
  const root = await createPackageFixture(t);
  const { registerConfig } = await importPlugin(root);
  const definitions = [{
    name: "my-ext-db-ops",
    description: "db",
    mode: "subagent",
    prompt: "prompt",
    permission: { read: "allow", edit: "ask", bash: { "*": "ask" }, external_directory: "deny", task: { "*": "deny" } },
  }];
  const windows = {};
  const posix = {};

  registerConfig(windows, { skillsPath: "C:\\pkg\\skills", bootstrapPath: "C:\\pkg\\.opencode\\bootstrap.md", definitions });
  registerConfig(posix, { skillsPath: "/pkg/skills", bootstrapPath: "/pkg/.opencode/bootstrap.md", definitions });

  assert.equal(windows.skills.paths[0], "C:\\pkg\\skills");
  assert.equal(posix.skills.paths[0], "/pkg/skills");
  assert.deepEqual(windows.agent, posix.agent);
});

test("LF and CRLF frontmatter decode quoted and plain descriptions", async (t) => {
  const root = await createPackageFixture(t);
  const generatedFile = path.join(root, ".opencode", "agents", "my-ext-db-ops.md");
  await writeFile(generatedFile, (await readFile(generatedFile, "utf8")).replaceAll("\n", "\r\n"));
  const { createHooks } = await importPlugin(root);
  const config = {};

  await createHooks({ packageRoot: root, localEntry: false }).config(config);

  assert.equal(config.agent["my-ext-db-ops"].description.startsWith('"'), false);
  assert.match(config.agent["my-ext-db-ops"].description, /数据库/);
  assert.equal(config.agent["my-ext-opencode-ext-dev"].description, "开发和审查 OpenCode Agent、Skill、Plugin、MCP 与 permission 配置");
});

test("invalid agent name and permission identify the filename", async (t) => {
  await t.test("name must match filename", async (t) => {
    const root = await createPackageFixture(t);
    const file = path.join(root, ".opencode", "agents", "my-ext-db-ops.md");
    await writeFile(file, (await readFile(file, "utf8")).replace(/^name:.*$/m, "name: my-ext-other"));
    const { createHooks } = await importPlugin(root);
    await assert.rejects(() => createHooks({ packageRoot: root, localEntry: false }).config({}), /my-ext-db-ops\.md: name must be my-ext-db-ops/);
  });

  await t.test("permission must be JSON", async (t) => {
    const root = await createPackageFixture(t);
    const file = path.join(root, ".opencode", "agents", "my-ext-db-ops.md");
    await writeFile(file, (await readFile(file, "utf8")).replace(/^permission:.*$/m, "permission: not-json"));
    const { createHooks } = await importPlugin(root);
    await assert.rejects(() => createHooks({ packageRoot: root, localEntry: false }).config({}), /my-ext-db-ops\.md: invalid permission JSON/);
  });

  await t.test("parse failure leaves an existing config deeply unchanged", async (t) => {
    const root = await createPackageFixture(t);
    const file = path.join(root, ".opencode", "agents", "my-ext-fix.md");
    await writeFile(file, (await readFile(file, "utf8")).replace(/^permission:.*$/m, "permission: not-json"));
    const { createHooks } = await importPlugin(root);
    const config = {
      skills: { paths: ["existing-skill"], custom: true },
      instructions: ["existing.md"],
      agent: { existing: { mode: "primary", prompt: "existing" } },
      permission: { bash: "deny" },
      plugin: ["other-plugin"],
    };
    const before = structuredClone(config);

    await assert.rejects(() => createHooks({ packageRoot: root, localEntry: false }).config(config), /my-ext-fix\.md: invalid permission JSON/);
    assert.deepEqual(config, before);
  });
});

test("agent definitions require subagent mode, inherited model, description and prompt", async (t) => {
  const cases = [
    ["mode: subagent", "mode: primary", /mode must be subagent/],
    ["mode: subagent", "mode: subagent\nmodel: hardcoded", /model must be inherited/],
    [/^description:.*\n/m, "", /missing description/],
    [/^description:.*$/m, "description:   ", /description must be nonempty/],
    [/(\n---\n)[\s\S]*$/, "$1", /empty prompt/],
  ];

  for (const [search, replacement, expected] of cases) {
    await t.test(expected.source, async (t) => {
      const root = await createPackageFixture(t);
      const file = path.join(root, ".opencode", "agents", "my-ext-db-ops.md");
      await writeFile(file, (await readFile(file, "utf8")).replace(search, replacement));
      const { createHooks } = await importPlugin(root);
      await assert.rejects(() => createHooks({ packageRoot: root, localEntry: false }).config({}), new RegExp(`my-ext-db-ops\\.md: ${expected.source}`));
    });
  }
});

test("malformed config shapes fail contextually before mutation", async (t) => {
  const root = await createPackageFixture(t);
  const { createHooks } = await importPlugin(root);
  const hooks = createHooks({ packageRoot: root, localEntry: false });
  const cases = [
    [null, /my-ext: config must be an object/],
    [[], /my-ext: config must be an object/],
    [{ skills: [] }, /my-ext: config\.skills must be an object/],
    [{ skills: { paths: "bad" } }, /my-ext: config\.skills\.paths must be an array/],
    [{ instructions: {} }, /my-ext: config\.instructions must be an array/],
    [{ agent: [] }, /my-ext: config\.agent must be an object/],
    [{ plugin: "my-ext@1.1.0" }, /my-ext: config\.plugin must be an array/],
  ];

  for (const [config, expected] of cases) {
    await t.test(expected.source, async () => {
      const before = structuredClone(config);
      await assert.rejects(() => hooks.config(config), expected);
      assert.deepEqual(config, before);
    });
  }
});

test("agent file parse results are cached by package root", async (t) => {
  const root = await createPackageFixture(t);
  const { createHooks } = await importPlugin(root);
  const hooks = createHooks({ packageRoot: root, localEntry: false });
  const first = {};
  await hooks.config(first);
  const file = path.join(root, ".opencode", "agents", "my-ext-db-ops.md");
  await writeFile(file, (await readFile(file, "utf8")).replace("Database Operations Agent", "Changed On Disk"));
  const second = {};

  await hooks.config(second);

  assert.equal(second.agent["my-ext-db-ops"].prompt, first.agent["my-ext-db-ops"].prompt);
});

test("missing skills directory and bootstrap file fail before registration", async (t) => {
  await t.test("skills", async (t) => {
    const root = await createPackageFixture(t);
    await rm(path.join(root, "skills"), { recursive: true });
    const { createHooks } = await importPlugin(root);
    const config = {};
    await assert.rejects(() => createHooks({ packageRoot: root, localEntry: false }).config(config), /skills directory not found/);
    assert.deepEqual(config, {});
  });

  await t.test("bootstrap", async (t) => {
    const root = await createPackageFixture(t);
    await rm(path.join(root, ".opencode", "bootstrap.md"));
    const { createHooks } = await importPlugin(root);
    const config = {};
    await assert.rejects(() => createHooks({ packageRoot: root, localEntry: false }).config(config), /bootstrap file not found/);
    assert.deepEqual(config, {});
  });
});

test("local repository plus self Git or package spec warns while registration stays idempotent", async (t) => {
  for (const specifier of [
    "https://github.com/yuanx123/my-cc-ext.git#v1.1.0",
    "git+https://github.com/yuanx123/my-cc-ext.git#v1.1.0",
    "git@github.com:yuanx123/my-cc-ext.git",
    "my-ext@1.1.0",
  ]) {
    await t.test(specifier, async (t) => {
      const root = await createPackageFixture(t);
      const { createHooks } = await importPlugin(root);
      const warnings = [];
      const hooks = createHooks({
        packageRoot: root,
        localEntry: true,
        logger: { info() {}, warn(message) { warnings.push(message); } },
      });
      const config = { plugin: [specifier] };

      await hooks.config(config);
      await hooks.config(config);

      assert.equal(warnings.length, 2);
      assert.match(warnings[0], /local plugin entry and package entry/);
      assert.match(warnings[0], /uninstall|INSTALL\.md/i);
      assert.equal(config.skills.paths.length, 1);
      assert.equal(config.instructions.length, 1);
      assert.equal(Object.keys(config.agent).length, 6);
    });
  }

  for (const lookalike of [
    "https://not-github.com/yuanx123/my-cc-ext.git",
    "https://github.com.example.test/yuanx123/my-cc-ext.git",
  ]) {
    await t.test(`rejects ${lookalike}`, async (t) => {
      const root = await createPackageFixture(t);
      const { createHooks } = await importPlugin(root);
      const warnings = [];
      const config = { plugin: [lookalike] };

      await createHooks({
        packageRoot: root,
        localEntry: true,
        logger: { info() {}, warn(message) { warnings.push(message); } },
      }).config(config);

      assert.deepEqual(warnings, []);
      assert.equal(Object.keys(config.agent).length, 6);
    });
  }
});

test("plugin exports equivalent entry points and no message or session hooks", async (t) => {
  const root = await createPackageFixture(t);
  const plugin = await importPlugin(root);
  assert.strictEqual(plugin.default, plugin.MyExtPlugin);
  const hooks = plugin.createHooks({ packageRoot: root, localEntry: false });
  assert.deepEqual(Object.keys(hooks), ["config"]);
  assert.equal("message" in hooks, false);
  assert.equal("messages.transform" in hooks, false);
  assert.equal("session" in hooks, false);
  assert.deepEqual(Object.keys(await plugin.MyExtPlugin()), ["config"]);
});

test("package fixture is a real copied ESM package and is cleaned after the test", async (t) => {
  let root;
  await t.test("fixture contents", async (t) => {
    root = await createPackageFixture(t);
    assert.equal((await readFile(path.join(root, "package.json"), "utf8")).trim(), '{"type":"module"}');
    assert.deepEqual(await readdir(path.join(root, "skills")), []);
    await access(path.join(root, ".opencode", "plugins", "my-ext.js"));
    await access(path.join(root, ".opencode", "bootstrap.md"));
    for (const copiedPath of [
      path.join(root, ".opencode", "plugins", "my-ext.js"),
      path.join(root, ".opencode", "agents", "my-ext-db-ops.md"),
      path.join(root, ".opencode", "bootstrap.md"),
    ]) {
      assert.equal((await lstat(copiedPath)).isSymbolicLink(), false);
    }
  });
  await assert.rejects(access(root), { code: "ENOENT" });
});
