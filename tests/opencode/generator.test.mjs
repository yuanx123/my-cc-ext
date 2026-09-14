import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { AGENT_MAPPINGS, PERMISSION_BASELINE, generateAgent, generateAll } from "../../scripts/opencode/generate-agents.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("generated agents exactly match their Claude sources", async () => {
  const generated = await generateAll(root);
  assert.deepEqual(generated.map((item) => item.mapping.name).sort(), [
    "my-ext-code-review", "my-ext-db-ops", "my-ext-feature-dev", "my-ext-fix", "my-ext-superpowers-planner",
  ]);
  for (const item of generated) {
    assert.equal(await readFile(path.join(root, item.mapping.output), "utf8"), item.content);
  }
});

test("generated files carry source marker and digest", async () => {
  for (const item of await generateAll(root)) {
    assert.match(item.content, new RegExp(`generated-from: ${item.mapping.source.replaceAll("/", "\\/")}`));
    assert.match(item.content, /source-sha256: [0-9a-f]{64}/);
    assert.doesNotMatch(item.content, /^model:/m);
  }
});

test("declarative mappings and permission baseline are closed", () => {
  assert.deepEqual(AGENT_MAPPINGS.map((item) => item.name), [
    "my-ext-db-ops",
    "my-ext-feature-dev",
    "my-ext-fix",
    "my-ext-superpowers-planner",
    "my-ext-code-review",
  ]);
  assert.deepEqual(PERMISSION_BASELINE, {
    read: "allow", glob: "allow", grep: "allow", skill: "allow", edit: "ask",
    bash: { "*": "ask", "git status*": "allow", "git diff*": "allow", "git log*": "allow", "git show*": "allow", "git rev-parse*": "allow" },
    external_directory: "deny",
  });
});

test("cross-agent prose uses mapped names while state filenames stay unchanged", async () => {
  const generated = Object.fromEntries((await generateAll(root)).map((item) => [item.mapping.name, item.content]));
  const featureDev = generated["my-ext-feature-dev"];
  const planner = generated["my-ext-superpowers-planner"];

  assert.doesNotMatch(featureDev, /`superpowers-planner`|由 superpowers-planner 产出/);
  assert.match(featureDev, /`my-ext-superpowers-planner`/);
  assert.match(featureDev, /由 my-ext-superpowers-planner 产出/);
  assert.match(featureDev, /\.feature-dev-state\.md/);
  assert.doesNotMatch(featureDev, /\.my-ext-feature-dev-state\.md/);

  assert.doesNotMatch(planner, /`feature-dev`(?: Agent)?|交给 feature-dev/);
  assert.match(planner, /`my-ext-feature-dev` subagent/);
  assert.match(planner, /`my-ext-feature-dev`/);
  assert.match(planner, /交给 my-ext-feature-dev/);
  assert.match(planner, /\.superpowers-planner-state\.md/);
  assert.doesNotMatch(planner, /\.my-ext-superpowers-planner-state\.md/);
});

test("exact prose replacements do not leave a search whitespace artifact", async () => {
  const fix = (await generateAll(root)).find((item) => item.mapping.name === "my-ext-fix").content;
  assert.match(fix, /逐层搜索涉及的类和方法/);
  assert.doesNotMatch(fix, /逐层\s+搜索/);
});

test("generated bodies contain no trailing whitespace", async () => {
  for (const item of await generateAll(root)) {
    assert.doesNotMatch(item.content, /[ \t]+$/m, item.mapping.output);
  }
});

test("generated review resolves shared skills and platform-neutral knowledge-base instructions", async () => {
  const review = (await generateAll(root)).find((item) => item.mapping.name === "my-ext-code-review").content;
  assert.doesNotMatch(review, /~\/\.claude|`my-ext-fix` skill|my-ext:kb-loader/);
  assert.match(review, /`fix` skill/);
  const permission = JSON.parse(review.match(/^permission: (.+)$/m)[1]);
  assert.equal(permission.edit, "deny");
  assert.equal(permission.bash["*"], "deny");
  assert.equal(permission.bash["git diff --no-ext-diff --no-textconv"], "allow");
  assert.equal(permission.external_directory, "deny");
  assert.deepEqual(permission.task, { "*": "deny" });
});

test("description is a JSON-quoted YAML scalar and rejects multiline syntax", () => {
  const mapping = { source: "agents/example/AGENT.md", name: "my-ext-example", taskAllow: [], replacements: [] };
  const description = 'Review: "quoted" # hash \\ path';
  const generated = generateAgent(`---\nname: example\ndescription: ${description}\n---\nBody\n`, mapping);
  const serialized = generated.match(/^description:\s*(.+)$/m)?.[1];

  assert.equal(JSON.parse(serialized), description);
  assert.throws(
    () => generateAgent("---\nname: example\ndescription: |\n  multiline\n---\nBody\n", mapping),
    /single-line description/,
  );
  assert.throws(
    () => generateAgent("---\nname: example\ndescription: first line\n  continued line\n---\nBody\n", mapping),
    /single-line description/,
  );
  assert.throws(
    () => generateAgent("---\nname: example\ndescription:   \n---\nBody\n", mapping),
    /single-line description/,
  );
});

test("write mode atomically replaces output and cleans temporary files on failure", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "my-ext-agent-write-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, "agent.md");
  await writeFile(output, "old\n", "utf8");
  const { writeFileAtomically } = await import("../../scripts/opencode/generate-agents.mjs");

  await writeFileAtomically(output, "new\n");
  assert.equal(await readFile(output, "utf8"), "new\n");
  assert.deepEqual(await readdir(directory), ["agent.md"]);

  await assert.rejects(
    writeFileAtomically(output, "broken\n", { rename: async () => { throw new Error("rename failed"); } }),
    /rename failed/,
  );
  assert.equal(await readFile(output, "utf8"), "new\n");
  assert.deepEqual(await readdir(directory), ["agent.md"]);
});
