import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RULES = [
  { id: "direct-tool-name", pattern: /(?:使用|用|通过)\s*(?:当前平台的\s*)?(?:Read|Write|Edit|Glob|Grep|Bash)\b|\b(?:Read|Write|Edit|Glob|Grep|Bash)\s*工具/ },
  { id: "claude-tool-call", pattern: /AskUserQuestion|TodoWrite|Skill\(skill:|Agent\s*工具/ },
  { id: "claude-path", pattern: /\.claude[\\/](?:skills|plan|worktrees)[\\/]/ },
  { id: "external-absolute-path", pattern: /[A-Za-z]:[\\/](?![\\/])|(?:^|[\s`(])\/(?:Users|home|opt|var|tmp)\// },
  { id: "claude-only-rules", pattern: /CLAUDE\.md(?!.*AGENTS\.md)/ },
];

const RULE_IDS = new Set(RULES.map((rule) => rule.id));
const RUNTIME_RULES = [
  RULES.find((rule) => rule.id === "external-absolute-path"),
  { id: "foreign-platform-reference", pattern: /~\/\.claude|CLAUDE\.md|my-ext:kb-loader|`my-ext-fix` skill/ },
];

async function markdownFiles(directory) {
  const output = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...await markdownFiles(absolute));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      output.push(absolute);
    }
  }
  return output;
}

function allowlistKey(entry, index) {
  const label = `allowlist entry ${index + 1}`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`${label} must be an object`);
  }
  if (typeof entry.file !== "string" || !entry.file) {
    throw new Error(`${label} needs file`);
  }
  const normalizedFile = path.posix.normalize(entry.file.replaceAll("\\", "/"));
  if (entry.file !== normalizedFile || path.posix.isAbsolute(normalizedFile) || !normalizedFile.startsWith("skills/")) {
    throw new Error(`${label} needs a normalized repository-relative skill file: ${entry.file}`);
  }
  if (typeof entry.rule !== "string" || !RULE_IDS.has(entry.rule)) {
    throw new Error(`${label} needs a known rule: ${entry.rule}`);
  }
  if (typeof entry.lineText !== "string" || !entry.lineText || entry.lineText !== entry.lineText.trim()) {
    throw new Error(`${label} needs a nonempty trimmed lineText`);
  }
  if (typeof entry.reason !== "string" || !entry.reason.trim()) {
    throw new Error(`${label} needs a nonempty reason`);
  }
  return JSON.stringify([normalizedFile, entry.rule, entry.lineText]);
}

export async function findViolations(root) {
  const allowlistPath = path.join(root, "scripts", "opencode", "portability-allowlist.json");
  let allowlist;
  try {
    allowlist = JSON.parse(await readFile(allowlistPath, "utf8"));
  } catch (cause) {
    throw new Error(`failed to read or parse portability allowlist at ${allowlistPath}`, { cause });
  }
  if (!allowlist || typeof allowlist !== "object" || !Array.isArray(allowlist.entries)) {
    throw new Error("portability allowlist must contain an entries array");
  }
  const allowed = new Set(allowlist.entries.map(allowlistKey));
  if (allowed.size !== allowlist.entries.length) {
    throw new Error("portability allowlist contains duplicate entries");
  }

  const violations = [];
  const runtimeFiles = await markdownFiles(path.join(root, ".opencode", "agents")).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const sharedFiles = await markdownFiles(path.join(root, "skills"));
  for (const file of [...sharedFiles, ...runtimeFiles]) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const lines = (await readFile(file, "utf8")).replaceAll("\r\n", "\n").split("\n");
    lines.forEach((line, index) => {
      for (const rule of relative.startsWith("skills/") ? RULES : RUNTIME_RULES) {
        rule.pattern.lastIndex = 0;
        if (!rule.pattern.test(line)) continue;
        const lineText = line.trim();
        const key = JSON.stringify([relative, rule.id, lineText]);
        if (!allowed.has(key)) {
          violations.push({ file: relative, line: index + 1, rule: rule.id, lineText });
        }
      }
    });
  }
  return violations;
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const violations = await findViolations(root);
  if (violations.length) {
    for (const item of violations) {
      console.error(`${item.file}:${item.line} ${item.rule}: ${item.lineText}`);
    }
    process.exitCode = 1;
  } else {
    console.log("portability lint passed");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
