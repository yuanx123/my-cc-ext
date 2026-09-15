import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { SUITES, discoverTestFiles } from "./test-discovery.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [suite, ...extra] = process.argv.slice(2);
if (extra.length || !SUITES.includes(suite)) {
  throw new Error("usage: node scripts/run-tests.mjs codex | opencode");
}
// Node's glob support differs across the supported versions and Windows shells.
const result = spawnSync(process.execPath, ["--test", ...(await discoverTestFiles(root, suite))], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
