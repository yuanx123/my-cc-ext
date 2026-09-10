import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file, base = root) => readFile(path.join(base, file), "utf8");
const json = async (file, base = root) => JSON.parse(await read(file, base));
const agentNames = ["cc-ext-dev", "code-review", "db-ops", "feature-dev", "fix", "superpowers-planner"];

test("Codex manifest discovers shared skills and keeps the existing plugin identity", async () => {
  const manifest = await json(".codex-plugin/plugin.json");
  const pkg = await json("package.json");
  assert.equal(manifest.name, pkg.name);
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.skills, "./skills/");
  assert.ok(manifest.interface.displayName);
  assert.equal(manifest.model, undefined);
  assert.equal(manifest.agents, undefined);
  const marketplace = await json(".claude-plugin/marketplace.json");
  assert.equal(marketplace.plugins.find((entry) => entry.name === manifest.name).source, ".");
  const codexMarketplace = await json("codex/marketplace.json");
  assert.equal(codexMarketplace.name, "my-cc-ext-local");
  assert.deepEqual(codexMarketplace.plugins.map((entry) => entry.name), [manifest.name]);
  assert.deepEqual(codexMarketplace.plugins[0].source, { source: "local", path: "./plugins/my-ext" });
  assert.deepEqual(codexMarketplace.plugins[0].policy, { installation: "AVAILABLE", authentication: "ON_INSTALL" });
});

test("every canonical Agent has a thin discoverable entry with resolvable package-relative links", async () => {
  const entries = await readdir(path.join(root, "agents"), { withFileTypes: true });
  assert.deepEqual(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(), agentNames);
  for (const name of agentNames) {
    await assert.rejects(read(`skills/${name}-agent/SKILL.md`), { code: "ENOENT" });
    const skillFile = `codex/skills/${name}-agent/SKILL.md`;
    const source = await read(skillFile);
    assert.match(source, new RegExp(`^name: ${name}-agent$`, "m"));
    assert.match(source, /^description: .*Codex/m);
    const links = [...source.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
    assert.deepEqual(links, ["../../agent-adapter.md", `../../../agents/${name}/AGENT.md`]);
    for (const link of links) {
      const resolved = path.resolve(root, path.dirname(skillFile), link);
      assert.ok(!path.relative(root, resolved).startsWith(".."));
      assert.ok((await readFile(resolved, "utf8")).trim());
    }
    const body = (await read(`agents/${name}/AGENT.md`)).split(/^---\r?$/m).slice(2).join("---");
    for (const line of body.split(/\r?\n/).filter((line) => line.length >= 60)) {
      assert.ok(!source.includes(line), `${skillFile} duplicates its Agent body`);
    }
  }
});

test("Codex adapter preserves safety, routing and target-workspace semantics", async () => {
  const source = await read("codex/agent-adapter.md");
  for (const term of ["AGENTS.md", "permissionMode", "只读", "阶段", "内联", "递归", "工作目录", "my-ext:kb-loader"]) {
    assert.ok(source.includes(term), `missing adapter rule: ${term}`);
  }
  assert.doesNotMatch(source, /claude-opus|gpt-\d/);
});

test("knowledge-base discovery works without a Claude installation", async () => {
  const source = await read("skills/kb-loader/SKILL.md");
  assert.match(source, /AGENTS\.md/);
  assert.match(source, /当前平台/);
  assert.doesNotMatch(source, /~\/\.claude\/CLAUDE\.md/);
});

test("npm package contains the complete Codex resource closure", async () => {
  const result = spawnSync("npm", ["pack", "--json", "--dry-run", "--ignore-scripts"], {
    cwd: root, encoding: "utf8", shell: process.platform === "win32", timeout: 120000,
  });
  assert.equal(result.status, 0, result.stderr);
  const files = new Set(JSON.parse(result.stdout)[0].files.map((file) => file.path.replaceAll("\\", "/")));
  for (const file of [
    ".codex-plugin/plugin.json", "codex/agent-adapter.md", "docs/README.codex.md",
    "skills/design-doc-writer/templates/spec-skeleton.md",
    "skills/design-doc-writer/templates/plan-skeleton.md",
    ...agentNames.map((name) => `agents/${name}/AGENT.md`),
  ]) {
    assert.ok(files.has(file), `npm package is missing ${file}`);
  }
  for (const entry of await readdir(path.join(root, "skills"), { withFileTypes: true })) {
    if (entry.isDirectory()) assert.ok(files.has(`skills/${entry.name}/SKILL.md`), entry.name);
  }
  for (const name of agentNames) assert.ok(!files.has(`skills/${name}-agent/SKILL.md`));
});

test("version checker rejects Codex drift and write mode repairs it without touching other targets", async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), "my-ext-codex-version-"));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  for (const file of ["package.json", "readme.md", ".claude-plugin", ".codex-plugin", ".opencode", "docs", "scripts"]) {
    await cp(path.join(root, file), path.join(fixture, file), { recursive: true });
  }
  const protectedFiles = ["package.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", "readme.md", ".opencode/INSTALL.md", "docs/README.opencode.md"];
  const before = new Map(await Promise.all(protectedFiles.map(async (file) => [file, await read(file, fixture)])));
  const manifest = await json(".codex-plugin/plugin.json", fixture);
  manifest.version = "9.9.9";
  await writeFile(path.join(fixture, ".codex-plugin/plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const run = (mode) => spawnSync(process.execPath, ["scripts/opencode/sync-version.mjs", mode], { cwd: fixture, encoding: "utf8" });
  const check = run("--check");
  assert.equal(check.status, 1);
  assert.match(check.stderr, /\.codex-plugin\/plugin\.json has 9\.9\.9/);
  const sync = run("--write");
  assert.equal(sync.status, 0, sync.stderr);
  assert.equal((await json(".codex-plugin/plugin.json", fixture)).version, (await json("package.json")).version);
  for (const file of protectedFiles) assert.equal(await read(file, fixture), before.get(file), file);
});

test("local marketplace staging installs from a subdirectory and refuses to overwrite output", async (t) => {
  const temporary = await mkdtemp(path.join(tmpdir(), "my-ext-codex-stage-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const output = path.join(temporary, "marketplace with spaces");
  const run = (destination) => spawnSync(process.execPath, ["scripts/codex/stage-marketplace.mjs", destination], { cwd: root, encoding: "utf8", timeout: 120000 });
  const staged = run(output);
  assert.equal(staged.status, 0, staged.stderr);
  const catalog = await json(".agents/plugins/marketplace.json", output);
  assert.equal(catalog.name, "my-cc-ext-local");
  assert.deepEqual(catalog.plugins[0].source, { source: "local", path: "./plugins/my-ext" });
  const plugin = path.join(output, "plugins/my-ext");
  assert.equal(await read(".codex-plugin/plugin.json", plugin), await read(".codex-plugin/plugin.json"));
  for (const name of agentNames) {
    assert.equal(await read(`agents/${name}/AGENT.md`, plugin), await read(`agents/${name}/AGENT.md`));
    const installed = await read(`skills/${name}-agent/SKILL.md`, plugin);
    const source = await read(`codex/skills/${name}-agent/SKILL.md`);
    assert.equal(installed, source.replace("../../agent-adapter.md", "../../codex/agent-adapter.md").replace(`../../../agents/${name}/AGENT.md`, `../../agents/${name}/AGENT.md`));
    for (const match of installed.matchAll(/\]\(([^)]+)\)/g)) {
      assert.ok((await readFile(path.resolve(plugin, "skills", `${name}-agent`, match[1]), "utf8")).trim());
    }
  }
  for (const entry of await readdir(path.join(root, "skills"), { withFileTypes: true })) {
    if (entry.isDirectory()) assert.equal(await read(`skills/${entry.name}/SKILL.md`, plugin), await read(`skills/${entry.name}/SKILL.md`));
  }
  await assert.rejects(read("tests/codex/plugin.test.mjs", plugin), { code: "ENOENT" });
  const original = await read(".agents/plugins/marketplace.json", output);
  const repeated = run(output);
  assert.notEqual(repeated.status, 0);
  assert.match(repeated.stderr, /already exists/);
  assert.equal(await read(".agents/plugins/marketplace.json", output), original);
  const inRepository = run(path.join(root, "codex", "staged"));
  assert.notEqual(inRepository.status, 0);
  assert.match(inRepository.stderr, /outside the source repository/);
});
