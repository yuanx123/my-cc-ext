-- ----------------------------
-- <schema_name>.<table_name> <表注释>
-- 日期: <yyyy-MM-dd>
-- ----------------------------
CREATE TABLE IF NOT EXISTS <schema_name>.<table_name>
(
    id                    bigserial,
    -- 审计字段
    created_date          timestamp(6)  DEFAULT now(),
    created_by            varchar(50)   DEFAULT 'system',
    updated_date          timestamp(6)  DEFAULT now(),
    updated_by            varchar(50)   DEFAULT 'system',
    is_delete             int2          DEFAULT 0,
    -- 业务字段
    <业务列定义，名称 snake_case，三列对齐>,
    CONSTRAINT "<table_name>_pkey" PRIMARY KEY ("id")
);

-- 表注释
COMMENT ON TABLE <schema_name>.<table_name> IS '<表中文描述>';

-- 审计字段注释
COMMENT ON COLUMN <schema_name>.<table_name>."created_date" IS '创建时间';
COMMENT ON COLUMN <schema_name>.<table_name>."created_by"   IS '创建人';
COMMENT ON COLUMN <schema_name>.<table_name>."updated_date" IS '更新时间';
COMMENT ON COLUMN <schema_name>.<table_name>."updated_by"   IS '更新人';
COMMENT ON COLUMN <schema_name>.<table_name>."is_delete"    IS '删除标识（0-未删除，1-已删除）';

-- 业务字段注释
<COMMENT ON COLUMN ...每一列>;

-- 索引
CREATE INDEX IF NOT EXISTS idx_<table_name>_<列名> ON <schema_name>.<table_name> (<列名>);

-- 授权
-- <dml_role>
GRANT SELECT, UPDATE, DELETE, INSERT ON <schema_name>.<table_name> TO <dml_role>;
GRANT SELECT, UPDATE ON SEQUENCE <schema_name>.<table_name>_id_seq TO <dml_role>;

-- <qry_role>
GRANT SELECT ON <schema_name>.<table_name> TO <qry_role>;
GRANT SELECT ON SEQUENCE <schema_name>.<table_name>_id_seq TO <qry_role>;
