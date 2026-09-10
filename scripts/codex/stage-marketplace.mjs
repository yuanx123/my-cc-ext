import { spawnSync } from "node:child_process";
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."));

function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) throw new Error("usage: node scripts/codex/stage-marketplace.mjs <new-directory-outside-repository>");
  const requested = path.resolve(args[0]);
  const output = path.join(await realpath(path.dirname(requested)), path.basename(requested));
  if (within(root, output) || within(output, root)) throw new Error("output must be outside the source repository and cannot contain it");
  const existing = await lstat(output).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
  if (existing) throw new Error(`output already exists: ${output}; choose a new directory`);

  const packed = spawnSync("npm", ["pack", "--json", "--dry-run", "--ignore-scripts"], {
    cwd: root, encoding: "utf8", shell: process.platform === "win32", timeout: 120000,
  });
  if (packed.status !== 0) throw new Error(`npm pack failed: ${packed.stderr || packed.error?.message || packed.status}`);
  const files = JSON.parse(packed.stdout)[0].files;
  const catalog = JSON.parse(await readFile(path.join(root, "codex/marketplace.json"), "utf8"));
  const adapterRoot = path.join(root, "codex/skills");
  const adapters = (await readdir(adapterRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());

  // Claim a fresh output directory before copying; never overwrite an existing marketplace.
  await mkdir(output);
  try {
    const pluginRoot = path.join(output, "plugins/my-ext");
    for (const file of files) {
      const source = await realpath(path.resolve(root, file.path));
      const destination = path.resolve(pluginRoot, file.path);
      if (!within(root, source) || !within(pluginRoot, destination)) throw new Error(`package path escapes its root: ${file.path}`);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
    // Only the Codex installation artifact merges platform entries into shared skills.
    for (const adapter of adapters) {
      const source = await readFile(path.join(adapterRoot, adapter.name, "SKILL.md"), "utf8");
      const content = source
        .replaceAll("](../../agent-adapter.md)", "](../../codex/agent-adapter.md)")
        .replaceAll("](../../../agents/", "](../../agents/");
      const destination = path.join(pluginRoot, "skills", adapter.name);
      await mkdir(destination);
      await writeFile(path.join(destination, "SKILL.md"), content, { flag: "wx" });
    }
    const catalogDirectory = path.join(output, ".agents/plugins");
    await mkdir(catalogDirectory, { recursive: true });
    await writeFile(path.join(catalogDirectory, "marketplace.json"), `${JSON.stringify(catalog, null, 2)}\n`, { flag: "wx" });
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
  console.log(`Local marketplace staged at ${output}`);
  console.log("Marketplace: my-cc-ext-local; plugin: my-ext");
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
