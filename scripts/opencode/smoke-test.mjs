import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AGENT_NAMES = [
  "my-ext-code-review",
  "my-ext-db-ops",
  "my-ext-feature-dev",
  "my-ext-fix",
  "my-ext-opencode-ext-dev",
  "my-ext-superpowers-planner",
];
const BASH_PERMISSION_BASELINE = {
  "*": "ask",
  "git status*": "allow",
  "git diff*": "allow",
  "git log*": "allow",
  "git show*": "allow",
  "git rev-parse*": "allow",
};
const TASK_ALLOW = {
  "my-ext-feature-dev": ["my-ext-superpowers-planner", "my-ext-code-review"],
  "my-ext-superpowers-planner": ["my-ext-feature-dev"],
};
const REVIEW_BASH_PERMISSION = {
  "*": "deny",
  "git status --short": "allow",
  "git diff --no-ext-diff --no-textconv": "allow",
  "git diff --cached --no-ext-diff --no-textconv": "allow",
  "git log -5 --oneline": "allow",
};

const GIT_SPEC_PATTERN = /^my-ext@(?:git\+)?https:\/\/github\.com\/yuanx123\/my-cc-ext\.git#(?:v\d+\.\d+\.\d+|[0-9a-fA-F]{40})$|^my-ext@(?:git\+ssh:\/\/git@github\.com\/yuanx123\/my-cc-ext\.git|git@github\.com:yuanx123\/my-cc-ext\.git)#(?:v\d+\.\d+\.\d+|[0-9a-fA-F]{40})$/;

function immutableSpecError() {
  return new Error("MY_EXT_GIT_SPEC must be an exact my-ext GitHub HTTPS, git+HTTPS, or SSH spec ending in an immutable #vX.Y.Z tag or full 40-hex commit");
}

export function validateGitSpec(spec) {
  if (typeof spec !== "string" || !GIT_SPEC_PATTERN.test(spec)) {
    throw immutableSpecError();
  }
  return spec;
}

function jsonObjects(source) {
  const values = [];
  for (let start = source.indexOf("{"); start >= 0; start = source.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
      const character = source[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }
        continue;
      }
      if (character === '"') {
        inString = true;
      } else if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          const text = source.slice(start, index + 1);
          try {
            const value = JSON.parse(text);
            if (value !== null && typeof value === "object" && !Array.isArray(value)) {
              values.push({ value, length: text.length });
            }
          } catch {
            // A log prefix may contain braces that are not JSON.
          }
          break;
        }
      }
    }
  }
  return values;
}

export function parseConfigOutput(stdout) {
  const candidates = jsonObjects(stdout).sort((left, right) => right.length - left.length);
  if (candidates.length === 0) {
    throw new Error("OpenCode debug config did not return a JSON object");
  }
  return candidates[0].value;
}

function hasPathEnding(values, suffix) {
  return Array.isArray(values) && values.some((value) =>
    typeof value === "string" && value.replaceAll("\\", "/").endsWith(suffix));
}

function matchesExactStringMap(actual, expected) {
  if (actual === null || typeof actual !== "object" || Array.isArray(actual)) {
    return false;
  }
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
}

export function assertConfigContract(config) {
  if (!hasPathEnding(config.skills?.paths, "/skills")) {
    throw new Error("resolved config is missing the my-ext skills path");
  }
  if (!hasPathEnding(config.instructions, "/.opencode/bootstrap.md")) {
    throw new Error("resolved config is missing the my-ext instructions bootstrap");
  }

  for (const name of AGENT_NAMES) {
    const agent = config.agent?.[name];
    if (!agent || typeof agent !== "object") {
      throw new Error(`resolved config is missing agent ${name}`);
    }
    if (agent.mode !== "subagent") {
      throw new Error(`resolved agent ${name} must use subagent mode`);
    }
    if (Object.hasOwn(agent, "model")) {
      throw new Error(`resolved agent ${name} must inherit its model`);
    }
    const permission = agent.permission;
    const readOnly = name === "my-ext-code-review";
    if (permission?.read !== "allow"
      || permission.glob !== "allow"
      || permission.grep !== "allow"
      || permission.skill !== "allow"
      || permission.edit !== (readOnly ? "deny" : "ask")
      || permission.external_directory !== "ask") {
      throw new Error(`resolved agent ${name} does not match the permission baseline`);
    }
    if (!matchesExactStringMap(permission.bash, readOnly ? REVIEW_BASH_PERMISSION : BASH_PERMISSION_BASELINE)) {
      throw new Error(`resolved agent ${name} does not match the bash permission baseline`);
    }
    const taskBaseline = Object.fromEntries([["*", "deny"], ...(TASK_ALLOW[name] ?? []).map((task) => [task, "allow"])]);
    if (!matchesExactStringMap(permission.task, taskBaseline)) {
      throw new Error(`resolved agent ${name} does not match the task permission baseline`);
    }
  }
}

function sanitizedErrorCode(code) {
  return typeof code === "string" && /^[A-Z0-9_]{1,32}$/i.test(code) ? code.toUpperCase() : "UNKNOWN";
}

export async function runSmoke({
  env = process.env,
  platform = process.platform,
  tempRoot = tmpdir(),
  makeTemp = mkdtemp,
  write = writeFile,
  remove = rm,
  spawn = spawnSync,
  log = console.log,
} = {}) {
  if (env.MY_EXT_RUN_OPENCODE_SMOKE !== "1") {
    log("SKIP: set MY_EXT_RUN_OPENCODE_SMOKE=1 with an installed OpenCode binary, network access, and MY_EXT_GIT_SPEC");
    return { skipped: true };
  }

  const spec = validateGitSpec(env.MY_EXT_GIT_SPEC ?? "");
  let project;
  try {
    project = await makeTemp(path.join(tempRoot, "my-ext-smoke-"));
    await write(path.join(project, "opencode.json"), `${JSON.stringify({ plugin: [spec] }, null, 2)}\n`, "utf8");
    const binary = env.OPENCODE_BIN || "opencode";
    const result = spawn(binary, ["debug", "config"], {
      cwd: project,
      encoding: "utf8",
      env: { ...env, CI: "1", NO_COLOR: "1", TERM: "dumb" },
      shell: platform === "win32" && !env.OPENCODE_BIN,
      timeout: 180_000,
      windowsHide: true,
    });

    if (result.error?.code === "ENOENT") {
      throw new Error("OpenCode binary not found; install OpenCode or set OPENCODE_BIN");
    }
    if (result.error?.code === "ETIMEDOUT") {
      throw new Error("OpenCode debug config timed out after 180 seconds");
    }
    if (result.error) {
      throw new Error(`OpenCode debug config could not be started (${sanitizedErrorCode(result.error.code)})`);
    }
    if (result.status !== 0) {
      throw new Error(`OpenCode debug config failed with status ${result.status ?? "unknown"}`);
    }

    assertConfigContract(parseConfigOutput(result.stdout));
    log("OpenCode Git install and config contract passed");
    return { skipped: false };
  } finally {
    if (project) {
      await remove(project, { recursive: true, force: true });
    }
  }
}

async function main() {
  try {
    await runSmoke();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "OpenCode smoke test failed");
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
