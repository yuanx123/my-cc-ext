import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [suite, ...extra] = process.argv.slice(2);
if (!["codex", "opencode"].includes(suite) || extra.length) {
  throw new Error("usage: node scripts/run-tests.mjs codex | opencode");
}
const directory = path.join(root, "tests", suite);
const files = (await readdir(directory)).filter((name) => name.endsWith(".test.mjs")).sort();
if (!files.length) throw new Error(`no tests found for ${suite}`);
// Node's glob support differs across the supported versions and Windows shells.
const result = spawnSync(process.execPath, ["--test", ...files.map((name) => path.join(directory, name))], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
