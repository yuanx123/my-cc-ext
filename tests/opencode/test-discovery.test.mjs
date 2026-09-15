import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SUITES, discoverTestFiles } from "../../scripts/test-discovery.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("discovery returns every suite test file as ordered absolute spawn arguments", async () => {
  for (const suite of SUITES) {
    const files = await discoverTestFiles(root, suite);
    const expected = (await readdir(path.join(root, "tests", suite)))
      .filter((name) => name.endsWith(".test.mjs"))
      .sort()
      .map((name) => path.join(root, "tests", suite, name));

    assert.deepEqual(files, expected, suite);
    assert.ok(files.length > 0, `${suite} 不应为空`);
    assert.ok(files.every((file) => path.isAbsolute(file)), `${suite} 应给出绝对路径`);
    assert.deepEqual([...files].sort(), files, `${suite} 应有序，保证 spawn 参数稳定`);
  }
});

test("discovery rejects unknown suites readably instead of spawning nothing", async () => {
  await assert.rejects(() => discoverTestFiles(root, "nope"), /unknown suite: nope/);
});

test("run-tests entry spawns the discovered list rather than a shell glob", async () => {
  const source = await readFile(path.join(root, "scripts", "run-tests.mjs"), "utf8");
  assert.match(
    source,
    /spawnSync\(\s*process\.execPath\s*,\s*\[\s*"--test"\s*,\s*\.\.\./,
    "run-tests.mjs 必须把 discoverTestFiles 的结果展开给 --test，不能依赖 shell 展开 glob",
  );
});
