import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const agentsRoot = path.join(root, ".opencode", "agents");
const baseline = ["my-ext-db-ops.md", "my-ext-feature-dev.md", "my-ext-fix.md", "my-ext-opencode-ext-dev.md", "my-ext-superpowers-planner.md"];
const readOnly = ["my-ext-code-review.md"];
const expected = [...baseline, ...readOnly].sort();

function scalar(source, name) {
  return source.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1].trim();
}

test("package has exactly six OpenCode subagents with permission baseline", async () => {
  assert.deepEqual((await readdir(agentsRoot)).filter((name) => name.endsWith(".md")).sort(), expected);
  for (const file of baseline) {
    const source = await readFile(path.join(agentsRoot, file), "utf8");
    assert.equal(scalar(source, "name"), file.slice(0, -3));
    assert.equal(scalar(source, "mode"), "subagent");
    assert.doesNotMatch(source, /^model:/m);
    const permission = JSON.parse(scalar(source, "permission"));
    assert.equal(permission.read, "allow");
    assert.equal(permission.glob, "allow");
    assert.equal(permission.grep, "allow");
    assert.equal(permission.skill, "allow");
    assert.equal(permission.edit, "ask");
    assert.equal(permission.bash["*"], "ask");
    assert.equal(permission.external_directory, "deny");
    assert.equal(permission.task["*"], "deny");
    assert.ok(Object.keys(permission.task).filter((name) => name !== "*").every((name) => /^my-ext-/.test(name)));
  }
  for (const file of readOnly) {
    const source = await readFile(path.join(agentsRoot, file), "utf8");
    assert.equal(scalar(source, "name"), file.slice(0, -3));
    assert.equal(scalar(source, "mode"), "subagent");
    assert.doesNotMatch(source, /^model:/m);
    const permission = JSON.parse(scalar(source, "permission"));
    assert.equal(permission.read, "allow");
    assert.equal(permission.glob, "allow");
    assert.equal(permission.grep, "allow");
    assert.equal(permission.skill, "allow");
    assert.equal(permission.edit, "deny");
    assert.equal(permission.bash["*"], "deny");
    assert.equal(permission.external_directory, "deny");
    assert.equal(permission.task["*"], "deny");
    assert.ok(Object.keys(permission.task).filter((name) => name !== "*").every((name) => /^my-ext-/.test(name)));
  }
});

test("only the extension agent is independently maintained", async () => {
  for (const file of expected.filter((name) => name !== "my-ext-opencode-ext-dev.md")) {
    assert.match(await readFile(path.join(agentsRoot, file), "utf8"), /generated-from: agents\//);
  }
  const extension = await readFile(path.join(agentsRoot, "my-ext-opencode-ext-dev.md"), "utf8");
  assert.doesNotMatch(extension, /generated-from:/);
  assert.match(extension, /config\.instructions/);
  assert.doesNotMatch(extension, /messages\.transform|消息转换/);
});

test("bootstrap is an instructions file without lifecycle hooks", async () => {
  const source = await readFile(path.join(root, ".opencode", "bootstrap.md"), "utf8");

  assert.match(source, /config\.instructions/);
  assert.match(source, /not auto-discovered/i);
  assert.doesNotMatch(source, /SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|messages\.transform/);
});
