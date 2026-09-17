# Claude Code 与 OpenCode 双平台兼容实施计划

> **给代理工作者：** 必需的子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施此计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 从当前部分完成状态继续实施已批准的 v1.1 设计，使 Claude Code 与 OpenCode 共用根 `skills/`，并通过可生成、可检查、可打包和可真实烟测的薄适配器支持 OpenCode >=1.15.10。

**架构：** `agents/` 中 4 个 Claude Code 业务 Agent 是生成来源，`scripts/opencode/generate-agents.mjs` 按声明式映射生成并校验 4 个跟踪的 OpenCode Agent；`my-ext-opencode-ext-dev` 独立维护。`.opencode/plugins/my-ext.js` 只在 `config` hook 中幂等注册 `skills.paths`、`instructions` 和内联 Agent，不修改消息，不维护会话状态。`package.json.version` 是唯一版本更新入口，Node 脚本同步两个 Claude manifest 和文档固定 tag。

**技术栈：** Markdown、ES Module JavaScript、Node.js >=20.11 内置模块、`node:test`、Python `unittest`、OpenCode config hook、npm pack

---

## v1.1 实施边界

- 权威设计：`docs/superpowers/specs/2026-07-23-opencode-multiplatform-design.md`，文档版本 1.1。
- 只支持 Claude Code 与 OpenCode，不增加其他平台。
- 根 `skills/` 是唯一共享 Skill 内容源；OpenCode Skill 保持现有无前缀名称。
- 不使用 `experimental.chat.messages.transform`、`chat.message` 或任何逐消息注入。
- 不增加 `version.json`；`package.json.version` 是唯一版本更新入口。
- 不手工维护 4 个生成式 OpenCode Agent 正文。
- 真实 OpenCode 二进制、网络和固定 tag/commit 安装只允许在显式环境门禁开启时运行；其余测试不得跳过。
- 所有脚本使用 Node 内置模块，路径通过 `node:path` 处理，不使用符号链接。
- 本计划不包含 `git add`、`git commit`、`git push` 或其他 Git 状态变更步骤；提交由协调者在用户明确要求后处理。

## 当前状态

- `AGENTS.md` 已创建，`CLAUDE.md` 已引用公共规则。
- 第一轮平台中立 Skill 清理已完成，`tests/opencode/shared-content.test.mjs` 当前通过。
- `.opencode/bootstrap.md`、5 个简写 OpenCode Agent 和 `tests/opencode/agents.test.mjs` 已存在，但来自 stale v1.0 计划，必须按本计划转换。
- `package.json`、`.opencode/plugins/my-ext.js`、`scripts/opencode/`、安装文档和其余 OpenCode 测试尚不存在。
- 两个 Claude manifest 当前版本均为 `1.0.10`。

## 文件结构映射

**已完成并保留：**

- `AGENTS.md`
- `CLAUDE.md`
- `tests/opencode/shared-content.test.mjs`
- 已完成平台中立化的共享 Skill 修改

**创建：**

- `scripts/opencode/portability-allowlist.json`：共享 Skill 平台词显式例外清单。
- `scripts/opencode/portability-lint.mjs`：共享 Skill 可移植性检查。
- `scripts/opencode/agent-mappings.mjs`：4 个 Claude Agent 到 OpenCode Agent 的声明式映射和权限基线。
- `scripts/opencode/generate-agents.mjs`：确定性生成和 `--check` 漂移检测。
- `scripts/opencode/sync-version.mjs`：从 `package.json.version` 检查或同步 manifests 与文档 tag。
- `scripts/opencode/smoke-test.mjs`：带显式环境门禁的真实 OpenCode Git 安装契约烟测。
- `.opencode/plugins/my-ext.js`：OpenCode config hook 入口。
- `.opencode/INSTALL.md`：包内固定版本安装说明。
- `docs/README.opencode.md`：完整 OpenCode 安装、冲突、升级和卸载文档。
- `package.json`：ES Module 包入口、files、版本和跨平台脚本。
- `tests/opencode/portability.test.mjs`
- `tests/opencode/generator.test.mjs`
- `tests/opencode/helpers/package-fixture.mjs`
- `tests/opencode/plugin-config.test.mjs`
- `tests/opencode/version-sync.test.mjs`
- `tests/opencode/documentation.test.mjs`
- `tests/opencode/package-content.test.mjs`
- `tests/opencode/smoke-gate.test.mjs`
- `.github/workflows/opencode-contract.yml`

**转换或修改：**

- `.opencode/agents/my-ext-db-ops.md`：由 `agents/db-ops/AGENT.md` 生成。
- `.opencode/agents/my-ext-feature-dev.md`：由 `agents/feature-dev/AGENT.md` 生成。
- `.opencode/agents/my-ext-fix.md`：由 `agents/fix/AGENT.md` 生成。
- `.opencode/agents/my-ext-superpowers-planner.md`：由 `agents/superpowers-planner/AGENT.md` 生成。
- `.opencode/agents/my-ext-opencode-ext-dev.md`：独立正文，补齐 v1.1 权限和 instructions 语义。
- `.opencode/bootstrap.md`：保留映射，明确通过 `config.instructions` 加载。
- `tests/opencode/agents.test.mjs`：改为生成漂移、来源摘要和权限契约测试。
- `tests/opencode/shared-content.test.mjs`：保留现有回归，由 portability lint 补充细粒度检查。
- `README.md`：增加平台选择入口。
- `.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`：只由版本同步脚本从 package 版本更新。

## 执行波次

- Wave 1：任务 1 已完成上下文。
- Wave 2：任务 2 portability lint。
- Wave 3：任务 3 Agent 生成链。
- Wave 4：任务 4 config hook。
- Wave 5：任务 5 package、版本和文档。
- Wave 6：任务 6 打包和真实契约门禁。
- Wave 7：任务 7 全量回归。

### 任务 1：公共规则和首轮 Skill 平台中立化（已完成）

**文件：**

- 已创建：`AGENTS.md`
- 已修改：`CLAUDE.md`
- 已修改：`skills/implement-from-design/SKILL.md`
- 已修改：`skills/gen-java-entity/SKILL.md`
- 已修改：`skills/code-reviewer/SKILL.md`
- 已修改：`skills/add-javadoc/SKILL.md`
- 已修改：`skills/build-fix/SKILL.md`
- 已创建：`tests/opencode/shared-content.test.mjs`

- [x] **步骤 1：建立跨平台公共规则入口**

结果：根 `AGENTS.md` 已定义共享内容、安全、工程流程和平台适配边界，且不含平台安装命令或 hook 签名。

- [x] **步骤 2：移除已知绝对路径和 Claude-only 调用语法**

结果：工作区外 Java 风格绝对路径、`.claude/skills`、`.claude/plan`、`AskUserQuestion`、`Skill(skill:` 和 `Agent 工具` 已从共享 Skill 清理。

- [x] **步骤 3：验证现有共享内容回归**

已验证命令：

```bash
node --test tests/opencode/shared-content.test.mjs
python -m unittest discover -s skills/add-javadoc/tests -p "test_*.py" -v
```

已验证结果：Node 4 个测试通过；Python 6 个测试通过。

### 任务 2：增加 portability lint 并清理剩余直接工具名

**文件：**

- 创建：`scripts/opencode/portability-allowlist.json`
- 创建：`scripts/opencode/portability-lint.mjs`
- 创建：`tests/opencode/portability.test.mjs`
- 修改：`skills/fix/SKILL.md`
- 修改：`skills/code-reviewer/SKILL.md`
- 修改：`skills/build-fix/SKILL.md`
- 修改：`skills/gen-java-entity/SKILL.md`
- 修改：`skills/tdd/SKILL.md`
- 修改：`skills/gen-java-enum/SKILL.md`
- 修改：`skills/gen-java-enum/EXAMPLES.md`
- 修改：`skills/implement-from-design/SKILL.md`

- [ ] **步骤 1：创建空的显式 allowlist**

创建 `scripts/opencode/portability-allowlist.json`：

```json
{
  "entries": []
}
```

每个未来例外必须包含 `file`、`rule`、`lineText` 和非空 `reason`；匹配精确到规范化后的整行，避免宽泛豁免。

- [ ] **步骤 2：编写 portability lint 失败测试**

创建 `tests/opencode/portability.test.mjs`：

```js
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { findViolations } from "../../scripts/opencode/portability-lint.mjs";

test("repository shared skills pass portability lint", async () => {
  assert.deepEqual(await findViolations(path.resolve(import.meta.dirname, "../..")), []);
});

test("lint rejects direct platform tool instructions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "my-ext-portability-"));
  await mkdir(path.join(root, "skills", "demo"), { recursive: true });
  await mkdir(path.join(root, "scripts", "opencode"), { recursive: true });
  await writeFile(path.join(root, "skills", "demo", "SKILL.md"), "---\nname: demo\n---\n使用 Glob 搜索文件。\n");
  await writeFile(path.join(root, "scripts", "opencode", "portability-allowlist.json"), '{"entries":[]}\n');

  const violations = await findViolations(root);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].rule, "direct-tool-name");
});

test("an exact documented allowlist entry permits one line", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "my-ext-portability-"));
  await mkdir(path.join(root, "skills", "demo"), { recursive: true });
  await mkdir(path.join(root, "scripts", "opencode"), { recursive: true });
  const lineText = "使用 Glob 搜索文件。";
  await writeFile(path.join(root, "skills", "demo", "SKILL.md"), `---\nname: demo\n---\n${lineText}\n`);
  await writeFile(
    path.join(root, "scripts", "opencode", "portability-allowlist.json"),
    `${JSON.stringify({ entries: [{ file: "skills/demo/SKILL.md", rule: "direct-tool-name", lineText, reason: "Compatibility fixture" }] }, null, 2)}\n`,
  );

  assert.deepEqual(await findViolations(root), []);
});
```

- [ ] **步骤 3：运行测试确认 RED**

运行：

```bash
node --test tests/opencode/portability.test.mjs
```

预期：FAIL，错误为无法导入 `scripts/opencode/portability-lint.mjs`。

- [ ] **步骤 4：实现 portability lint**

创建 `scripts/opencode/portability-lint.mjs`：

```js
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RULES = [
  { id: "direct-tool-name", pattern: /(?:使用|用|通过)\s*(?:当前平台的\s*)?(?:Read|Write|Edit|Glob|Grep|Bash)\b|\b(?:Read|Write|Edit|Glob|Grep|Bash)\s*工具/ },
  { id: "claude-tool-call", pattern: /AskUserQuestion|TodoWrite|Skill\(skill:|Agent\s*工具/ },
  { id: "claude-path", pattern: /\.claude\/(?:skills|plan|worktrees)\// },
  { id: "external-absolute-path", pattern: /[A-Za-z]:[\\/](?![\\/])|(?:^|[\s`])\/(?:Users|home|opt|var|tmp)\// },
  { id: "claude-only-rules", pattern: /CLAUDE\.md(?!.*AGENTS\.md)/ },
];

async function markdownFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await markdownFiles(absolute));
    else if (entry.name.endsWith(".md")) output.push(absolute);
  }
  return output;
}

export async function findViolations(root) {
  const allowlistPath = path.join(root, "scripts", "opencode", "portability-allowlist.json");
  const allowlist = JSON.parse(await readFile(allowlistPath, "utf8"));
  const allowed = new Set(allowlist.entries.map((entry) => {
    if (!entry.reason?.trim()) throw new Error(`allowlist entry needs reason: ${entry.file}`);
    return JSON.stringify([entry.file, entry.rule, entry.lineText.trim()]);
  }));
  const violations = [];

  for (const file of await markdownFiles(path.join(root, "skills"))) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const lines = (await readFile(file, "utf8")).replaceAll("\r\n", "\n").split("\n");
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (!rule.pattern.test(line)) continue;
        const key = JSON.stringify([relative, rule.id, line.trim()]);
        if (!allowed.has(key)) violations.push({ file: relative, line: index + 1, rule: rule.id, lineText: line.trim() });
      }
    });
  }
  return violations;
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const violations = await findViolations(root);
  if (violations.length) {
    for (const item of violations) console.error(`${item.file}:${item.line} ${item.rule}: ${item.lineText}`);
    process.exitCode = 1;
  } else {
    console.log("portability lint passed");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
```

- [ ] **步骤 5：执行剩余平台词精确替换**

按下表替换，不改变业务规则：

| 文件 | 原文 | 替换后 |
|---|---|---|
| `skills/fix/SKILL.md` | `使用 Grep 搜索相关代码路径，确认调用链完整。` | `搜索相关代码路径，确认调用链完整。` |
| `skills/code-reviewer/SKILL.md` | `2. 用 Glob 递归定位 \`**/pom.xml\`、\`**/build.gradle\`、\`**/build.gradle.kts\`，排除构建输出目录。` | `2. 递归搜索 \`**/pom.xml\`、\`**/build.gradle\`、\`**/build.gradle.kts\`，排除构建输出目录。` |
| `skills/code-reviewer/SKILL.md` | `3. 用 Grep 在所有构建文件中检测 \`lombok\`、\`mybatis-plus\`、\`mybatis-spring\`、\`spring-boot-starter-data-jpa\`。` | `3. 在所有构建文件中搜索 \`lombok\`、\`mybatis-plus\`、\`mybatis-spring\`、\`spring-boot-starter-data-jpa\`。` |
| `skills/code-reviewer/SKILL.md` | `用 Glob 定位所有模块的 \`**/src/main/**/*Controller.java\`，再用 Grep 检查 \`Mapper\` / \`Repository\` 引用；只报告本次 diff 涉及的文件和调用链。` | `搜索所有模块的 \`**/src/main/**/*Controller.java\`，再检查 \`Mapper\` / \`Repository\` 引用；只报告本次 diff 涉及的文件和调用链。` |
| `skills/code-reviewer/SKILL.md` | `用 Glob 定位所有模块的 \`**/src/main/**/*.xml\`，再用 Grep 搜索 \`${\`；结合参数来源和白名单校验判断是否存在注入风险。` | `搜索所有模块的 \`**/src/main/**/*.xml\`，再搜索 \`${\`；结合参数来源和白名单校验判断是否存在注入风险。` |
| `skills/code-reviewer/SKILL.md` | `用 Grep 在所有模块的 \`**/src/main/**/*.java\` 中定位 \`catch\`，读取相邻代码确认是否为空块。不要仅依赖单行正则作结论。` | `在所有模块的 \`**/src/main/**/*.java\` 中搜索 \`catch\`，读取相邻代码确认是否为空块。不要仅依赖单行正则作结论。` |
| `skills/code-reviewer/SKILL.md` | `用 Grep 在所有模块的 Java 和配置文件中搜索 \`password\`、\`secret\`、\`token\`、\`apikey\`、\`api_key\`，读取命中上下文，区分真实凭据、变量名和示例占位符。` | `在所有模块的 Java 和配置文件中搜索 \`password\`、\`secret\`、\`token\`、\`apikey\`、\`api_key\`，读取命中上下文，区分真实凭据、变量名和示例占位符。` |
| `skills/build-fix/SKILL.md` | `使用 Glob 递归检测 \`**/pom.xml\`、\`**/build.gradle\`、\`**/build.gradle.kts\`、\`mvnw*\` 和 \`gradlew*\`，排除 \`target/\`、\`build/\` 和生成目录。根构建文件用于确定聚合项目，子目录构建文件用于确定模块边界。` | `递归搜索 \`**/pom.xml\`、\`**/build.gradle\`、\`**/build.gradle.kts\`、\`mvnw*\` 和 \`gradlew*\`，排除 \`target/\`、\`build/\` 和生成目录。根构建文件用于确定聚合项目，子目录构建文件用于确定模块边界。` |
| `skills/build-fix/SKILL.md` | `1. READ   — Read 工具读取文件（错误行 ± 15 行上下文）` | `1. READ   ：读取文件（错误行 ± 15 行上下文）` |
| `skills/gen-java-entity/SKILL.md` | `通过 Glob 搜索现有 Entity 和 Mapper 文件，动态确定包路径：` | `通过文件模式搜索现有 Entity 和 Mapper 文件，动态确定包路径：` |
| `skills/gen-java-entity/SKILL.md` | `- 包路径通过 Glob 已有 Entity 动态确定，不写死` | `- 包路径通过搜索已有 Entity 动态确定，不写死` |
| `skills/gen-java-entity/SKILL.md` | `- 包路径通过 Glob 已有 Mapper/Repository 动态确定，不写死` | `- 包路径通过搜索已有 Mapper/Repository 动态确定，不写死` |
| `skills/tdd/SKILL.md` | `使用 Glob 递归定位所有模块的 \`**/pom.xml\`、\`**/build.gradle\`、\`**/build.gradle.kts\`、\`**/src/test/**\` 和 \`**/*Test.java\`。使用 Grep 在构建文件中检测 JUnit、TestNG、Mockito 和 JaCoCo。根据被测类所属模块选择对应构建文件，排除 \`target/\`、\`build/\` 和生成目录。` | `递归搜索所有模块的 \`**/pom.xml\`、\`**/build.gradle\`、\`**/build.gradle.kts\`、\`**/src/test/**\` 和 \`**/*Test.java\`。在构建文件中搜索 JUnit、TestNG、Mockito 和 JaCoCo。根据被测类所属模块选择对应构建文件，排除 \`target/\`、\`build/\` 和生成目录。` |
| `skills/tdd/SKILL.md` | `使用 Glob 递归定位 \`**/*Service.java\` 和 \`**/*ServiceImpl.java\`，根据包名、接口实现关系以及用户指定目标确定被测类，不能默认取搜索结果前五个。` | `递归搜索 \`**/*Service.java\` 和 \`**/*ServiceImpl.java\`，根据包名、接口实现关系以及用户指定目标确定被测类，不能默认取搜索结果前五个。` |
| `skills/tdd/SKILL.md` | `用 Read 工具读取 1-2 个已有测试文件，了解：` | `读取 1-2 个已有测试文件，了解：` |
| `skills/gen-java-enum/SKILL.md` | `1. **包路径** — Grep 查找项目已有枚举类所在目录（如 \`**/enums/**\`），动态确定 \`package\`，禁止写死` | `1. **包路径** ：搜索项目已有枚举类所在目录（如 \`**/enums/**\`），动态确定 \`package\`，禁止写死` |
| `skills/gen-java-enum/SKILL.md` | `1. 包路径通过 Grep 已有枚举动态确定，不写死` | `1. 包路径通过搜索已有枚举动态确定，不写死` |
| `skills/gen-java-enum/EXAMPLES.md` | `包路径均为示例，实际生成时通过 Grep 动态确定。` | `包路径均为示例，实际生成时通过搜索动态确定。` |
| `skills/implement-from-design/SKILL.md` | `1. 用 Grep 搜索同名或相似的 Entity/DTO/Enum，避免重复定义` | `1. 搜索同名或相似的 Entity/DTO/Enum，避免重复定义` |
| `skills/implement-from-design/SKILL.md` | `1. 用 Glob 搜索同类文件（如 \`**/service/**Impl.java\`）` | `1. 使用文件模式搜索同类文件（如 \`**/service/**Impl.java\`）` |
| `skills/implement-from-design/SKILL.md` | `需要生成 Entity/Mapper 时，先通过 Glob 探测项目 ORM 框架和包路径，然后按 \`gen-java-entity\` 的模板生成。核心规范摘要：` | `需要生成 Entity/Mapper 时，先通过文件模式搜索探测项目 ORM 框架和包路径，然后按 \`gen-java-entity\` 的模板生成。核心规范摘要：` |

如果 lint 报出同一语义的其他行，按规则改为“读取文件、搜索内容、编辑文件、执行命令”，不得用宽泛 allowlist 压过真实问题。

- [ ] **步骤 6：运行 lint 和现有回归确认 GREEN**

运行：

```bash
node scripts/opencode/portability-lint.mjs
node --test tests/opencode/portability.test.mjs tests/opencode/shared-content.test.mjs
python -m unittest discover -s skills/add-javadoc/tests -p "test_*.py" -v
```

预期：输出 `portability lint passed`；Node 7 个测试通过；Python 6 个测试通过。

### 任务 3：用声明式生成器转换四个业务 Agent

**文件：**

- 创建：`scripts/opencode/agent-mappings.mjs`
- 创建：`scripts/opencode/generate-agents.mjs`
- 创建：`tests/opencode/generator.test.mjs`
- 修改：`tests/opencode/agents.test.mjs`
- 生成覆盖：`.opencode/agents/my-ext-db-ops.md`
- 生成覆盖：`.opencode/agents/my-ext-feature-dev.md`
- 生成覆盖：`.opencode/agents/my-ext-fix.md`
- 生成覆盖：`.opencode/agents/my-ext-superpowers-planner.md`
- 修改：`.opencode/agents/my-ext-opencode-ext-dev.md`
- 修改：`.opencode/bootstrap.md`

- [ ] **步骤 1：编写生成漂移和权限失败测试**

创建 `tests/opencode/generator.test.mjs`：

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { AGENT_MAPPINGS, PERMISSION_BASELINE, generateAll } from "../../scripts/opencode/generate-agents.mjs";

const root = path.resolve(import.meta.dirname, "../..");

test("four generated agents exactly match their Claude sources", async () => {
  const generated = await generateAll(root);
  assert.equal(generated.length, 4);
  for (const item of generated) {
    assert.equal(await readFile(path.join(root, item.mapping.output), "utf8"), item.content);
  }
});

test("generated files carry source marker and digest", async () => {
  for (const item of await generateAll(root)) {
    assert.match(item.content, new RegExp(`generated-from: ${item.mapping.source.replaceAll("/", "\\/")}`));
    assert.match(item.content, /source-sha256: [0-9a-f]{64}/);
    assert.doesNotMatch(item.content, /^model:/m);
  }
});

test("declarative mappings and permission baseline are closed", () => {
  assert.deepEqual(AGENT_MAPPINGS.map((item) => item.name), [
    "my-ext-db-ops",
    "my-ext-feature-dev",
    "my-ext-fix",
    "my-ext-superpowers-planner",
  ]);
  assert.deepEqual(PERMISSION_BASELINE, {
    read: "allow", glob: "allow", grep: "allow", skill: "allow", edit: "ask",
    bash: { "*": "ask", "git status*": "allow", "git diff*": "allow", "git log*": "allow", "git show*": "allow", "git rev-parse*": "allow" },
    external_directory: "deny",
  });
});
```

将 `tests/opencode/agents.test.mjs` 替换为：

```js
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const agentsRoot = path.join(root, ".opencode", "agents");
const expected = ["my-ext-db-ops.md", "my-ext-feature-dev.md", "my-ext-fix.md", "my-ext-opencode-ext-dev.md", "my-ext-superpowers-planner.md"];

function scalar(source, name) {
  return source.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1].trim();
}

test("package has exactly five OpenCode subagents with permission baseline", async () => {
  assert.deepEqual((await readdir(agentsRoot)).filter((name) => name.endsWith(".md")).sort(), expected);
  for (const file of expected) {
    const source = await readFile(path.join(agentsRoot, file), "utf8");
    assert.equal(scalar(source, "name"), file.slice(0, -3));
    assert.equal(scalar(source, "mode"), "subagent");
    assert.doesNotMatch(source, /^model:/m);
    const permission = JSON.parse(scalar(source, "permission"));
    assert.equal(permission.read, "allow");
    assert.equal(permission.glob, "allow");
    assert.equal(permission.grep, "allow");
    assert.equal(permission.skill, "allow");
    assert.equal(permission.edit, "ask");
    assert.equal(permission.bash["*"], "ask");
    assert.equal(permission.external_directory, "deny");
    assert.equal(permission.task["*"], "deny");
    assert.ok(Object.keys(permission.task).filter((name) => name !== "*").every((name) => /^my-ext-/.test(name)));
  }
});

test("only the extension agent is independently maintained", async () => {
  for (const file of expected.filter((name) => name !== "my-ext-opencode-ext-dev.md")) {
    assert.match(await readFile(path.join(agentsRoot, file), "utf8"), /generated-from: agents\//);
  }
  const extension = await readFile(path.join(agentsRoot, "my-ext-opencode-ext-dev.md"), "utf8");
  assert.doesNotMatch(extension, /generated-from:/);
  assert.match(extension, /config\.instructions/);
  assert.doesNotMatch(extension, /messages\.transform|消息转换/);
});

test("bootstrap is an instructions file without lifecycle hooks", async () => {
  const source = await readFile(path.join(root, ".opencode", "bootstrap.md"), "utf8");
  assert.match(source, /config\.instructions/);
  assert.match(source, /not auto-discovered/i);
  assert.doesNotMatch(source, /SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|messages\.transform/);
});
```

- [ ] **步骤 2：运行测试和 check mode 确认 RED**

运行：

```bash
node --test tests/opencode/generator.test.mjs tests/opencode/agents.test.mjs
node scripts/opencode/generate-agents.mjs --check
```

预期：首条命令因生成模块不存在而失败；第二条命令同样因脚本不存在而失败。创建脚本但尚未写入生成产物后，`--check` 必须列出 4 个 drift 文件。

- [ ] **步骤 3：创建声明式映射和权限配置**

创建 `scripts/opencode/agent-mappings.mjs`：

```js
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
  external_directory: "deny",
};

export const COMMON_REPLACEMENTS = [
  ["CLAUDE.md", "AGENTS.md and platform-specific project rules"],
  [".claude/worktrees/", ".worktrees/"],
  ["用 Glob", "使用文件模式搜索能力"],
  ["通过 Glob", "通过文件模式搜索能力"],
  ["用 Grep", "使用内容搜索能力"],
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
  { source: "agents/feature-dev/AGENT.md", output: ".opencode/agents/my-ext-feature-dev.md", name: "my-ext-feature-dev", taskAllow: ["my-ext-superpowers-planner"], replacements: [["`superpowers-planner`", "`my-ext-superpowers-planner`"]] },
  { source: "agents/fix/AGENT.md", output: ".opencode/agents/my-ext-fix.md", name: "my-ext-fix", taskAllow: [], replacements: [] },
  { source: "agents/superpowers-planner/AGENT.md", output: ".opencode/agents/my-ext-superpowers-planner.md", name: "my-ext-superpowers-planner", taskAllow: ["my-ext-feature-dev"], replacements: [["`feature-dev` Agent", "`my-ext-feature-dev` subagent"]] },
];
```

- [ ] **步骤 4：实现确定性生成和 check mode**

创建 `scripts/opencode/generate-agents.mjs`：

```js
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_MAPPINGS, COMMON_REPLACEMENTS, PERMISSION_BASELINE } from "./agent-mappings.mjs";

function normalize(source) {
  return source.replaceAll("\r\n", "\n");
}

function parseClaudeAgent(source, file) {
  const normalized = normalize(source);
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: invalid Claude agent frontmatter`);
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1].trim();
  if (!name || !description) throw new Error(`${file}: missing name or description`);
  return { name, description, body: match[2].trim() };
}

function replaceAllLiteral(source, replacements) {
  return replacements.reduce((value, [from, to]) => value.replaceAll(from, to), source);
}

export function generateAgent(source, mapping) {
  const parsed = parseClaudeAgent(source, mapping.source);
  const digest = createHash("sha256").update(normalize(source)).digest("hex");
  const permission = {
    ...PERMISSION_BASELINE,
    bash: { ...PERMISSION_BASELINE.bash },
    task: Object.fromEntries([["*", "deny"], ...mapping.taskAllow.map((name) => [name, "allow"])]),
  };
  const body = replaceAllLiteral(parsed.body, [...COMMON_REPLACEMENTS, ...mapping.replacements]);
  return [
    "---",
    `name: ${mapping.name}`,
    `description: ${parsed.description}`,
    "mode: subagent",
    `permission: ${JSON.stringify(permission)}`,
    "---",
    `<!-- generated-from: ${mapping.source} -->`,
    `<!-- source-sha256: ${digest} -->`,
    "",
    body,
    "",
  ].join("\n");
}

export async function generateAll(root) {
  return Promise.all(AGENT_MAPPINGS.map(async (mapping) => ({
    mapping,
    content: generateAgent(await readFile(path.join(root, mapping.source), "utf8"), mapping),
  })));
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const check = process.argv.includes("--check");
  const generated = await generateAll(root);
  const drift = [];
  for (const item of generated) {
    const output = path.join(root, item.mapping.output);
    if (check) {
      const current = await readFile(output, "utf8").catch(() => "");
      if (normalize(current) !== item.content) drift.push(item.mapping.output);
    } else {
      await writeFile(output, item.content, "utf8");
    }
  }
  if (drift.length) {
    for (const file of drift) console.error(`generated agent drift: ${file}`);
    process.exitCode = 1;
  } else {
    console.log(check ? "generated agents are current" : `generated ${generated.length} OpenCode agents`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

export { AGENT_MAPPINGS, PERMISSION_BASELINE };
```

- [ ] **步骤 5：生成 4 个跟踪文件**

运行：

```bash
node scripts/opencode/generate-agents.mjs
node scripts/opencode/generate-agents.mjs --check
```

预期依次输出：

```text
generated 4 OpenCode agents
generated agents are current
```

禁止直接编辑这 4 个输出文件；业务流程变更先改 Claude 来源或声明式映射，再重新生成。

- [ ] **步骤 6：更新独立扩展 Agent 和 bootstrap**

将 `.opencode/agents/my-ext-opencode-ext-dev.md` 完整替换为：

```markdown
---
name: my-ext-opencode-ext-dev
description: 开发和审查 OpenCode Agent、Skill、Plugin、MCP 与 permission 配置
mode: subagent
permission: {"read":"allow","glob":"allow","grep":"allow","skill":"allow","edit":"ask","bash":{"*":"ask","git status*":"allow","git diff*":"allow","git log*":"allow","git show*":"allow","git rev-parse*":"allow"},"external_directory":"deny","task":{"*":"deny"}}
---

# OpenCode Extension Development

只处理 OpenCode Agent、Skill、Plugin、MCP、permission 和配置。开始前读取目标仓库 `AGENTS.md`、平台专用规则、`opencode.json`、`.opencode/`、`package.json` 与同类扩展，并确认已安装 OpenCode 版本及公开契约。

OpenCode Plugin 使用 ES Module 和 config hook。共享 Skill 通过 `config.skills.paths` 注册，bootstrap 通过 `config.instructions` 注册，包内 Agent 由插件读取 Markdown 并以内联 prompt 注册。保留用户已有配置，数组幂等追加，同名 Agent 用户配置优先。

不使用逐消息 hook，不修改用户消息，不维护会话注入状态。Agent 不硬编码 model；使用 permission 字段，写入和一般 shell 命令询问，外部目录默认拒绝，task 默认拒绝。

实现后使用 Node 内置测试覆盖生成漂移、配置、权限、打包、Windows 路径和真实 OpenCode 契约。
```

在 `.opencode/bootstrap.md` 末尾增加：

```markdown

This file is registered once through `config.instructions`. The plugin never copies this content into user messages and keeps no per-session injection state.
```

- [ ] **步骤 7：运行 Agent 测试确认 GREEN**

运行：

```bash
node --test tests/opencode/generator.test.mjs tests/opencode/agents.test.mjs
node scripts/opencode/generate-agents.mjs --check
```

预期：Node 6 个测试通过，随后输出 `generated agents are current`。

### 任务 4：实现幂等 config hook 注册

**文件：**

- 创建：`.opencode/plugins/my-ext.js`
- 创建：`tests/opencode/helpers/package-fixture.mjs`
- 创建：`tests/opencode/plugin-config.test.mjs`

- [ ] **步骤 1：创建无符号链接包夹具**

创建 `tests/opencode/helpers/package-fixture.mjs`：

```js
import { cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

export async function createPackageFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "my-ext-opencode-"));
  await mkdir(path.join(root, ".opencode", "plugins"), { recursive: true });
  await cp(path.join(repositoryRoot, ".opencode", "plugins", "my-ext.js"), path.join(root, ".opencode", "plugins", "my-ext.js"));
  await cp(path.join(repositoryRoot, ".opencode", "agents"), path.join(root, ".opencode", "agents"), { recursive: true });
  await cp(path.join(repositoryRoot, ".opencode", "bootstrap.md"), path.join(root, ".opencode", "bootstrap.md"));
  await mkdir(path.join(root, "skills"));
  await writeFile(path.join(root, "package.json"), '{"type":"module"}\n');
  return root;
}

export async function importPlugin(root) {
  const url = pathToFileURL(path.join(root, ".opencode", "plugins", "my-ext.js"));
  url.searchParams.set("fixture", `${Date.now()}-${Math.random()}`);
  return import(url.href);
}
```

- [ ] **步骤 2：编写 config hook 失败测试**

创建 `tests/opencode/plugin-config.test.mjs`：

```js
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createPackageFixture, importPlugin } from "./helpers/package-fixture.mjs";

const names = ["my-ext-db-ops", "my-ext-feature-dev", "my-ext-fix", "my-ext-opencode-ext-dev", "my-ext-superpowers-planner"];

test("config preserves and idempotently appends paths, instructions and agents", async () => {
  const root = await createPackageFixture();
  const { createHooks } = await importPlugin(root);
  const config = { skills: { paths: ["existing-skill"] }, instructions: ["existing.md"], agent: {} };
  const hooks = createHooks({ packageRoot: root, localEntry: false });
  await hooks.config(config);
  await hooks.config(config);

  assert.deepEqual(config.skills.paths, ["existing-skill", path.join(root, "skills")]);
  assert.deepEqual(config.instructions, ["existing.md", path.join(root, ".opencode", "bootstrap.md")]);
  assert.deepEqual(Object.keys(config.agent).sort(), names);
  for (const name of names) {
    assert.equal(config.agent[name].mode, "subagent");
    assert.equal(config.agent[name].model, undefined);
    assert.equal(config.agent[name].permission.edit, "ask");
    assert.equal(config.agent[name].permission.external_directory, "deny");
  }
});

test("same-name user agent wins", async () => {
  const root = await createPackageFixture();
  const { createHooks } = await importPlugin(root);
  const user = { mode: "primary", prompt: "user prompt" };
  const config = { agent: { "my-ext-fix": user } };
  await createHooks({ packageRoot: root, localEntry: false }).config(config);
  assert.strictEqual(config.agent["my-ext-fix"], user);
});

test("Windows and POSIX fixtures produce the same registration shape", async () => {
  const root = await createPackageFixture();
  const { registerConfig } = await importPlugin(root);
  const definitions = [{
    name: "my-ext-db-ops", description: "db", mode: "subagent", prompt: "prompt",
    permission: { read: "allow", edit: "ask", bash: { "*": "ask" }, external_directory: "deny", task: { "*": "deny" } },
  ];
  const windows = {};
  const posix = {};
  registerConfig(windows, { skillsPath: "C:\\pkg\\skills", bootstrapPath: "C:\\pkg\\.opencode\\bootstrap.md", definitions });
  registerConfig(posix, { skillsPath: "/pkg/skills", bootstrapPath: "/pkg/.opencode/bootstrap.md", definitions });
  assert.equal(windows.skills.paths[0], "C:\\pkg\\skills");
  assert.equal(posix.skills.paths[0], "/pkg/skills");
  assert.deepEqual(Object.keys(windows.agent), Object.keys(posix.agent));
});

test("invalid Agent frontmatter reports its filename", async () => {
  const root = await createPackageFixture();
  const file = path.join(root, ".opencode", "agents", "my-ext-db-ops.md");
  await writeFile(file, (await readFile(file, "utf8")).replace(/^permission:.*$/m, "permission: not-json"));
  const { createHooks } = await importPlugin(root);
  await assert.rejects(() => createHooks({ packageRoot: root, localEntry: false }).config({}), /my-ext-db-ops\.md: invalid permission JSON/);
});

test("agent file and parse result are cached by package root", async () => {
  const root = await createPackageFixture();
  const { createHooks } = await importPlugin(root);
  const hooks = createHooks({ packageRoot: root, localEntry: false });
  const first = {};
  await hooks.config(first);
  const file = path.join(root, ".opencode", "agents", "my-ext-db-ops.md");
  await writeFile(file, (await readFile(file, "utf8")).replace("Database Operations Agent", "Changed On Disk"));
  const second = {};
  await hooks.config(second);
  assert.equal(second.agent["my-ext-db-ops"].prompt, first.agent["my-ext-db-ops"].prompt);
});

test("local entry plus package spec warns but remains idempotent", async () => {
  const root = await createPackageFixture();
  const { createHooks } = await importPlugin(root);
  const warnings = [];
  const hooks = createHooks({ packageRoot: root, localEntry: true, logger: { info() {}, warn(message) { warnings.push(message); } } });
  const config = { plugin: ["my-ext@git+https://github.com/yuanx123/my-cc-ext.git#v1.0.10"] };
  await hooks.config(config);
  await hooks.config(config);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /local plugin entry and package entry/);
  assert.equal(config.skills.paths.length, 1);
  assert.equal(config.instructions.length, 1);
});

test("plugin exports no message transform hook", async () => {
  const root = await createPackageFixture();
  const { createHooks } = await importPlugin(root);
  const hooks = createHooks({ packageRoot: root, localEntry: false });
  assert.deepEqual(Object.keys(hooks), ["config"]);
});
```

- [ ] **步骤 3：运行测试确认 RED**

运行：

```bash
node --test tests/opencode/plugin-config.test.mjs
```

预期：FAIL，错误指出 `.opencode/plugins/my-ext.js` 不存在。

- [ ] **步骤 4：实现插件入口**

创建 `.opencode/plugins/my-ext.js`：

```js
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const agentCache = new Map();

function parseAgent(source, file) {
  const normalized = source.replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: invalid frontmatter`);
  const fields = Object.fromEntries(match[1].split("\n").filter(Boolean).map((line) => {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`${file}: invalid frontmatter line ${line}`);
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }));
  if (!/^my-ext-[a-z0-9-]+$/.test(fields.name ?? "")) throw new Error(`${file}: invalid name`);
  if (fields.mode !== "subagent") throw new Error(`${file}: mode must be subagent`);
  if (fields.model !== undefined) throw new Error(`${file}: model must be inherited`);
  let permission;
  try { permission = JSON.parse(fields.permission); } catch (error) { throw new Error(`${file}: invalid permission JSON: ${error.message}`); }
  const prompt = match[2].trim();
  if (!prompt) throw new Error(`${file}: empty prompt`);
  return { name: fields.name, description: fields.description, mode: fields.mode, permission, prompt };
}

function loadAgents(packageRoot) {
  if (agentCache.has(packageRoot)) return agentCache.get(packageRoot);
  const directory = path.join(packageRoot, ".opencode", "agents");
  const definitions = readdirSync(directory).filter((name) => name.endsWith(".md")).sort()
    .map((name) => parseAgent(readFileSync(path.join(directory, name), "utf8"), name));
  agentCache.set(packageRoot, definitions);
  return definitions;
}

function appendUnique(array, value) {
  if (!array.includes(value)) array.push(value);
}

export function registerConfig(config, { skillsPath, bootstrapPath, definitions, logger = console }) {
  config.skills ??= {};
  config.skills.paths ??= [];
  config.instructions ??= [];
  config.agent ??= {};
  appendUnique(config.skills.paths, skillsPath);
  appendUnique(config.instructions, bootstrapPath);
  for (const definition of definitions) {
    if (Object.hasOwn(config.agent, definition.name)) {
      logger.info(`my-ext: preserving user agent ${definition.name}`);
      continue;
    }
    config.agent[definition.name] = {
      description: definition.description,
      mode: definition.mode,
      permission: definition.permission,
      prompt: definition.prompt,
    };
  }
}

function isSelfSpecifier(value) {
  return typeof value === "string" && (value.startsWith("my-ext@") || value.includes("yuanx123/my-cc-ext"));
}

export function createHooks({ packageRoot = PACKAGE_ROOT, localEntry = existsSync(path.join(PACKAGE_ROOT, ".git")), logger = console } = {}) {
  const skillsPath = path.join(packageRoot, "skills");
  const bootstrapPath = path.join(packageRoot, ".opencode", "bootstrap.md");
  return {
    async config(config) {
      if (!existsSync(skillsPath)) throw new Error(`my-ext: skills directory not found at ${skillsPath}`);
      if (!existsSync(bootstrapPath)) throw new Error(`my-ext: bootstrap file not found at ${bootstrapPath}`);
      if (localEntry && (config.plugin ?? []).some(isSelfSpecifier)) {
        logger.warn("my-ext: local plugin entry and package entry are both enabled; remove the package entry in this repository (see .opencode/INSTALL.md)");
      }
      registerConfig(config, { skillsPath, bootstrapPath, definitions: loadAgents(packageRoot), logger });
    },
  };
}

export async function MyExtPlugin() {
  return createHooks();
}

export default MyExtPlugin;
```

- [ ] **步骤 5：运行 config 测试确认 GREEN**

运行：

```bash
node --test tests/opencode/plugin-config.test.mjs
```

预期：7 个测试通过，0 个失败；不存在任何逐消息 hook。

### 任务 5：建立 package 单一版本源和固定引用文档

**文件：**

- 创建：`package.json`
- 创建：`scripts/opencode/sync-version.mjs`
- 创建：`tests/opencode/version-sync.test.mjs`
- 创建：`.opencode/INSTALL.md`
- 创建：`docs/README.opencode.md`
- 创建：`tests/opencode/documentation.test.mjs`
- 修改：`README.md`
- 同步：`.claude-plugin/plugin.json`
- 同步：`.claude-plugin/marketplace.json`

- [ ] **步骤 1：编写版本和文档失败测试**

创建 `tests/opencode/version-sync.test.mjs`：

```js
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const run = (cwd, mode) => spawnSync(process.execPath, ["scripts/opencode/sync-version.mjs", mode], { cwd, encoding: "utf8" });

test("package version drives both manifests and pinned docs", () => {
  const result = run(root, "--check");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /version 1\.0\.10 is synchronized/);
});

test("write mode never changes package version", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "my-ext-version-"));
  for (const item of ["package.json", ".claude-plugin", ".opencode", "docs", "scripts"]) await cp(path.join(root, item), path.join(fixture, item), { recursive: true });
  const packageFile = path.join(fixture, "package.json");
  const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
  packageJson.version = "1.0.11";
  await writeFile(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`);
  const result = run(fixture, "--write");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(await readFile(packageFile, "utf8")).version, "1.0.11");
  assert.equal(JSON.parse(await readFile(path.join(fixture, ".claude-plugin", "plugin.json"), "utf8")).version, "1.0.11");
  assert.equal(JSON.parse(await readFile(path.join(fixture, ".claude-plugin", "marketplace.json"), "utf8")).plugins[0].version, "1.0.11");
  assert.match(await readFile(path.join(fixture, "docs", "README.opencode.md"), "utf8"), /#v1\.0\.11/);
});
```

创建 `tests/opencode/documentation.test.mjs`：

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

test("OpenCode docs use fixed Git refs and document npm fallback", async () => {
  const source = await readFile(path.join(root, "docs", "README.opencode.md"), "utf8");
  assert.match(source, /my-ext\.git#v1\.0\.10/);
  assert.match(source, /full 40-character commit/i);
  assert.match(source, /npm.*fallback/is);
  assert.doesNotMatch(source, /my-ext\.git["']\s/);
});

test("docs warn about duplicate local and package loading", async () => {
  const source = await readFile(path.join(root, ".opencode", "INSTALL.md"), "utf8");
  assert.match(source, /local.*automatically.*do not add.*plugin/is);
  assert.match(source, /skills\.paths/);
  assert.match(source, /config\.instructions/);
  assert.match(source, /same-name.*user.*wins/is);
});
```

- [ ] **步骤 2：运行测试确认 RED**

运行：

```bash
node --test tests/opencode/version-sync.test.mjs tests/opencode/documentation.test.mjs
```

预期：FAIL，因为 `package.json`、同步脚本和安装文档不存在。

- [ ] **步骤 3：创建 package.json**

创建 `package.json`：

```json
{
  "name": "my-ext",
  "version": "1.0.10",
  "description": "Java development agents and shared skills for Claude Code and OpenCode",
  "type": "module",
  "main": ".opencode/plugins/my-ext.js",
  "files": [
    ".opencode/plugins/my-ext.js",
    ".opencode/bootstrap.md",
    ".opencode/agents/",
    ".opencode/INSTALL.md",
    "skills/",
    "AGENTS.md",
    "README.md",
    "docs/README.opencode.md"
  ],
  "engines": {
    "node": ">=20.11",
    "opencode": ">=1.15.10"
  },
  "scripts": {
    "generate:agents": "node scripts/opencode/generate-agents.mjs",
    "check:agents": "node scripts/opencode/generate-agents.mjs --check",
    "lint:portability": "node scripts/opencode/portability-lint.mjs",
    "version:check": "node scripts/opencode/sync-version.mjs --check",
    "version:sync": "node scripts/opencode/sync-version.mjs --write",
    "test:opencode": "node --test tests/opencode/*.test.mjs",
    "test:python": "python -m unittest discover -s skills/add-javadoc/tests -p test_*.py -v",
    "test": "npm run lint:portability && npm run check:agents && npm run version:check && npm run test:opencode && npm run test:python",
    "smoke:opencode": "node scripts/opencode/smoke-test.mjs"
  },
  "license": "MIT"
}
```

- [ ] **步骤 4：实现 package 版本驱动同步**

创建 `scripts/opencode/sync-version.mjs`：

```js
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const jsonTargets = [
  { file: ".claude-plugin/plugin.json", keys: ["version"] },
  { file: ".claude-plugin/marketplace.json", keys: ["plugins", 0, "version"] },
];
const docs = [".opencode/INSTALL.md", "docs/README.opencode.md"];

const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const get = (object, keys) => keys.reduce((value, key) => value[key], object);
function set(object, keys, value) {
  const parent = keys.slice(0, -1).reduce((current, key) => current[key], object);
  parent[keys.at(-1)] = value;
}

async function check(version) {
  const errors = [];
  for (const target of jsonTargets) {
    const actual = get(await readJson(target.file), target.keys);
    if (actual !== version) errors.push(`${target.file} has ${actual}, expected ${version}`);
  }
  for (const file of docs) {
    if (!(await readFile(path.join(root, file), "utf8")).includes(`#v${version}`)) errors.push(`${file} is missing #v${version}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`version ${version} is synchronized`);
}

async function write(version) {
  for (const target of jsonTargets) {
    const object = await readJson(target.file);
    set(object, target.keys, version);
    await writeFile(path.join(root, target.file), `${JSON.stringify(object, null, 2)}\n`);
  }
  for (const file of docs) {
    const absolute = path.join(root, file);
    const source = await readFile(absolute, "utf8");
    await writeFile(absolute, source.replace(/#v\d+\.\d+\.\d+/g, `#v${version}`));
  }
  await check(version);
}

try {
  const version = (await readJson("package.json")).version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`package.json has invalid version ${version}`);
  if (process.argv.includes("--write")) await write(version);
  else if (process.argv.includes("--check")) await check(version);
  else throw new Error("usage: node scripts/opencode/sync-version.mjs --check | --write");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
```

- [ ] **步骤 5：创建固定版本安装文档**

创建 `.opencode/INSTALL.md`：

```markdown
# OpenCode Installation

Requires OpenCode >=1.15.10 and Node.js >=20.11.

Outside this repository, add a fixed release tag to project or user `opencode.json`:

```json
{"plugin":["my-ext@git+https://github.com/yuanx123/my-cc-ext.git#v1.0.10"]}
```

This repository already loads `.opencode/plugins/my-ext.js` as a local plugin automatically. During local development, do not add the package to the `plugin` array or it can load twice.

The config hook idempotently appends root `skills/` to `skills.paths`, `.opencode/bootstrap.md` to `config.instructions`, and five package agents to `config.agent`. Package agents are not auto-discovered. A same-name user agent wins.

Git installation is a tested compatibility path tied to OpenCode's current Bun installer, not a permanent API guarantee. If Git package installation changes, publish and install the same package from npm as the fallback.
```

创建 `docs/README.opencode.md`：

```markdown
# my-ext for OpenCode

## Requirements

- OpenCode >=1.15.10
- Node.js >=20.11

## Fixed Git Installation

Project and user configuration use the same fixed release specifier:

```json
{"plugin":["my-ext@git+https://github.com/yuanx123/my-cc-ext.git#v1.0.10"]}
```

Never install from the default branch. A release may instead publish a full 40-character commit in release metadata; replace the tag only with that immutable full commit.

Git installation is a tested compatibility path because OpenCode currently delegates package installation to Bun. It is not a permanent OpenCode API guarantee. The npm fallback, once the same package is published, is `my-ext@1.0.10` and uses the identical `package.json` entry.

## Registration

Shared Skills keep their existing unprefixed names and come from root `skills/`; another plugin with the same Skill name can conflict. The config hook appends `skills.paths` and `config.instructions` idempotently. Five `my-ext-*` Agents are read from package Markdown and registered as inline prompts; package-internal Agent files are not auto-discovered. Same-name user Agent configuration wins.

## Local Development

This repository's `.opencode/plugins/my-ext.js` is loaded locally. Do not also add its Git or npm package to this repository's `plugin` array. The plugin warns if both are detected, but duplicate plugin instances cannot share module caches.

## Windows

The implementation uses Node path and file APIs and no symbolic links. Run all commands from the repository root in PowerShell 7 or another shell with Node.js on PATH.

## Upgrade

Change the fixed tag or full commit in `opencode.json`, then restart OpenCode. Release validation must pass the real smoke gate before publishing.

## Uninstall

Remove the `my-ext@...` entry from project or user `opencode.json` and restart OpenCode. No copied Skill directory or symbolic link requires cleanup.
```

- [ ] **步骤 6：更新主 README 平台入口**

将 `README.md` 的标题后说明替换为：

```markdown
# my-ext

Java 开发全流程 Agent 和 Skill 工具集，支持 Claude Code 与 OpenCode。根 `skills/` 是两端共享的唯一 Skill 内容源。

## 平台选择

| 平台 | 安装说明 |
|---|---|
| Claude Code | 保留下方 Marketplace 和本地插件安装流程 |
| OpenCode >=1.15.10 | `docs/README.opencode.md` |
```

保留现有 Claude Code 安装、卸载和本地开发命令，不改注册名称。

- [ ] **步骤 7：运行同步后验证 GREEN**

运行：

```bash
node scripts/opencode/sync-version.mjs --write
node --test tests/opencode/version-sync.test.mjs tests/opencode/documentation.test.mjs
node scripts/opencode/sync-version.mjs --check
```

预期：Node 4 个测试通过，最后输出 `version 1.0.10 is synchronized`。`package.json.version` 仍为 `1.0.10`。

### 任务 6：增加 package 内容检查和真实 OpenCode 契约门禁

**文件：**

- 创建：`tests/opencode/package-content.test.mjs`
- 创建：`scripts/opencode/smoke-test.mjs`
- 创建：`tests/opencode/smoke-gate.test.mjs`
- 创建：`.github/workflows/opencode-contract.yml`

- [ ] **步骤 1：编写 package 内容失败测试**

创建 `tests/opencode/package-content.test.mjs`：

```js
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

test("npm pack contains runtime contract and all shared skills", () => {
  const result = spawnSync(npm, ["pack", "--json", "--dry-run"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const files = JSON.parse(result.stdout)[0].files.map((item) => item.path.replaceAll("\\", "/"));
  for (const required of ["package.json", ".opencode/plugins/my-ext.js", ".opencode/bootstrap.md", ".opencode/INSTALL.md"]) assert.ok(files.includes(required), required);
  for (const name of ["add-javadoc", "build-fix", "code-reviewer", "fix", "gen-java-entity", "gen-java-enum", "gen-pgsql-ddl", "implement-from-design", "tdd", "write-a-skill"]) assert.ok(files.includes(`skills/${name}/SKILL.md`), name);
  assert.equal(files.filter((file) => file.startsWith(".opencode/agents/") && file.endsWith(".md")).length, 5);
  assert.ok(files.every((file) => !file.startsWith("tests/") && !file.startsWith(".git/") && !/\.env$|\.pem$|\.key$/.test(file)));
});
```

- [ ] **步骤 2：编写 smoke 门禁单元测试**

创建 `tests/opencode/smoke-gate.test.mjs`：

```js
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

test("real smoke test skips only without explicit gate", () => {
  const env = { ...process.env };
  delete env.MY_EXT_RUN_OPENCODE_SMOKE;
  delete env.MY_EXT_GIT_SPEC;
  const result = spawnSync(process.execPath, ["scripts/opencode/smoke-test.mjs"], { cwd: root, env, encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^SKIP: set MY_EXT_RUN_OPENCODE_SMOKE=1/);
});

test("enabled gate requires an immutable Git spec", () => {
  const env = { ...process.env, MY_EXT_RUN_OPENCODE_SMOKE: "1", MY_EXT_GIT_SPEC: "my-ext@git+https://github.com/yuanx123/my-cc-ext.git" };
  const result = spawnSync(process.execPath, ["scripts/opencode/smoke-test.mjs"], { cwd: root, env, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /fixed #vX.Y.Z tag or full 40-character commit/);
});
```

- [ ] **步骤 3：运行测试确认 RED**

运行：

```bash
node --test tests/opencode/package-content.test.mjs tests/opencode/smoke-gate.test.mjs
```

预期：package 内容测试可通过；smoke gate 测试因脚本不存在而失败。

- [ ] **步骤 4：实现真实 OpenCode smoke 脚本**

创建 `scripts/opencode/smoke-test.mjs`：

```js
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

if (process.env.MY_EXT_RUN_OPENCODE_SMOKE !== "1") {
  console.log("SKIP: set MY_EXT_RUN_OPENCODE_SMOKE=1 with an installed OpenCode binary, network access, and MY_EXT_GIT_SPEC");
  process.exit(0);
}

const spec = process.env.MY_EXT_GIT_SPEC ?? "";
if (!/(?:#v\d+\.\d+\.\d+|#[0-9a-f]{40})$/.test(spec)) {
  console.error("MY_EXT_GIT_SPEC must end with a fixed #vX.Y.Z tag or full 40-character commit");
  process.exit(1);
}

const project = await mkdtemp(path.join(tmpdir(), "my-ext-smoke-"));
await writeFile(path.join(project, "opencode.json"), `${JSON.stringify({ plugin: [spec] }, null, 2)}\n`);
const binary = process.platform === "win32" ? "opencode.cmd" : "opencode";
const result = spawnSync(binary, ["debug", "config"], { cwd: project, encoding: "utf8", timeout: 180000 });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr || result.stdout);

const start = result.stdout.indexOf("{");
if (start < 0) throw new Error("opencode debug config did not return JSON");
const config = JSON.parse(result.stdout.slice(start));
const normalized = (value) => value.replaceAll("\\", "/");
if (!(config.skills?.paths ?? []).some((value) => normalized(value).endsWith("/skills"))) throw new Error("resolved config is missing skills.paths");
if (!(config.instructions ?? []).some((value) => normalized(value).endsWith("/.opencode/bootstrap.md"))) throw new Error("resolved config is missing instructions");
for (const name of ["my-ext-db-ops", "my-ext-feature-dev", "my-ext-fix", "my-ext-opencode-ext-dev", "my-ext-superpowers-planner"]) {
  if (!config.agent?.[name]) throw new Error(`resolved config is missing agent ${name}`);
}
console.log("OpenCode Git install and config contract passed");
```

- [ ] **步骤 5：运行本地非网络测试确认 GREEN**

运行：

```bash
node --test tests/opencode/package-content.test.mjs tests/opencode/smoke-gate.test.mjs
npm run smoke:opencode
```

预期：3 个测试通过；未设置门禁时 npm 脚本输出 `SKIP: set MY_EXT_RUN_OPENCODE_SMOKE=1...` 并以 0 退出。仅这个真实二进制/网络/tag 检查允许跳过。

- [ ] **步骤 6：创建 Windows/Linux 最低版和稳定版工作流**

创建 `.github/workflows/opencode-contract.yml`：

```yaml
name: OpenCode Contract

on:
  workflow_dispatch:
    inputs:
      git_spec:
        description: Fixed my-ext Git tag or full commit specifier
        required: true
        default: my-ext@git+https://github.com/yuanx123/my-cc-ext.git#v1.0.10

jobs:
  contract:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        opencode: [1.15.10, latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20.11
      - run: npm install --global opencode-ai@${{ matrix.opencode }}
      - run: npm test
      - run: npm run smoke:opencode
        env:
          MY_EXT_RUN_OPENCODE_SMOKE: "1"
          MY_EXT_GIT_SPEC: ${{ inputs.git_spec }}
```

该工作流是发布门禁：Git 安装、入口解析、`skills.paths`、`instructions` 或任一 Agent 缺失均失败。

### 任务 7：执行完整 v1.1 回归

**文件：**

- 验证：所有以上创建和修改文件
- 保留：`skills/add-javadoc/tests/test_scan_javadoc.py`

- [ ] **步骤 1：验证生成物与 portability**

运行：

```bash
npm run lint:portability
npm run check:agents
npm run version:check
```

预期依次输出：

```text
portability lint passed
generated agents are current
version 1.0.10 is synchronized
```

- [ ] **步骤 2：运行全部 Node 测试**

运行：

```bash
npm run test:opencode
```

预期：以下 9 个测试文件全部通过，0 个失败：

```text
tests/opencode/agents.test.mjs
tests/opencode/documentation.test.mjs
tests/opencode/generator.test.mjs
tests/opencode/package-content.test.mjs
tests/opencode/plugin-config.test.mjs
tests/opencode/portability.test.mjs
tests/opencode/shared-content.test.mjs
tests/opencode/smoke-gate.test.mjs
tests/opencode/version-sync.test.mjs
```

- [ ] **步骤 3：运行现有 Python 回归**

运行：

```bash
npm run test:python
```

预期：`Ran 6 tests` 和 `OK`。

- [ ] **步骤 4：运行聚合验证**

运行：

```bash
npm test
```

预期：portability、Agent drift、版本、全部 Node 测试和 6 个 Python 测试均通过，退出码 0。

- [ ] **步骤 5：检查禁止实现和配置契约**

运行：

```bash
node -e "const fs=require('node:fs');const p=fs.readFileSync('.opencode/plugins/my-ext.js','utf8');if(/messages\.transform|chat\.message|injectedSessions/.test(p))process.exit(1);const j=require('./package.json');if(j.main!=='.opencode/plugins/my-ext.js'||j.engines.opencode!=='>=1.15.10')process.exit(1);console.log('v1.1 static contract passed')"
```

预期输出：`v1.1 static contract passed`。

- [ ] **步骤 6：执行发布时真实 OpenCode 门禁**

仅在已安装目标 OpenCode 二进制、可访问网络且固定 release tag 已存在时运行：

```powershell
$env:MY_EXT_RUN_OPENCODE_SMOKE="1"
$env:MY_EXT_GIT_SPEC="my-ext@git+https://github.com/yuanx123/my-cc-ext.git#v1.0.10"
npm run smoke:opencode
```

预期输出：`OpenCode Git install and config contract passed`。发布时不得以 SKIP 结果替代该门禁。

## 最终验收标准

- [ ] Task 1 已完成内容保持通过。
- [ ] portability lint 扫描全部共享 Skill Markdown，未列入精确 allowlist 的平台专属操作词为零。
- [ ] 4 个业务 OpenCode Agent 由 Claude 来源和声明式映射确定性生成，含来源 marker 和 SHA-256，check mode 能发现漂移。
- [ ] `my-ext-opencode-ext-dev` 独立维护，不包含 Claude Code 扩展体系正文。
- [ ] 5 个 Agent 均为 `subagent`，不声明 model，并满足 read/glob/grep/skill allow、edit ask、bash 默认 ask、external directory deny、task 闭集。
- [ ] config hook 幂等保留并追加 `skills.paths` 和 `instructions`，注册 5 个 Agent，同名用户 Agent 优先。
- [ ] 插件没有逐消息 hook、消息修改、session set 或 bootstrap 内容注入。
- [ ] 本地入口和 package 入口重复配置时有明确警告，数组仍保持幂等。
- [ ] `package.json.version` 是唯一版本更新入口；两个 Claude manifest 和两份固定 tag 文档与其一致。
- [ ] Git 文档只使用固定 tag 或完整 commit，说明重复加载风险、npm fallback、无前缀 Skill 冲突、Windows、升级和卸载。
- [ ] npm dry-run 包含入口、bootstrap、5 个 Agent 和全部 10 个共享 Skill，不包含测试或敏感文件。
- [ ] 非网络测试始终运行；只有真实 OpenCode binary/network/tag 烟测受显式 gate 控制。
- [ ] Windows/Linux、OpenCode 1.15.10/稳定版发布工作流验证最终 `skills.paths`、`instructions` 和 `agent` 配置。
- [ ] 全部 Node 测试和现有 6 个 Python 测试通过。

## 计划自检结果

- 规范覆盖：v1.1 第 5.1 至 5.6、版本、静态测试、插件测试、打包契约、真实烟测和文档要求均对应任务 2 至 7。
- 当前状态：Task 1 使用 `[x]` 保留已完成上下文；stale bootstrap、5 个 Agent 和 agents 测试均明确转换。
- 类型一致性：`AGENT_MAPPINGS`、`PERMISSION_BASELINE`、`generateAll`、`createHooks`、`findViolations` 和同步脚本参数在测试与实现中一致。
- 范围检查：没有其他平台、没有消息 hook、没有第四版本源、没有手工维护生成正文、没有 commit 执行。
- 依赖检查：实现和测试只使用 Node 与 Python 内置能力；npm 仅用于本地 pack dry-run 和脚本编排。
