import { readdir } from "node:fs/promises";
import path from "node:path";

export const SUITES = ["codex", "opencode"];

/**
 * 发现某个测试套件下全部用例文件，返回可直接作为 spawn 参数的有序绝对路径。
 * 抽成纯函数是为了让 scripts/run-tests.mjs 的入口逻辑可被测试覆盖。
 */
export async function discoverTestFiles(root, suite) {
  if (!SUITES.includes(suite)) {
    throw new Error(`unknown suite: ${suite} (expected ${SUITES.join(" | ")})`);
  }
  const directory = path.join(root, "tests", suite);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".test.mjs")).sort();
  if (!files.length) {
    throw new Error(`no tests found for ${suite}`);
  }
  return files.map((name) => path.join(directory, name));
}
