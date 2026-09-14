import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const { version } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

function run(cwd, mode) {
  return spawnSync(process.execPath, ["scripts/opencode/sync-version.mjs", mode], {
    cwd,
    encoding: "utf8",
  });
}

async function createFixture(t) {
  const fixture = await mkdtemp(path.join(tmpdir(), "my-ext-version-"));
  const cleanup = () => rm(fixture, { recursive: true, force: true });
  t.after(cleanup);

  try {
    for (const item of ["package.json", "readme.md", ".claude-plugin", ".codex-plugin", ".opencode", "docs", "scripts"]) {
      await cp(path.join(root, item), path.join(fixture, item), { recursive: true });
    }
    return fixture;
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function replace(file, pattern, replacement) {
  const before = await readFile(file, "utf8");
  const after = before.replace(pattern, replacement);
  assert.notEqual(after, before, `fixture mutation did not match ${file}`);
  await writeFile(file, after, "utf8");
}

async function setPackageVersion(fixture, version) {
  const packageFile = path.join(fixture, "package.json");
  const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
  packageJson.version = version;
  const source = `${JSON.stringify(packageJson, null, 2)}\n`;
  await writeFile(packageFile, source, "utf8");
  return { packageFile, source };
}

test("package version drives both manifests and pinned docs", () => {
  const result = run(root, "--check");
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`version ${version} is synchronized`));
});

test("check mode reports manifest and documentation drift with file context", async (t) => {
  const fixture = await createFixture(t);
  await replace(path.join(fixture, ".claude-plugin", "plugin.json"), `"version": "${version}"`, '"version": "9.9.9"');
  await replace(path.join(fixture, "docs", "README.opencode.md"), /#v\d+\.\d+\.\d+/g, "#v9.9.9");

  const result = run(fixture, "--check");
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(`.claude-plugin/plugin.json has 9.9.9, expected ${version}`));
  assert.ok(result.stderr.includes(`docs/README.opencode.md is missing #v${version}`));
});

test("write mode synchronizes every target without changing package version", async (t) => {
  const fixture = await createFixture(t);
  const { packageFile, source: packageSource } = await setPackageVersion(fixture, "1.0.11");
  const readmeBefore = await readFile(path.join(fixture, "readme.md"));

  const result = run(fixture, "--write");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(packageFile, "utf8"), packageSource);
  assert.equal(JSON.parse(await readFile(path.join(fixture, ".claude-plugin", "plugin.json"), "utf8")).version, "1.0.11");
  assert.equal(JSON.parse(await readFile(path.join(fixture, ".claude-plugin", "marketplace.json"), "utf8")).plugins[0].version, "1.0.11");
  assert.deepEqual(await readFile(path.join(fixture, "readme.md")), readmeBefore);
  for (const file of [".opencode/INSTALL.md", "docs/README.opencode.md"]) {
    const source = await readFile(path.join(fixture, file), "utf8");
    assert.match(source, /#v1\.0\.11/);
    assert.doesNotMatch(source, /#v1\.0\.10/);
  }
  assert.deepEqual((await readdir(path.join(fixture, ".claude-plugin"))).sort(), ["marketplace.json", "plugin.json"]);
});

test("write mode changes only the version token in compact nonstandard manifests", async (t) => {
  const fixture = await createFixture(t);
  await setPackageVersion(fixture, "1.0.11");
  const pluginFile = path.join(fixture, ".claude-plugin", "plugin.json");
  const marketplaceFile = path.join(fixture, ".claude-plugin", "marketplace.json");
  const pluginSource = '{ "name":"my-ext", "version" : "1.0.10", "keywords":["java","tdd"] }\r\n';
  const marketplaceSource = '{\r\n\t"plugins" : [ { "name":"my-ext", "version"\t:\t"1.0.10", "keywords":["java","tdd"] } ]\r\n}\r\n';
  await writeFile(pluginFile, pluginSource, "utf8");
  await writeFile(marketplaceFile, marketplaceSource, "utf8");

  const result = run(fixture, "--write");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readFile(pluginFile, "utf8"), pluginSource.replace('"1.0.10"', '"1.0.11"'));
  assert.equal(await readFile(marketplaceFile, "utf8"), marketplaceSource.replace('"1.0.10"', '"1.0.11"'));
});

test("write mode is byte-for-byte unchanged when every target is synchronized", async (t) => {
  const fixture = await createFixture(t);
  await writeFile(
    path.join(fixture, ".claude-plugin", "plugin.json"),
    `{"name":"my-ext","version":"${version}","keywords":["java","tdd"]}\r\n`,
    "utf8",
  );
  await writeFile(
    path.join(fixture, ".claude-plugin", "marketplace.json"),
    `{\r\n  "plugins":[{"name":"my-ext","version" : "${version}","keywords":["java","tdd"]}]\r\n}\r\n`,
    "utf8",
  );
  const files = [
    "package.json",
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    ".opencode/INSTALL.md",
    "docs/README.opencode.md",
  ];
  const before = new Map(await Promise.all(files.map(async (file) => [file, await readFile(path.join(fixture, file))])));

  const result = run(fixture, "--write");
  assert.equal(result.status, 0, result.stderr);
  for (const file of files) {
    assert.deepEqual(await readFile(path.join(fixture, file)), before.get(file), file);
  }
});

test("ambiguous or missing textual version fields fail before any target is written", async (t) => {
  for (const [name, pluginSource] of [
    ["ambiguous", '{"version":"1.0.10","nested":{"version":"1.0.10"}}\n'],
    ["missing", '{"vers\\u0069on":"1.0.10"}\n'],
  ]) {
    await t.test(name, async (t) => {
      const fixture = await createFixture(t);
      await setPackageVersion(fixture, "1.0.11");
      const pluginFile = path.join(fixture, ".claude-plugin", "plugin.json");
      await writeFile(pluginFile, pluginSource, "utf8");
      const protectedFiles = [
        ".claude-plugin/plugin.json",
        ".claude-plugin/marketplace.json",
        ".opencode/INSTALL.md",
        "docs/README.opencode.md",
      ];
      const before = new Map(await Promise.all(protectedFiles.map(async (file) => [file, await readFile(path.join(fixture, file))])));

      const result = run(fixture, "--write");
      assert.equal(result.status, 1);
      assert.match(result.stderr, /plugin\.json must contain exactly one textual version field/);
      for (const file of protectedFiles) {
        assert.deepEqual(await readFile(path.join(fixture, file)), before.get(file), `${name}: ${file}`);
      }
    });
  }
});

test("invalid package semver fails before updating targets", async (t) => {
  const fixture = await createFixture(t);
  const packageFile = path.join(fixture, "package.json");
  const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
  packageJson.version = "v1.0";
  await writeFile(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  const manifestFile = path.join(fixture, ".claude-plugin", "plugin.json");
  const manifestBefore = await readFile(manifestFile, "utf8");

  const result = run(fixture, "--write");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /package\.json has invalid version v1\.0/);
  assert.equal(await readFile(manifestFile, "utf8"), manifestBefore);
});
