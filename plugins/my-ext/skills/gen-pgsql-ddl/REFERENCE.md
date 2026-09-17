# REFERENCE — 完整规则

## 生成前确认

| 项 | 规则 |
|----|------|
| schema | 必须询问用户目标 schema；SQL 中统一使用用户确认后的 schema |
| 操作模式 | 默认仅创建；删除并重建必须由用户明确确认目标环境和表名 |
| DML 授权角色 | 优先读取项目已有 DDL/配置；无法确定时询问用户；不需要授权时省略 |
| QRY 授权角色 | 优先读取项目已有 DDL/配置；无法确定时询问用户；不需要授权时省略 |
| 输出文件名 | `doc/features/<yyyy-MM>/<feature-name>/sql/<yyyy-MM-dd>-<业务>-init.sql`，业务名使用英文 kebab-case（`<yyyy-MM>` = 生成当天年月，`doc/features/` 下第一层目录，功能名目录在其下；目录不存在则创建） |

## 列定义

| 规则 | 说明 |
|------|------|
| 主键 | `id bigserial`，无 DEFAULT |
| 数据标识/编码 | `varchar(200)`（如 data_number、building_no） |
| 短码/项目编号 | `varchar(100)`（如 project_no、system_id） |
| 名称 | `varchar(256)`（如 project_name、block_name） |
| 格式化时间 | `varchar(20)`（如 data_date、fill_time，格式 yyyy-MM，非 timestamp） |
| 计数 | `integer`（如 member_count） |
| 金额/占比 | `numeric(22, 4)`（如 member_sales_amt、proportion_of_member） |
| 普通文本 | `varchar(200)` 或 `varchar(500)` |
| 固定值列 | `varchar(50) DEFAULT '<固定值>'`（如 unit DEFAULT '人民币'） |
| 长文本 | `text DEFAULT NULL`（如 JSON、内容字段） |
| 外键关联列 | `varchar(200) DEFAULT NULL`（如 integrate_record_id，COMMENT 注明关联表.列） |
| 时间戳 | `timestamp(6) DEFAULT now()` |
| 审计字段 | `created_date` → `created_by` → `updated_date` → `updated_by` → `is_delete` 固定顺序 |
| 删除标记 | `int2 DEFAULT 0` |
| 业务列约束 | 是否加 NOT NULL 按项目约定；PAIC 项目不加，校验由应用层负责 |
| 对齐 | 列名、类型、约束三列对齐（列名最长 28 字符 + 2 空格后接类型） |

## COMMENT

- 每列必须有 `COMMENT ON COLUMN <schema_name>.<table_name>."<column>" IS '...'`
- 审计字段使用固定注释文案：
  - `created_by` — `'创建人'`
  - `created_date` — `'创建时间'`
  - `updated_date` — `'更新时间'`
  - `updated_by` — `'更新人'`
  - `is_delete` — `'删除标识（0-未删除，1-已删除）'`
- 枚举/类型列在注释中标注可选值：`'报表类型(operator_balance_sheet/operator_profit_statement/operator_cash_flow)'`
- 外键关联列在注释中注明关联关系：`'关联 lmp_operator_import_record.data_number'`
- `COMMENT ON TABLE` 一行描述表用途
- 注释文案一律使用简体中文；schema、表名、列名等 SQL 标识符保持英文原文

## GRANT

授权角色必须来自项目现有约定或用户确认，不得使用与当前项目无关的硬编码默认值：

| 角色 | 表权限 | SEQUENCE 权限 |
|------|--------|---------------|
| `<dml_role>` | SELECT, UPDATE, DELETE, INSERT | SELECT, UPDATE |
| `<qry_role>` | SELECT | SELECT |

> ALTER TABLE 不需要重复 GRANT，权限已在建表时授予。

## 文件

- 存放路径：`doc/features/<yyyy-MM>/<feature-name>/sql/` 目录（`<yyyy-MM>` = 生成当天年月，`doc/features/` 下第一层目录；`<feature-name>` 为其下功能目录名；目录不存在则创建；不属于功能开发流程时向用户确认目标目录）
- 默认脚本从 `CREATE TABLE` 开始，不包含任何删除语句
- 仅在用户明确确认“删除并重建”后加入 `DROP TABLE IF EXISTS`，并在脚本头部记录目标环境和确认信息
- 文件名：`<yyyy-MM-dd>-<业务>-init.sql`

## 参考

- 建表和改表写法见 [EXAMPLES.md](EXAMPLES.md)
- 可复用骨架见 `template/create-table.sql` 和 `template/alter-table.sql`
