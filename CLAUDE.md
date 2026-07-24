# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

跨平台公共规则见 `AGENTS.md`。本文件只补充 Claude Code 的插件安装、注册名称和自动路由约定；冲突时以更具体的项目规则为准。

## 仓库定位

这是一个 Claude Code 插件仓库，提供数据库操作、代码审查、缺陷修复、功能开发流水线、设计规划和 Claude Code 扩展开发等 Agent 和 Skill。

## 目录结构

```
.claude-plugin/plugin.json              # 插件元数据（名称、版本、描述）
agents/db-ops/AGENT.md                  # Agent: 数据库操作专家
agents/cc-ext-dev/AGENT.md              # Agent: Claude Code 扩展开发专家
agents/feature-dev/AGENT.md             # Agent: 功能开发流水线编排
agents/superpowers-planner/AGENT.md     # Agent: 设计+计划流水线
agents/fix/AGENT.md                    # Agent: 缺陷修复流水线编排
agents/cleanup-node/AGENT.md             # Agent: node 僵尸进程清理
skills/gen-pgsql-ddl/                       # Skill: PostgreSQL DDL 生成
skills/gen-pgsql-ddl/SKILL.md              #   主指令（快速参考）
skills/gen-pgsql-ddl/REFERENCE.md          #   列定义、COMMENT、GRANT 完整规则
skills/gen-pgsql-ddl/EXAMPLES.md           #   实际 DDL 范例
skills/gen-pgsql-ddl/template/             #   SQL 模板（create-table.sql / alter-table.sql）
skills/gen-java-enum/SKILL.md           # Skill: Java 枚举生成
skills/code-reviewer/SKILL.md           # Skill: Java 代码审查
skills/implement-from-design/SKILL.md   # Skill: 按设计文档编码
skills/fix/SKILL.md                     # Skill: 系统化缺陷修复
skills/add-javadoc/SKILL.md              # Skill: JavaDoc 文档注释补充
skills/gen-java-entity/SKILL.md          # Skill: Java Entity + Mapper 生成
skills/write-a-skill/SKILL.md            # Skill: 编写 Agent Skill
skills/build-fix/SKILL.md                # Skill: Java 构建错误修复
skills/tdd/SKILL.md                      # Skill: Java TDD 工作流
```

- **Agent** (`agents/<name>/AGENT.md`): 带 YAML frontmatter 定义工具集、模型、权限模式；正文为系统提示词
- **Skill** (`skills/<name>/SKILL.md`): 带 YAML frontmatter 定义名称和触发时机；正文为模板和规则
- `plugin.json` 的 `name` 作为插件标识，安装后：
  - **Skill**: 以 `plugin-name:skill-name` 形式注册（如 `my-ext:code-reviewer`）
  - **Agent**: 以 `plugin-name:dir-name:frontmatter-name` 形式注册（如 `my-ext:cc-ext-dev:cc-ext-dev`）

## 插件安装

```bash
claude plugins install .
claude plugins enable my-ext
```

## 插件卸载

```bash
claude plugins uninstall my-ext
```

## 现有扩展

### Agent: db-ops

数据库操作专家。技术探查驱动，适配 PostgreSQL/MySQL 及 MyBatis-Plus/MyBatis/JPA 等多种框架。核心能力：

- **DDL 生成** — 若项目存在 `gen-pgsql-ddl` skill 则优先委托，否则手动生成
- **Entity + Mapper 编写** — 若项目存在 `gen-java-entity` skill 则优先委托，否则参考现有代码风格手动生成
- **SQL 审查** — 输出 CRITICAL/WARNING/INFO 三级报告
- **安全约束** — 强制参数化、禁止 `${}` 拼接变量值、IN 子句上限 1000
- **性能约束** — 避免 N+1、大表必须有 WHERE+分页、批量操作用批处理

详细提示词见 `agents/db-ops/AGENT.md`。

### Skill: gen-pgsql-ddl

PostgreSQL DDL 生成模板。关键约定：

- 主键 `id bigserial`（无 DEFAULT）; 审计字段顺序固定; 删除标记 `int2 DEFAULT 0`
- 列名最长 28 字符，列名/类型/约束三列对齐
- 每列 + 表必须有 COMMENT
- schema 必须询问用户，不默认写死
- 授权角色优先读取项目现有约定，无法确定时询问用户，不使用跨项目硬编码默认角色
- 默认生成非破坏性建表脚本；只有用户明确确认重建目标环境和表名时才加入 `DROP TABLE IF EXISTS`
- 输出到 `tmp/` 目录，文件名 `<yyyyMMdd>_<业务>_init.sql`

详细模板见 `skills/gen-pgsql-ddl/SKILL.md`。

### Agent: cc-ext-dev

Claude Code 扩展开发专家。覆盖 Claude Code 全部扩展机制：Skill、Agent、Plugin、Hook、MCP Server、Workflow、Keybinding。核心能力：

- **统一探查流程** — 先读目标仓库 CLAUDE.md 和现有扩展，确保风格一致
- **Skill 开发** — YAML frontmatter + 模板/规则正文，description 决定触发时机
- **Agent 开发** — 工具选择、权限模式、工作流设计
- **Plugin 打包** — plugin.json 元数据，本地安装与调试
- **Hook 开发** — 7 种事件（PreToolUse、PostToolUse、Stop 等）+ command 类型
- **MCP Server 集成** — stdio/SSE/Streamable HTTP 三种传输方式配置
- **Workflow 开发** — agent/parallel/pipeline/phase API 及常见编排模式

详细规范见 `agents/cc-ext-dev/AGENT.md`。

### Agent: feature-dev

功能开发流水线编排者。从已有 PRD 出发，串联 **设计文档（Spec） → 实施计划（Plan） → 开发目录确认 → implement-from-design 编码 → code-reviewer 审查 → 修复 CRITICAL → 开发报告** 的完整流程。文档统一输出到 `doc/features/<feature-name>/`，一次只推进一个 `sub-feature`，并通过 `.feature-dev-state.md` 状态文件支持跨会话恢复。

与 `superpowers-planner` 的区别：`feature-dev` 从**已有 PRD** 出发，不需要头脑风暴；`superpowers-planner` 从**原始需求**出发，包含头脑风暴和方案对比。

详细流程见 `agents/feature-dev/AGENT.md`。

### Agent: superpowers-planner

设计+计划流水线。从**原始需求**出发，三阶段：**头脑风暴（需求澄清 + 方案对比）→ 设计规范 Spec → 实施计划 Plan**（含 TDD 任务拆分、波次规划、依赖矩阵）。输出到 `doc/features/<feature-name>/`（与 `feature-dev` 共用目录），一次只规划一个 `sub-feature`。

与 `feature-dev` 的区别：`superpowers-planner` 适合需求不明确、需要方案对比的场景；`feature-dev` 适合已有 PRD、直接进入设计+计划的场景。

详细流程见 `agents/superpowers-planner/AGENT.md`。

### Agent: fix

缺陷修复流水线编排者。从 Bug 报告/错误日志出发，串联 **问题理解 → 根因定位 → 复现测试 → 代码修复 → 审查验证 → 修复报告** 的完整流程。跨模块深度排查，TDD 驱动修复，分阶段用户确认，支持跨会话恢复。

与 `fix` skill 的区别：`fix` skill 是内联轻量修复，适合单文件、根因明确的简单缺陷；`fix` Agent 从复杂 Bug 报告出发，做深度跨模块排查，分阶段执行并支持状态恢复。

详细流程见 `agents/fix/AGENT.md`。

### Agent: cleanup-node

node 僵尸进程清理专家。针对 Windows 上 Claude Code 通过 `npx -y` 启动 MCP Server 子进程、关闭终端后残留的问题。核心能力：

- **进程探查** — 通过 PowerShell `Get-CimInstance` 获取所有 node 进程的 PID、启动时间、内存占用、完整命令行
- **智能分类** — 按命令行特征自动分类：当前会话 MCP（保留）、僵尸 MCP（清理）、ACP daemon（默认保留）、opencode 工具（默认保留）、其他 node 应用（默认保留）
- **安全清理** — 先展示分类汇总和明细表格，用户确认后才执行 `Stop-Process`，禁止一刀切杀进程
- **内存释放报告** — 清理前后对比，输出进程数和内存占用的变化

详细流程见 `agents/cleanup-node/AGENT.md`。

### Skill: gen-java-enum

Java `code ↔ msg` 枚举生成模板。自动探测项目包路径，生成含 `getCodeByMsg`/`getMsgByCode` 双向查找的枚举类。

详细模板见 `skills/gen-java-enum/SKILL.md`。

### Skill: gen-java-entity

根据 DDL 或表结构生成 Java Entity + Mapper/Repository。自动适配项目 ORM 框架（MyBatis-Plus / MyBatis / JPA）和包路径。关键约定：

- **前置探查** — 先通过 CLAUDE.md、`pom.xml`/`build.gradle`、现有注解确认 ORM 框架，再通过 Glob 已有文件动态确定包路径
- **MyBatis-Plus** — Entity 用 `@TableName` + `@TableId`，Mapper 继承 `BaseMapper<Entity>`，无需 XML
- **MyBatis** — Entity 纯 POJO，Mapper 接口声明 CRUD + 同名 XML 包含 `resultMap`/`sql` 片段
- **JPA/Hibernate** — Entity 用 `@Entity` + `@Table` + `@Getter`（不暴露 setter），Repository 继承 `JpaRepository` + `JpaSpecificationExecutor`
- **统一规范** — 审计字段齐全、`LocalDateTime` 不用 `Date`、逻辑删除用 `UPDATE SET is_delete = 1`、禁止 `SELECT *`

详细模板见 `skills/gen-java-entity/SKILL.md`。

### Skill: code-reviewer

Java 代码审查。对 git diff 变更进行 7 维审查（分层架构、JPA/DB、异常处理、安全、代码质量、测试、日志），输出 CRITICAL/WARNING/INFO 三级报告。

详细规则见 `skills/code-reviewer/SKILL.md`。

### Skill: implement-from-design

按设计文档编码。遵循分层架构和编码规范，自底向上实现：枚举/常量 → DTO → Entity → Mapper → Service → Controller → 测试。

详细流程见 `skills/implement-from-design/SKILL.md`。

### Skill: fix

系统化缺陷修复。TDD 驱动：定位根因 → 复现测试(RED) → 最小修复(GREEN) → 验证 + code-reviewer 审查 → 修复报告。

详细流程见 `skills/fix/SKILL.md`。

### Skill: add-javadoc

为 Service 接口和实现类补充 JavaDoc 文档注释。自动扫描未注释方法，生成符合项目风格的中文 JavaDoc（`@param`、`@return`、`@throws`）。

详细模板见 `skills/add-javadoc/SKILL.md`。

### Skill: write-a-skill

创建结构良好、渐进式披露的 Agent Skill。引导用户收集需求、编写 YAML frontmatter + 模板/规则正文。

详细流程见 `skills/write-a-skill/SKILL.md`。

### Skill: build-fix（ECC 风格命令）

Java 构建错误修复命令。6 Phase 流程：Detect 检测构建系统 → Build 首次构建 → Parse 错误分组解析 → Fix Loop 逐个修复 → Guardrails 护栏 → Summary 报告。在当前会话内联执行，不委托 Agent。

详细流程见 `skills/build-fix/SKILL.md`。

### Skill: tdd（ECC 风格命令）

Java TDD 工作流命令。5 Phase 流程：Detect 探测测试基础设施 → RED 编写失败测试 → GREEN 最小实现 → REFACTOR 重构 → Coverage 覆盖率门禁（≥80%）。在当前会话内联执行，覆盖正常路径/null/异常/边界值 4 种测试场景。

详细流程见 `skills/tdd/SKILL.md`。

## 架构概览

```
用户输入
  ↓ 自动匹配 description 关键词
Skill（内联执行）
  ├── 代码生成：gen-pgsql-ddl / gen-java-entity / gen-java-enum
  ├── 质量保障：code-reviewer / fix / build-fix / tdd / add-javadoc
  ├── 流程编排：implement-from-design / write-a-skill
  └── 所有 Skill 在当前会话直接执行，多 Phase + bash + 护栏

用户输入
  ↓ 主会话自动判断 + Agent 工具委托
Agent（独立子进程）
  ├── db-ops：数据库操作（探查 → 委托 Skill / 手动生成）
  ├── cc-ext-dev：扩展开发（探查 → 生成 Skill/Agent/Plugin）
  ├── feature-dev：功能开发流水线（PRD → Spec → Plan → 编码→审查→修复）
  ├── fix：缺陷修复流水线（Bug 报告 → 根因定位 → 复现→修复→审查→报告）
  ├── superpowers-planner：设计规划（头脑风暴→Spec→Plan）
  └── cleanup-node：node 僵尸进程清理（探查→分类→确认→清理→报告）
```

- **Skill（10 个）**：内联执行，自动触发，覆盖代码生成、质量保障、流程编排
- **Agent（6 个）**：独立子进程，根据用户输入自动匹配委托，探查项目上下文后执行复杂多步骤任务

## Agent 自动路由

**重要：主会话根据用户输入自动判断并委托给合适的 Agent，用户无需手动指定。**

| 用户意图 | 自动委托 Agent | 触发关键词 |
|---------|---------------|-----------|
| 扩展开发（写/改 Skill、Agent、Plugin、MCP、Hook、Workflow） | `my-ext:cc-ext-dev:cc-ext-dev` | 写skill、创建agent、开发插件、MCP、Hook、扩展 |
| 数据库操作（DDL建表、DML查询、Entity/Mapper生成、SQL审查） | `my-ext:db-ops:db-ops` | 建表、DDL、SQL、Entity、Mapper、数据库、查询 |
| 功能开发流水线（已有 PRD → 设计→计划→编码→审查） | `my-ext:feature-dev:feature-dev` | 开发功能、实现需求、按PRD开发 |
| 复杂缺陷修复（跨模块排查、根因不明） | `my-ext:fix:fix` | 排查bug、复杂bug、深入看一下、跨模块 |
| 设计规划（原始需求→头脑风暴→方案对比→计划） | `my-ext:superpowers-planner:superpowers-planner` | 设计方案、规划、头脑风暴、需求分析 |
| node 僵尸进程清理（Windows 上 Claude Code 残留 node 进程清理、内存释放） | `my-ext:cleanup-node:cleanup-node` | 清理node、cleanup node、kill mcp、清理进程、node zombie、kill zombie、内存占用高 |

**判断标准**：
- 用户请求涉及**多步骤、跨文件、需要独立上下文**的复杂任务 → 自动使用 `Agent` 工具委托
- 简单单步任务（读文件、问问题、小修改、单文件编辑）→ 直接处理，不委托
- 不确定时优先委托 — Agent 有独立上下文，执行更专注

**委托时必须提示**：调用 Agent 工具前，先输出一行提示告知用户命中了哪个 Agent，格式：
> 🎯 已匹配 Agent `my-ext:xxx:xxx`，正在委托...

## 注意事项

- Skill 通过 `description` 关键词自动匹配用户输入，无需显式调用
- Agent 由主会话根据上表自动判断并委托，用户无需手动 `@` 指定（当然手动指定仍然有效）
- Agent 可通过工具列表中的 `Skill` 工具调用项目内已安装的 Skill（如 `db-ops` → `gen-pgsql-ddl`）
- `plugin.json` 中的 `name` 字段即安装后的插件标识，变更需同步调整引用
- 修改 `plugin.json` 版本号时，**必须同步更新** `.claude-plugin/marketplace.json` 中 `plugins[0].version` 为相同版本号
