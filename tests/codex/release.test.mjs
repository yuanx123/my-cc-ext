import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("Git marketplace resolves the assembled plugin from the distribution branch", async () => {
  const catalog = JSON.parse(await read(".agents/plugins/marketplace.json"));
  assert.equal(catalog.name, "my-cc-ext");
  assert.deepEqual(catalog.plugins.map((plugin) => plugin.name), ["my-ext"]);
  assert.deepEqual(catalog.plugins[0].source, {
    source: "git-subdir", url: "https://github.com/huhuhu-999/my-cc-ext.git",
    ref: "codex-dist", path: "./plugins/my-ext",
  });
  assert.equal(catalog.plugins[0].policy.installation, "AVAILABLE");
});

test("release gates publishing on validation and never force pushes", async () => {
  const workflow = await read(".github/workflows/codex-release.yml");
  for (const command of ["npm run test:codex", "npm run lint:portability", "npm run version:check", "npm run stage:codex", "needs: build", "HEAD:refs/heads/codex-dist"]) {
    assert.ok(workflow.includes(command), command);
  }
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /--force|persist-credentials: false/);
  assert.match(workflow, /github\.event\.repository\.default_branch/);
});
