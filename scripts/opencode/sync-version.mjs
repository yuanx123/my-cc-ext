import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const jsonTargets = [
  { file: ".claude-plugin/plugin.json", keys: ["version"] },
  { file: ".claude-plugin/marketplace.json", keys: ["plugins", 0, "version"] },
  { file: ".codex-plugin/plugin.json", keys: ["version"] },
];
const docs = [".opencode/INSTALL.md", "docs/README.opencode.md"];
const pinnedVersionPattern = /#v(\d+\.\d+\.\d+)/g;
const textualVersionPattern = /"version"\s*:\s*"(?<value>(?:\\.|[^"\\])*)"/dg;

async function readText(file) {
  try {
    return await readFile(path.join(root, file), "utf8");
  } catch (cause) {
    throw new Error(`failed to read ${file}: ${cause.message}`, { cause });
  }
}

async function readJson(file) {
  const source = await readText(file);
  return parseJson(source, file);
}

function parseJson(source, file) {
  try {
    return JSON.parse(source);
  } catch (cause) {
    throw new Error(`failed to parse ${file}: ${cause.message}`, { cause });
  }
}

function get(object, keys, file) {
  let value = object;
  for (const key of keys) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) {
      throw new Error(`${file} is missing ${keys.join(".")}`);
    }
    value = value[key];
  }
  return value;
}

function countVersionFields(value) {
  if (value === null || typeof value !== "object") {
    return 0;
  }
  return Object.entries(value).reduce(
    (count, [key, child]) => count + (key === "version" ? 1 : 0) + countVersionFields(child),
    0,
  );
}

async function readJsonTarget(target) {
  const source = await readText(target.file);
  const object = parseJson(source, target.file);
  const actual = get(object, target.keys, target.file);
  const matches = [...source.matchAll(textualVersionPattern)];
  if (countVersionFields(object) !== 1 || matches.length !== 1) {
    throw new Error(`${target.file} must contain exactly one textual version field for ${target.keys.join(".")}`);
  }
  if (typeof actual !== "string") {
    throw new Error(`${target.file} ${target.keys.join(".")} must be a string`);
  }
  const match = matches[0];
  let textualValue;
  try {
    textualValue = JSON.parse(`"${match.groups.value}"`);
  } catch (cause) {
    throw new Error(`${target.file} has an invalid textual version field: ${cause.message}`, { cause });
  }
  if (textualValue !== actual) {
    throw new Error(`${target.file} textual version field does not match ${target.keys.join(".")}`);
  }
  return {
    source,
    actual,
    valueStart: match.indices.groups.value[0],
    valueEnd: match.indices.groups.value[1],
  };
}

async function writeFileAtomically(file, content) {
  const absolute = path.join(root, file);
  const temporary = path.join(path.dirname(absolute), `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { encoding: "utf8", flag: "wx" });
    await rename(temporary, absolute);
  } catch (cause) {
    await rm(temporary, { force: true }).catch(() => {});
    throw new Error(`failed to write ${file}: ${cause.message}`, { cause });
  }
}

async function check(version) {
  const errors = [];
  for (const target of jsonTargets) {
    const { actual } = await readJsonTarget(target);
    if (actual !== version) {
      errors.push(`${target.file} has ${actual}, expected ${version}`);
    }
  }
  for (const file of docs) {
    const pinnedVersions = [...(await readText(file)).matchAll(pinnedVersionPattern)].map((match) => match[1]);
    if (!pinnedVersions.includes(version)) {
      errors.push(`${file} is missing #v${version}`);
    }
    for (const actual of new Set(pinnedVersions.filter((item) => item !== version))) {
      errors.push(`${file} has #v${actual}, expected #v${version}`);
    }
  }
  if (errors.length) {
    throw new Error(errors.join("\n"));
  }
  console.log(`version ${version} is synchronized`);
}

async function synchronize(version) {
  const writes = [];
  for (const target of jsonTargets) {
    const { source, actual, valueStart, valueEnd } = await readJsonTarget(target);
    if (actual !== version) {
      writes.push([target.file, `${source.slice(0, valueStart)}${version}${source.slice(valueEnd)}`]);
    }
  }
  for (const file of docs) {
    const source = await readText(file);
    if (![...source.matchAll(pinnedVersionPattern)].length) {
      throw new Error(`${file} has no pinned #vVERSION reference to update`);
    }
    const content = source.replaceAll(pinnedVersionPattern, `#v${version}`);
    if (content !== source) {
      writes.push([file, content]);
    }
  }
  for (const [file, content] of writes) {
    await writeFileAtomically(file, content);
  }
  await check(version);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !["--check", "--write"].includes(args[0])) {
    throw new Error("usage: node scripts/opencode/sync-version.mjs --check | --write");
  }
  const version = (await readJson("package.json")).version;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`package.json has invalid version ${version}`);
  }
  if (args[0] === "--write") {
    await synchronize(version);
  } else {
    await check(version);
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
