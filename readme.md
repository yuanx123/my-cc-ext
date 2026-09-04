# my-ext

Java 开发全流程 Agent 和 Skill 工具集，支持 Claude Code 与 OpenCode。根 `skills/` 是两端共享的唯一 Skill 内容源。

## 平台选择

| 平台 | 安装说明 |
|---|---|
| Claude Code | 保留下方 Marketplace 和本地插件安装流程 |
| OpenCode >=1.15.10 | [OpenCode 安装说明](docs/README.opencode.md) |

## OpenCode 用户级安装

### 1. 检查环境

```powershell
opencode --version
node --version
```

要求 OpenCode >=1.15.10、Node.js >=20.11。

### 2. 打开用户级配置

- Windows：`%USERPROFILE%\.config\opencode\opencode.json`
- Linux / macOS：`~/.config/opencode/opencode.json`

文件不存在时可以新建。如果已有配置，只追加 `plugin` 字段或数组项，不要覆盖其他配置：

```json
{
  "plugin": [
    "my-ext@git+https://github.com/huhuhu-999/my-cc-ext.git#v1.0.24"
  ]
}
```

必须使用包含 OpenCode 支持的固定发布标签或完整 40 位 commit，不要使用默认分支。当前开发分支尚未发布时，只能在本仓库根目录启动 `opencode` 进行本地测试，不能通过上面的远程引用完成用户级安装。

### 3. 重启并验证

完全退出并重新启动 OpenCode，然后执行：

```powershell
opencode debug config
```

解析后的配置应包含：

- 指向插件包 `skills/` 的 `skills.paths`。
- 指向 `.opencode/bootstrap.md` 的 `instructions`。
- `my-ext-db-ops`、`my-ext-feature-dev`、`my-ext-fix`、`my-ext-code-review`、`my-ext-superpowers-planner` 和 `my-ext-opencode-ext-dev` 这 6 个 Agent。

安装后可以在 OpenCode 对话中使用 `@my-ext-feature-dev`、`@my-ext-db-ops` 等名称调用 Agent；共享 Skill 会由模型根据任务自动加载。

升级、卸载、Windows 注意事项和 npm 兜底方式见 [完整 OpenCode 安装说明](docs/README.opencode.md)。

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

## Claude Code 安装插件

```bash
/plugin marketplace add https://github.com/huhuhu-999/my-cc-ext.git
/plugin install my-ext@my-cc-ext
claude plugins enable my-ext
```

## Claude Code 卸载插件

```bash
/plugin uninstall my-ext@my-cc-ext
```

## Claude Code 本地开发安装

在仓库根目录执行：

```bash
claude plugins install .
claude plugins enable my-ext
```

## 目录结构

```text
.claude-plugin/plugin.json
agents/
skills/
CLAUDE.md
```

更多说明见 `CLAUDE.md`。
