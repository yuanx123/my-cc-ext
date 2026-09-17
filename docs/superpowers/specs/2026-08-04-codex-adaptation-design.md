# Codex 完整适配设计

## 背景

`my-ext` 当前以 `.claude-plugin/plugin.json` 和
`.claude-plugin/marketplace.json` 发布 Claude Code 插件，根目录 `skills/`
保存可复用 Skill，`agents/` 保存 Claude Code Agent。目标是在不复制 Agent
正文的前提下增加 Codex 支持，并继续保持 Claude Code 和 OpenCode 的现有行为。

Codex 原生插件支持 Skill、MCP、Hook 和资源，但当前不支持在插件清单中直接
注册 Claude Code 风格的自定义 Agent。因此，Codex 侧将 Agent 能力呈现为
“Agent 工作流 Skill”，并在宿主支持委派时交给子代理执行。

## 目标

- 新增可被 Codex 识别、安装和启用的原生插件清单。
- Codex 可以使用现有 10 个 Skill。
- Codex 可以调用现有 5 个 Agent 的完整工作流。
- `agents/<name>/AGENT.md` 是 Agent 正文的唯一事实源。
- 后续修改 Agent 行为时只编辑对应 `AGENT.md`，无需同步修改平台副本。
- 不改变 Claude Code 和 OpenCode 的现有安装及发现机制。

## 非目标

- 不为 Codex 硬编码模型 ID、权限模式或供应商配置。
- 不在 Codex 中模拟 Claude Code 的 `model` 和 `permissionMode` frontmatter。
- 不复制或生成 Agent 正文到 Codex 专属目录。
- 不新增 MCP Server、Hook、外部服务或网络依赖。
- 不重新设计现有 Agent 和 Skill 的业务流程。

## 方案

### 单一内容源

现有 `agents/<name>/AGENT.md` 保持为 Agent 的唯一内容源。Claude Code 继续直接
注册这些文件。Codex 的适配 Skill 在运行时读取对应 Agent 文件，并按 Codex
执行契约解释其内容。

适配层不复制标题、步骤、模板或业务规则。Agent 正文发生变化后，Claude Code
和 Codex 下一次加载时都会读取同一文件。

### 文件结构

```text
.codex-plugin/
  plugin.json
codex/
  agent-adapter.md
skills/
  cc-ext-dev-agent/
    SKILL.md
  db-ops-agent/
    SKILL.md
  feature-dev-agent/
    SKILL.md
  fix-agent/
    SKILL.md
  superpowers-planner-agent/
    SKILL.md
tests/
  test_codex_plugin.py
```

- `.codex-plugin/plugin.json`：Codex 原生插件入口，版本与 Claude 插件及市场条目一致，
  `skills` 指向现有 `./skills/`。
- `codex/agent-adapter.md`：Codex 平台统一执行契约，集中维护工具、委派、路径和
  平台术语映射。
- 5 个 `SKILL.md`：只包含 Codex 可发现的名称、触发描述、Agent 路径和执行顺序。
- `tests/test_codex_plugin.py`：验证清单、单一来源和全部适配器的完整性。

适配 Skill 放在根 `skills/` 下，是因为 Codex 插件使用一个技能根目录；名称统一
带 `-agent` 后缀，避免与现有同名轻量 Skill 冲突。描述明确其为 Agent 工作流，
防止 Claude Code 将其误判为原有轻量 Skill。

## Codex 执行契约

每个 Agent 适配 Skill 按以下顺序执行：

1. 读取 `codex/agent-adapter.md`。
2. 读取适配器声明的 `agents/<name>/AGENT.md`。
3. 忽略 Agent YAML frontmatter 中仅属于 Claude Code 的 `tools`、`model` 和
   `permissionMode`，保留 `name`、`description` 和正文语义。
4. 按能力而不是工具名称映射操作：文件读取、搜索、编辑、命令执行、技能加载、
   用户询问和任务委派分别使用当前 Codex 宿主提供的对应能力。
5. Codex 支持子代理时，委派一个边界明确的任务并要求子代理遵循 Agent 正文；
   不支持时，在当前代理内执行同一工作流。
6. 遇到 Claude Code 专属路径或调用语法时，转换为当前宿主的等价能力，不修改
   业务流程和阶段门禁。

`codex/agent-adapter.md` 还规定以下平台转换：

- 项目指令文件使用当前宿主实际加载的指令体系；Codex 优先 `AGENTS.md`。
- `Skill(...)` 表示加载同名 Skill，不要求保留 Claude Code 的调用语法。
- `Task(...)` 或 Agent 委派表示使用 Codex 的协作能力；不可用时内联执行。
- `.claude/worktrees/` 等宿主专属工作目录改用当前宿主的隔离工作区能力或项目约定。
- `cc-ext-dev` 处理非 Claude 平台扩展时，仅复用其探查、边界、安全和验证流程；
  平台清单、命令、Hook 和权限结构必须以目标平台当前官方规范为准。

## 插件与市场

新增 `.codex-plugin/plugin.json`，使用稳定插件名 `my-ext`，声明：

- `version: 1.1.0`
- `skills: "./skills/"`
- 与现有插件一致的作者、许可证、仓库和关键词元数据
- 面向 Codex 安装界面的 `interface` 描述

`.claude-plugin/plugin.json` 和 `.claude-plugin/marketplace.json` 同步升级到
`1.1.0`。不新增第二份 `.agents/plugins/marketplace.json`：Codex 官方支持读取
仓库根现有的 `.claude-plugin/marketplace.json` 作为兼容市场入口，继续复用它可
避免两个市场条目漂移或重复展示。

## 用户流程

### 安装

用户通过 Codex CLI 添加 Git 市场：

```bash
codex plugin marketplace add yuanx123/my-cc-ext
```

随后在 Codex/ChatGPT 桌面端的 Plugins 目录中选择该市场并安装 `my-ext`，重启或
开启新任务使插件发现状态刷新。README 不使用仍处于开发状态的插件安装 API。

### 调用

- 原有 Skill 继续按名称自动匹配或显式调用。
- 复杂工作流匹配带 `-agent` 后缀的适配 Skill，例如 `db-ops-agent` 或
  `feature-dev-agent`。
- 适配 Skill 读取同名 Agent 源文件，不依赖安装仓库之外的绝对路径。

## 错误处理

- Agent 源文件不存在：立即停止，并报告缺失的仓库相对路径。
- Agent frontmatter 无法解析：不猜测工具或权限，报告格式错误。
- Codex 缺少某项能力：保留工作流门禁，说明缺失能力并请求用户选择可行替代。
- 目标平台规范不明确：优先使用目标平台官方文档，不沿用 Claude Code 的结构。
- 子代理不可用：回退到当前代理执行，不跳过 Agent 的阶段、确认或验证步骤。

## 测试策略

采用 Python 标准库 `unittest`，不新增依赖。测试先失败，再完成最小实现：

1. 验证 `.codex-plugin/plugin.json` 存在、JSON 可解析、必需字段和相对路径合法。
2. 验证 Claude 插件、Claude 市场条目和 Codex 插件版本均为 `1.1.0`。
3. 验证 5 个适配 Skill 均存在，名称唯一，并指向预期的 Agent 源文件。
4. 验证每个引用的 Agent 文件真实存在。
5. 验证适配 Skill 未包含对应 Agent 的正文标题或大段内容，防止内容复制。
6. 验证 README 同时包含 Claude Code 和 Codex 的安装入口。
7. 运行现有 `add-javadoc` 测试，确认共享 Skill 未回归。

## 验收标准

- Codex 能通过插件清单发现全部根 Skill 和 5 个 Agent 工作流适配 Skill。
- 任意修改一个 `agents/<name>/AGENT.md` 后，无需修改 Codex 适配文件即可生效。
- 仓库中不存在第二份 Agent 正文。
- Claude Code 原有插件清单和市场清单仍可解析，版本保持同步。
- Codex 适配测试与现有测试全部通过。
- README 清楚说明安装步骤以及 Codex 无法继承 Claude 独立模型和权限模式的限制。

## 官方依据

- [Package your plugin](https://developers.openai.com/codex/plugins/build)：Codex 插件
  使用 `.codex-plugin/plugin.json`，Skill 位于插件根目录并通过 `skills` 声明。
- 同一文档的 Marketplace metadata 与 How local marketplaces work：Codex 支持
  `.agents/plugins/marketplace.json`，也兼容现有 `.claude-plugin/marketplace.json`。
- Codex 当前插件结构未提供 Agent 组件，因此本设计使用 Skill 薄适配而不伪造
  未公开的清单字段。
