# EXAMPLES — DDL 范例

> 项目真实表示例见项目知识库，路径按 CLAUDE.md/AGENTS.md 或项目规则配置。

## 已有表新增/修改字段

```sql
-- ----------------------------
-- {schema}.{表名} 新增字段
-- ----------------------------
ALTER TABLE {schema}.{表名} ADD COLUMN IF NOT EXISTS {字段名} {类型} DEFAULT {默认值};
COMMENT ON COLUMN {schema}.{表名}."{字段名}" IS '{字段说明}';

ALTER TABLE {schema}.{表名} ALTER COLUMN {字段名} TYPE {新类型};
COMMENT ON COLUMN {schema}.{表名}."{字段名}" IS '{新注释}';
```

## 删除并重建（仅在明确确认后）

只有用户明确确认目标环境、表名以及允许丢弃现有数据时，才在 `CREATE TABLE` 前添加：

```sql
-- 重建确认: <环境> / <确认时间> / <确认人或确认来源>
DROP TABLE IF EXISTS {schema}.{表名};
```

## 列类型选型说明

| 列用途 | 类型 | 示例 |
|--------|------|------|
| 数据标识/编码 | `varchar(200)` | data_number |
| 短码 | `varchar(100)` | system_id |
| 名称 | `varchar(256)` | project_name |
| 格式化时间 | `varchar(20)` | data_date（yyyy-MM） |
| 计数 | `integer` | member_count |
| 金额/占比 | `numeric(22, 4)` | sales_amt |
| 固定值 | `varchar(50) DEFAULT '<值>'` | unit DEFAULT '人民币' |
| 长文本 | `text DEFAULT NULL` | attachment_list |
| 外键 | `varchar(200) DEFAULT NULL` | integrate_record_id |
| 时间戳 | `timestamp(6) DEFAULT now()` | created_date |

> 具体项目的 schema、授权角色、NOT NULL 策略按项目知识库约定填写。
