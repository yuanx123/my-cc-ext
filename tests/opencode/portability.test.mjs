import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { findViolations } from "../../scripts/opencode/portability-lint.mjs";

async function temporaryRoot(t) {
  const root = await mkdtemp(path.join(tmpdir(), "my-ext-portability-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function writeEmptyAllowlist(root) {
  await mkdir(path.join(root, "scripts", "opencode"), { recursive: true });
  await writeFile(path.join(root, "scripts", "opencode", "portability-allowlist.json"), '{"entries":[]}\n');
}

test("repository shared skills pass portability lint", async () => {
  assert.deepEqual(await findViolations(path.resolve(import.meta.dirname, "../..")), []);
});

test("lint rejects direct platform tool instructions", async (t) => {
  const root = await temporaryRoot(t);
  await mkdir(path.join(root, "skills", "demo"), { recursive: true });
  await writeFile(path.join(root, "skills", "demo", "SKILL.md"), "---\nname: demo\n---\n使用 Glob 搜索文件。\n");
  await writeEmptyAllowlist(root);

  const violations = await findViolations(root);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "direct-tool-name");
});

test("lint catches stale paths and invalid skill names in installed OpenCode agents", async (t) => {
  const root = await temporaryRoot(t);
  await mkdir(path.join(root, "skills"));
  await mkdir(path.join(root, ".opencode", "agents"), { recursive: true });
  await writeEmptyAllowlist(root);
  await writeFile(path.join(root, ".opencode", "agents", "review.md"), "KB: C:/legacy/rules\nUse ~/.claude/CLAUDE.md\nUse `my-ext-fix` skill\n");
  const violations = await findViolations(root);
  assert.deepEqual(violations.map(({ line, rule }) => ({ line, rule })), [
    { line: 1, rule: "external-absolute-path" },
    { line: 2, rule: "foreign-platform-reference" },
    { line: 3, rule: "foreign-platform-reference" },
  ]);
});

test("an exact documented allowlist entry permits one line", async (t) => {
  const root = await temporaryRoot(t);
  await mkdir(path.join(root, "skills", "demo"), { recursive: true });
  await mkdir(path.join(root, "scripts", "opencode"), { recursive: true });
  const lineText = "使用 Glob 搜索文件。";
  await writeFile(path.join(root, "skills", "demo", "SKILL.md"), `---\nname: demo\n---\n${lineText}\n`);
  await writeFile(
    path.join(root, "scripts", "opencode", "portability-allowlist.json"),
    `${JSON.stringify({ entries: [{ file: "skills/demo/SKILL.md", rule: "direct-tool-name", lineText, reason: "Compatibility fixture" }] }, null, 2)}\n`,
  );

  assert.deepEqual(await findViolations(root), []);
});

test("markdown traversal uses locale-independent code unit ordering", async (t) => {
  const root = await temporaryRoot(t);
  await mkdir(path.join(root, "skills"), { recursive: true });
  await writeFile(path.join(root, "skills", "Z.md"), "使用 Glob 搜索文件。\n");
  await writeFile(path.join(root, "skills", "a.md"), "使用 Glob 搜索文件。\n");
  await writeEmptyAllowlist(root);

  const violations = await findViolations(root);
  assert.deepEqual(violations.map((item) => item.file), ["skills/Z.md", "skills/a.md"]);
});

test("lint rejects external absolute paths in Markdown link targets", async (t) => {
  const root = await temporaryRoot(t);
  await mkdir(path.join(root, "skills", "demo"), { recursive: true });
  await writeFile(path.join(root, "skills", "demo", "SKILL.md"), "参见 [rules](/Users/foo/rules.md)。\n");
  await writeEmptyAllowlist(root);

  const violations = await findViolations(root);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "external-absolute-path");
});

test("missing allowlist errors identify the path and preserve the cause", async (t) => {
  const root = await temporaryRoot(t);

  await assert.rejects(findViolations(root), (error) => {
    assert.match(error.message, /portability-allowlist\.json/);
    assert.equal(error.cause?.code, "ENOENT");
    return true;
  });
});

test("invalid allowlist JSON identifies the path and preserves the cause", async (t) => {
  const root = await temporaryRoot(t);
  await mkdir(path.join(root, "scripts", "opencode"), { recursive: true });
  await writeFile(path.join(root, "scripts", "opencode", "portability-allowlist.json"), "not JSON\n");

  await assert.rejects(findViolations(root), (error) => {
    assert.match(error.message, /portability-allowlist\.json/);
    assert.ok(error.cause instanceof SyntaxError);
    return true;
  });
});
