---
name: gen-pgsql-ddl
description: 生成安全的 PostgreSQL DDL。用于建表、改表、补充注释或授权；默认采用非破坏性创建，只有用户明确确认重建时才生成 DROP TABLE。
---

# PostgreSQL 建表 DDL 生成

## 文件结构

```
gen-pgsql-ddl/
├── SKILL.md           # 本文件（快速参考）
├── REFERENCE.md       # 列定义、COMMENT、GRANT 完整规则
├── EXAMPLES.md        # 实际 DDL 范例
└── template/          # SQL 模板（可直接复制）
    ├── create-table.sql
    └── alter-table.sql
```

## 快速开始

0. **加载项目知识库**：按 CLAUDE.md/AGENTS.md 中配置的知识库路径，加载数据库/建表相关规范文档
1. 收集用户的列定义（列名、类型、是否必填、注释）
2. 询问用户目标 schema；未提供时必须先确认，不默认写死
3. 确认操作模式；默认“仅创建”，只有用户明确确认目标环境并允许重建时才使用“删除并重建”
4. 从项目配置或已有 DDL 获取授权角色；无法确定时询问用户，用户不需要授权时省略 GRANT
5. 从 `template/` 复制对应模板
6. 按 REFERENCE.md 中的列定义规则替换 `<占位符>`
7. 输出到 `doc/features/<yyyy-MM>/<feature-name>/sql/` 目录（`<yyyy-MM>` 为生成当天所在年月（如 `2026-09`，`doc/features/` 下第一层目录），`<feature-name>` 为其下功能目录名；目录不存在则创建；不属于功能开发流程时向用户确认目标目录）

## 核心规则

### 生成前确认

- **schema**：必须询问用户目标 schema，并将 SQL 中所有 `<schema_name>` 替换为用户确认值
- **操作模式**：默认仅生成 `CREATE TABLE`。仅当用户明确确认“允许删除并重建”，并确认目标环境和表名后，才在脚本中加入 `DROP TABLE IF EXISTS`
- **授权角色**：优先复用项目已有 DDL 或配置中的角色；无法确定时必须询问用户，不得使用项目外的硬编码默认角色。用户明确不需要授权时，移除 GRANT 段落
- **业务名**：用于输出文件名，按英文 kebab-case 转换

### 列定义速查

| 列类型 | DDL 写法 | 示例列名 |
|--------|----------|----------|
| 主键 | `id bigserial` | `id` |
| 数据标识/编码 | `varchar(200)` | `data_number`、`building_no` |
| 短码/项目编号 | `varchar(100)` | `project_no`、`system_id` |
| 名称 | `varchar(256)` | `project_name`、`block_name` |
| 格式化时间 | `varchar(20)` | `data_date`（yyyy-MM）、`fill_time` |
| 计数 | `integer` | `member_count` |
| 金额/占比 | `numeric(22, 4)` | `member_sales_amt`、`proportion_of_member` |
| 普通文本 | `varchar(200)` 或 `varchar(500)` | `building_name` |
| 固定值列 | `varchar(50) DEFAULT '<固定值>'` | `unit DEFAULT '人民币'` |
| 长文本/JSON | `text DEFAULT NULL` | `attachment_list` |
| 外键关联列 | `varchar(200) DEFAULT NULL` | `integrate_record_id` |
| 时间戳 | `timestamp(6) DEFAULT now()` | `created_date`、`last_update_date` |
| 删除标记 | `int2 DEFAULT 0` | `is_delete` |

> 业务列是否加 NOT NULL 按项目约定；PAIC 项目不加 NOT NULL，校验由应用层负责。

审计字段固定顺序：`created_date` → `created_by` → `updated_date` → `updated_by` → `is_delete`

### 格式

- 列名 snake_case，最长 28 字符，列名/类型/约束三列对齐
- 每列必须有 `COMMENT ON COLUMN`
- `COMMENT ON TABLE` 一行描述表用途

### 权限

- `<dml_role>`：SELECT, UPDATE, DELETE, INSERT + SEQUENCE
- `<qry_role>`：SELECT + SEQUENCE
- 角色必须来自用户确认或项目现有约定；没有角色信息时不得猜测

### 文件

- 存放路径 `doc/features/<yyyy-MM>/<feature-name>/sql/`（`<yyyy-MM>` = 生成当天年月，`doc/features/` 下第一层目录，功能名目录在其下；目录不存在则创建），文件名 `<yyyy-MM-dd>-<业务>-init.sql`
- 默认建表脚本不得包含 `DROP TABLE`、`TRUNCATE` 等破坏性语句
- 重建模式必须在脚本头部标注目标环境和用户确认结果
- ALTER TABLE 不需要重复 GRANT
- 产出 DDL 脚本的注释（`COMMENT ON TABLE/COLUMN` 文案等）一律使用简体中文；schema、表名、列名等 SQL 标识符保持英文原文

> 完整规则见 [REFERENCE.md](REFERENCE.md)，实际范例见 [EXAMPLES.md](EXAMPLES.md)
