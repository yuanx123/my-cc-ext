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
    source: "git-subdir", url: "https://github.com/yuanx123/my-cc-ext.git",
    ref: "codex-dist", path: "./plugins/my-ext",
  });
  assert.equal(catalog.plugins[0].policy.installation, "AVAILABLE");
});

test("release gates publishing on validation and never force pushes", async () => {
  const workflow = await read(".github/workflows/codex-release.yml");
  for (const command of ["npm test", "npm run stage:codex", "needs: build", "HEAD:refs/heads/codex-dist"]) {
    assert.ok(workflow.includes(command), command);
  }
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /--force|persist-credentials: false/);
  assert.match(workflow, /github\.event\.repository\.default_branch/);
  assert.match(workflow, /needs: \[build, opencode-contract\]/);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/opencode-contract\.yml/);
});

test("release gate keeps every validation step inside npm test", async () => {
  const pkg = JSON.parse(await read("package.json"));
  for (const step of ["lint:portability", "check:agents", "version:check", "test:codex", "test:opencode", "test:python"]) {
    assert.ok(pkg.scripts.test.includes(`npm run ${step}`), `npm test 缺少门禁步骤: ${step}`);
  }
});
