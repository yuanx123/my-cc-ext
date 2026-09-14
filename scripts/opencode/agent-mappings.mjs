export const PERMISSION_BASELINE = {
  read: "allow",
  glob: "allow",
  grep: "allow",
  skill: "allow",
  edit: "ask",
  bash: {
    "*": "ask",
    "git status*": "allow",
    "git diff*": "allow",
    "git log*": "allow",
    "git show*": "allow",
    "git rev-parse*": "allow",
  },
  external_directory: "ask",
};

export const READ_ONLY_PERMISSION = {
  ...PERMISSION_BASELINE,
  edit: "deny",
  bash: {
    "*": "deny",
    "git status --short": "allow",
    "git diff --no-ext-diff --no-textconv": "allow",
    "git diff --cached --no-ext-diff --no-textconv": "allow",
    "git log -5 --oneline": "allow",
  },
};

export const COMMON_REPLACEMENTS = [
  ["~/.claude/CLAUDE.md", "当前平台适用的用户指令"],
  ["CLAUDE.md", "AGENTS.md"],
  ["my-ext:kb-loader", "kb-loader"],
  [".claude/worktrees/", ".worktrees/"],
  ["用 Glob", "使用文件模式搜索能力"],
  ["通过 Glob", "通过文件模式搜索能力"],
  ["用 Grep", "使用内容搜索能力"],
  ["逐层 Grep 搜索", "逐层搜索"],
  ["Grep 搜索", "搜索"],
  ["Read 关键", "读取关键"],
  ["使用 `Bash` 执行", "使用 shell 执行"],
  ["通过 Skill 工具调用", "使用当前平台的 skill 加载能力加载"],
  ["Skill(skill: \"fix\")", "load skill: fix"],
  ["Skill(skill: \"code-reviewer\")", "load skill: code-reviewer"],
  ["Skill:implement-from-design", "skill:implement-from-design"],
  ["Skill:code-reviewer", "skill:code-reviewer"],
  ["Agent 工具", "子代理委托能力"],
];

export const AGENT_MAPPINGS = [
  { source: "agents/db-ops/AGENT.md", output: ".opencode/agents/my-ext-db-ops.md", name: "my-ext-db-ops", taskAllow: [], replacements: [] },
  { source: "agents/feature-dev/AGENT.md", output: ".opencode/agents/my-ext-feature-dev.md", name: "my-ext-feature-dev", taskAllow: ["my-ext-superpowers-planner", "my-ext-code-review"], replacements: [["`superpowers-planner`", "`my-ext-superpowers-planner`"], ["由 superpowers-planner 产出", "由 my-ext-superpowers-planner 产出"], ["`code-review`", "`my-ext-code-review`"]] },
  { source: "agents/fix/AGENT.md", output: ".opencode/agents/my-ext-fix.md", name: "my-ext-fix", taskAllow: [], replacements: [] },
  { source: "agents/superpowers-planner/AGENT.md", output: ".opencode/agents/my-ext-superpowers-planner.md", name: "my-ext-superpowers-planner", taskAllow: ["my-ext-feature-dev"], replacements: [["`feature-dev` Agent", "`my-ext-feature-dev` subagent"], ["`feature-dev`", "`my-ext-feature-dev`"], ["交给 feature-dev", "交给 my-ext-feature-dev"], ["`code-review`", "`my-ext-code-review`"]] },
  { source: "agents/code-review/AGENT.md", output: ".opencode/agents/my-ext-code-review.md", name: "my-ext-code-review", readOnly: true, taskAllow: [], replacements: [["`fix` Agent", "`my-ext-fix` Agent"]] },
];
