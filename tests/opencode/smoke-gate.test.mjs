import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { assertConfigContract, runSmoke } from "../../scripts/opencode/smoke-test.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const script = path.join(root, "scripts", "opencode", "smoke-test.mjs");
const immutableSpec = "my-ext@git+https://github.com/yuanx123/my-cc-ext.git#v1.1.0";
const agentNames = [
  "my-ext-code-review",
  "my-ext-db-ops",
  "my-ext-feature-dev",
  "my-ext-fix",
  "my-ext-opencode-ext-dev",
  "my-ext-superpowers-planner",
];

function createValidConfig() {
  const taskAllow = {
    "my-ext-feature-dev": ["my-ext-superpowers-planner", "my-ext-code-review"],
    "my-ext-superpowers-planner": ["my-ext-feature-dev"],
  };
  return {
    skills: { paths: ["/installed/my-ext/skills"] },
    instructions: ["/installed/my-ext/.opencode/bootstrap.md"],
    agent: Object.fromEntries(agentNames.map((name) => [name, {
      mode: "subagent",
      permission: {
        read: "allow",
        glob: "allow",
        grep: "allow",
        skill: "allow",
        edit: name === "my-ext-code-review" ? "deny" : "ask",
        bash: name === "my-ext-code-review" ? {
          "*": "deny",
          "git status --short": "allow",
          "git diff --no-ext-diff --no-textconv": "allow",
          "git diff --cached --no-ext-diff --no-textconv": "allow",
          "git log -5 --oneline": "allow",
        } : {
          "*": "ask",
          "git status*": "allow",
          "git diff*": "allow",
          "git log*": "allow",
          "git show*": "allow",
          "git rev-parse*": "allow",
        },
        external_directory: "ask",
        task: Object.fromEntries([["*", "deny"], ...(taskAllow[name] ?? []).map((task) => [task, "allow"])]),
      },
    }])),
  };
}

function runCli(env) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env,
  });
}

function isolatedEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.MY_EXT_RUN_OPENCODE_SMOKE;
  delete env.MY_EXT_GIT_SPEC;
  delete env.OPENCODE_BIN;
  return { ...env, ...overrides };
}

test("real smoke skips with exit zero only when the explicit gate is disabled", () => {
  for (const gate of [undefined, "0", "true"]) {
    const env = isolatedEnv();
    if (gate !== undefined) env.MY_EXT_RUN_OPENCODE_SMOKE = gate;
    const result = runCli(env);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^SKIP: set MY_EXT_RUN_OPENCODE_SMOKE=1/);
  }
});

test("smoke rejects a missing reviewer or reviewer write and shell grants", () => {
  for (const mutate of [
    (config) => { delete config.agent["my-ext-code-review"]; },
    (config) => { config.agent["my-ext-code-review"].permission.edit = "ask"; },
    (config) => { config.agent["my-ext-code-review"].permission.bash["*"] = "ask"; },
  ]) {
    const config = createValidConfig();
    mutate(config);
    assert.throws(() => assertConfigContract(config), /my-ext-code-review/);
  }
});

test("actual plugin registration satisfies the installation contract", async () => {
  const { createHooks } = await import("../../.opencode/plugins/my-ext.js");
  const config = {};
  await createHooks({ localEntry: false }).config(config);
  assert.doesNotThrow(() => assertConfigContract(config));
});

test("enabled smoke rejects mutable and lookalike Git specs before invoking OpenCode", () => {
  const invalid = [
    "my-ext@git+https://github.com/yuanx123/my-cc-ext.git",
    "my-ext@git+https://github.com/yuanx123/my-cc-ext.git#main",
    "my-ext@git+https://github.com/yuanx123/my-cc-ext.git#v1.1",
    "my-ext@git+https://github.com.example.test/yuanx123/my-cc-ext.git#v1.1.0",
    "other@git+https://github.com/yuanx123/my-cc-ext.git#v1.1.0",
  ];

  for (const spec of invalid) {
    const result = runCli(isolatedEnv({ MY_EXT_RUN_OPENCODE_SMOKE: "1", MY_EXT_GIT_SPEC: spec }));
    assert.notEqual(result.status, 0, spec);
    assert.match(result.stderr, /exact my-ext GitHub .*immutable/i);
  }
});

test("enabled smoke cleans its temporary project after a successful injected run", async (t) => {
  const parent = await mkdtemp(path.join(tmpdir(), "my-ext-smoke-test-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  let project;
  const config = createValidConfig();

  await runSmoke({
    env: { MY_EXT_RUN_OPENCODE_SMOKE: "1", MY_EXT_GIT_SPEC: immutableSpec },
    tempRoot: parent,
    makeTemp: async (prefix) => {
      project = await mkdtemp(prefix);
      return project;
    },
    spawn: () => ({ status: 0, stdout: `OpenCode log\n${JSON.stringify(config)}\nfinished\n`, stderr: "" }),
    log() {},
  });

  await assert.rejects(access(project), { code: "ENOENT" });
});

test("resolved agents require the exact granular read-only Git bash baseline", () => {
  const cases = [
    ["missing git permission", (permission) => { delete permission.bash["git status*"]; }],
    ["wrong git permission", (permission) => { permission.bash["git diff*"] = "ask"; }],
    ["unexpected wildcard grant", (permission) => { permission.bash["git *"] = "allow"; }],
  ];

  for (const [label, mutate] of cases) {
    const config = createValidConfig();
    mutate(config.agent["my-ext-db-ops"].permission);
    assert.throws(() => assertConfigContract(config), /my-ext-db-ops.*bash permission baseline/, label);
  }
});

test("resolved agents require exact per-agent task permissions", () => {
  const cases = [
    ["task wildcard is not deny", (task) => { task["*"] = "allow"; }, "my-ext-db-ops"],
    ["feature-dev missing planner", (task) => { delete task["my-ext-superpowers-planner"]; }, "my-ext-feature-dev"],
    ["planner allows wrong agent", (task) => { task["my-ext-db-ops"] = "allow"; }, "my-ext-superpowers-planner"],
    ["non-delegating agent has extra allow", (task) => { task["my-ext-fix"] = "allow"; }, "my-ext-db-ops"],
  ];

  for (const [label, mutate, name] of cases) {
    const config = createValidConfig();
    mutate(config.agent[name].permission.task);
    assert.throws(() => assertConfigContract(config), new RegExp(`${name}.*task permission baseline`), label);
  }
});

test("enabled smoke reports binary-not-found and still cleans its temporary project", async (t) => {
  const parent = await mkdtemp(path.join(tmpdir(), "my-ext-smoke-test-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  let project;

  await assert.rejects(() => runSmoke({
    env: { MY_EXT_RUN_OPENCODE_SMOKE: "1", MY_EXT_GIT_SPEC: immutableSpec, OPENCODE_BIN: "missing-opencode" },
    tempRoot: parent,
    makeTemp: async (prefix) => {
      project = await mkdtemp(prefix);
      return project;
    },
    spawn: () => ({ status: null, stdout: "", stderr: "", error: Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" }) }),
  }), /OpenCode binary not found/);

  await assert.rejects(access(project), { code: "ENOENT" });
});

test("unexpected spawn failures expose only a sanitized error code", async (t) => {
  const parent = await mkdtemp(path.join(tmpdir(), "my-ext-smoke-test-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const secret = "do-not-print-this-value";

  await assert.rejects(() => runSmoke({
    env: {
      MY_EXT_RUN_OPENCODE_SMOKE: "1",
      MY_EXT_GIT_SPEC: immutableSpec,
      OPENCODE_BIN: "opencode-test-bin",
      PRIVATE_VALUE: secret,
    },
    tempRoot: parent,
    spawn: () => ({
      status: null,
      stdout: `stdout ${secret}`,
      stderr: `stderr ${secret}`,
      error: Object.assign(new Error(`spawn failed ${secret}`), { code: "EACCES" }),
    }),
  }), (error) => {
    assert.equal(error.message, "OpenCode debug config could not be started (EACCES)");
    assert.doesNotMatch(error.message, new RegExp(secret));
    return true;
  });
});
