import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const skillsRoot = path.join(root, "skills");
const claudeAgentsRoot = path.join(root, "agents");

async function directories(parent) {
  return (await readdir(parent, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function readSkill(name) {
  return readFile(path.join(skillsRoot, name, "SKILL.md"), "utf8");
}

test("root skills remain the single shared source", async () => {
  const names = await directories(skillsRoot);
  assert.deepEqual(names, [
    "add-javadoc",
    "build-fix",
    "code-reviewer",
    "design-doc-writer",
    "fix",
    "gen-java-entity",
    "gen-java-enum",
    "gen-pgsql-ddl",
    "implement-from-design",
    "kb-loader",
    "tdd",
    "write-a-skill",
  ]);

  for (const name of names) {
    const source = await readSkill(name);
    assert.match(source, new RegExp(`^---\\r?\\nname: ${name}\\r?$`, "m"));
  }
});

test("Claude Code agent names remain unchanged", async () => {
  assert.deepEqual(await directories(claudeAgentsRoot), [
    "cc-ext-dev",
    "code-review",
    "db-ops",
    "feature-dev",
    "fix",
    "superpowers-planner",
  ]);
});

test("shared skills contain no repository-external path or Claude-only invocation", async () => {
  const sources = await Promise.all((await directories(skillsRoot)).map(readSkill));
  const joined = sources.join("\n");

  assert.doesNotMatch(joined, /E:\\vibe_coding\\doc\\common\\java\\java-code-style\.md/i);
  assert.doesNotMatch(joined, /python \.claude\/skills\//);
  assert.doesNotMatch(joined, /\.claude\/plan\//);
  assert.doesNotMatch(joined, /AskUserQuestion/);
  assert.doesNotMatch(joined, /Skill\(skill:/);
  assert.doesNotMatch(joined, /通过 Agent 工具/);
});

test("shared skills prefer AGENTS.md and public rules stay platform neutral", async () => {
  for (const name of ["implement-from-design", "gen-java-entity", "code-reviewer"]) {
    assert.match(await readSkill(name), /AGENTS\.md/);
  }

  const publicRules = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.doesNotMatch(publicRules, /claude plugins|opencode\.json|AskUserQuestion|permissionMode/);
});
