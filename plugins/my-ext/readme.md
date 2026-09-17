# my-ext

Java 开发全流程 Agent 和 Skill 工具集，支持 Claude Code、OpenCode 与 Codex。根 `skills/` 是各平台共享的唯一 Skill 内容源。

## 平台选择

| 平台 | 安装说明 |
|---|---|
| Claude Code | [Claude Code 使用说明](docs/README.claude.md) |
| OpenCode >=1.15.10 | [OpenCode 安装说明](docs/README.opencode.md) |
| Codex | [Codex 安装说明](docs/README.codex.md) |

## 能力概览

### Agents

| Agent | 说明 |
|------|------|
| `db-ops` | 数据库操作专家，负责 DDL、SQL、Entity、Mapper、Repository 和 SQL 审查 |
| `cc-ext-dev` | Claude Code 扩展开发专家，负责 Skill、Agent、Plugin、Hook、MCP Server 和 Workflow |
| `feature-dev` | 功能开发流水线，从已有 PRD 生成设计、计划、编码、审查和开发报告（审查环节委托 `code-review` Agent） |
| `superpowers-planner` | 设计和计划流水线，从原始需求生成设计规范和实施计划 |
| `code-review` | 全维度深度代码审查，独立子进程追踪调用链，覆盖 `code-reviewer` skill 的 7 维 + 代码样式 + 重大逻辑缺陷（N+1、事务、并发等） |

### Skills

| Skill | 说明 |
|------|------|
| `gen-pgsql-ddl` | 生成 PostgreSQL DDL，schema 需询问用户，授权角色需确认并默认使用项目固定角色 |
| `gen-java-entity` | 根据 DDL 或表结构生成 Entity、Mapper 或 Repository |
| `gen-java-enum` | 生成 `code` / `msg` 风格 Java 枚举 |
| `implement-from-design` | 根据设计文档和实施计划完成 Java 编码 |
| `code-reviewer` | 对 Java git diff 进行分层架构、数据库、安全、异常、测试等维度审查（内联快速检查；`code-review` Agent 是其超集） |
| `fix` | 按 TDD 流程定位、复现和修复缺陷 |
| `build-fix` | 检测 Maven / Gradle 构建错误并逐步修复 |
| `tdd` | 执行 Red-Green-Refactor 风格 Java TDD 工作流 |
| `add-javadoc` | 扫描并补充 Service 接口和实现类 JavaDoc |
| `write-a-skill` | 辅助创建结构清晰、可复用的 Agent Skill |

## 目录结构

```text
.claude-plugin/plugin.json
.codex-plugin/plugin.json
.opencode/
codex/agent-adapter.md
codex/marketplace.json
codex/skills/
agents/
skills/
AGENTS.md
CLAUDE.md
```

Codex 维护者参见 [开发与发布](docs/README.codex.md#开发与发布)，仓库开发规则见 [AGENTS.md](AGENTS.md)。
