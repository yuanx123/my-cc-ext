# my-ext

Java 开发全流程 AI 编程插件，支持 Claude Code、OpenCode 与 Codex。插件提供一组 Agent 工作流和 Skill，覆盖需求规划、数据库操作、代码实现、代码审查、缺陷修复、构建修复、TDD 和 JavaDoc 补充等常见后端开发任务。

## 能力概览

### Agents

| Agent | 说明 |
|------|------|
| `db-ops` | 数据库操作专家，负责 DDL、SQL、Entity、Mapper、Repository 和 SQL 审查 |
| `cc-ext-dev` | AI 编程扩展开发专家，负责 Skill、Agent、Plugin、Hook、MCP Server 和 Workflow |
| `feature-dev` | 功能开发流水线，从已有 PRD 生成设计、计划、编码、审查和开发报告 |
| `superpowers-planner` | 设计和计划流水线，从原始需求生成设计规范和实施计划 |
| `fix` | 复杂缺陷修复流水线，支持跨模块排查、阶段确认和状态恢复 |

### Skills

| Skill | 说明 |
|------|------|
| `gen-pgsql-ddl` | 生成 PostgreSQL DDL，schema 需询问用户，授权角色需确认并默认使用项目固定角色 |
| `gen-java-entity` | 根据 DDL 或表结构生成 Entity、Mapper 或 Repository |
| `gen-java-enum` | 生成 `code` / `msg` 风格 Java 枚举 |
| `implement-from-design` | 根据设计文档和实施计划完成 Java 编码 |
| `code-reviewer` | 对 Java git diff 进行分层架构、数据库、安全、异常、测试等维度审查 |
| `fix` | 按 TDD 流程定位、复现和修复缺陷 |
| `build-fix` | 检测 Maven / Gradle 构建错误并逐步修复 |
| `tdd` | 执行 Red-Green-Refactor 风格 Java TDD 工作流 |
| `add-javadoc` | 扫描并补充 Service 接口和实现类 JavaDoc |
| `write-a-skill` | 辅助创建结构清晰、可复用的 Agent Skill |

## Claude Code 安装

```bash
/plugin marketplace add https://github.com/yuanx123/my-cc-ext.git
/plugin install my-ext@my-cc-ext
claude plugins enable my-ext
```

## Codex 安装

先添加 Git 市场：

```bash
codex plugin marketplace add yuanx123/my-cc-ext
```

然后在 Codex/ChatGPT 桌面端的 Plugins 目录中选择 `my-cc-ext` 市场并安装
`my-ext`，重启应用或开启新任务使插件发现状态刷新。

Codex 会直接加载原有 Skill。Claude Code Agent 通过带 `-agent` 后缀的工作流
Skill 暴露：

| Claude Code Agent | Codex Skill |
|---|---|
| `cc-ext-dev` | `cc-ext-dev-agent` |
| `db-ops` | `db-ops-agent` |
| `feature-dev` | `feature-dev-agent` |
| `fix` | `fix-agent` |
| `superpowers-planner` | `superpowers-planner-agent` |

Agent 正文始终只维护在 `agents/<name>/AGENT.md`。Codex 不继承 Claude Agent
frontmatter 中的独立模型和 `permissionMode`，而是使用当前 Codex 会话的模型、权限
和可用协作能力。

## 卸载插件

```bash
/plugin uninstall my-ext@my-cc-ext
```

## 本地开发安装

在仓库根目录执行：

```bash
claude plugins install .
claude plugins enable my-ext
```

## 目录结构

```text
.claude-plugin/plugin.json
.codex-plugin/plugin.json
agents/
codex/agent-adapter.md
skills/
CLAUDE.md
```

更多说明见 `CLAUDE.md`。
