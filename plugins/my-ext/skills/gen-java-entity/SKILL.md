---
name: gen-java-entity
description: 当需要根据建表 DDL 或表结构生成对应的 Java Entity 和 Mapper/Repository 时使用。自动适配项目 ORM 框架（MyBatis-Plus / MyBatis / JPA），动态确定包路径，禁止写死。
---

# Java Entity + Mapper 生成

## 适用场景

- 新表建好 DDL 后，需要生成对应的 Java Entity 实体类
- 已有表需要补充或重构 Mapper/Repository 接口
- 用户说"生成实体"、"创建 Entity"、"加个 Mapper"、"写 Repository"

## 前置步骤：ORM 框架探查

生成前必须确认项目使用的 ORM 框架，按优先级：

1. 读取项目 `AGENTS.md`，若存在平台专用规则文件则继续读取，确认其中声明的 ORM 框架
2. 检查 `pom.xml` 或 `build.gradle` 中的依赖：
   - `mybatis-plus-boot-starter` → MyBatis-Plus
   - `mybatis-spring-boot-starter` → MyBatis
   - `spring-boot-starter-data-jpa` → JPA / Hibernate
3. 扫描现有 Entity 类的注解：
   - `@TableName` → MyBatis-Plus
   - `@Entity` + `@Table` → JPA
   - 仅 Lombok 注解无 ORM 注解 → 原生 MyBatis 或 JdbcTemplate

### 包路径探测

通过文件模式搜索现有 Entity 和 Mapper 文件，动态确定包路径：

```
# 搜索 Entity
**/entity/**/*Entity.java
**/domain/**/*Entity.java
**/model/**/*Entity.java
**/pojo/**/*Entity.java

# 搜索 Mapper
**/mapper/**/*Mapper.java
**/repository/**/*Repository.java
**/dao/**/*Dao.java
```

新增文件放在已有文件同级目录，包路径与现有文件一致。

---

## 模板

根据探查到的 ORM 框架，选择对应模板。所有包路径和类名按实际情况动态替换，禁止写死。

### 1. MyBatis-Plus 项目

#### Entity

```java
package <动态确定的 entity 包路径>;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * <表中文描述> 实体
 *
 * @author <作者>
 * @since <yyyy-MM-dd>
 */
@Data
@TableName("<table_name>")
public class <EntityName>Entity implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;

    <业务字段，camelCase 命名，@TableField("<snake_case 列名>")>

    @TableField("created_date")
    private LocalDateTime createdDate;

    @TableField("created_by")
    private String createdBy;

    @TableField("updated_date")
    private LocalDateTime updatedDate;

    @TableField("updated_by")
    private String updatedBy;

    @TableField("is_delete")
    private Integer isDelete;
}
```

#### Mapper 接口

```java
package <动态确定的 mapper 包路径>;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * <表中文描述> Mapper
 *
 * @author <作者>
 * @since <yyyy-MM-dd>
 */
@Mapper
public interface <EntityName>Mapper extends BaseMapper<<EntityName>Entity> {
}
```

#### Service 接口

```java
package <动态确定的 service 包路径>;

/**
 * <表中文描述> Service
 *
 * @author <作者>
 * @since <yyyy-MM-dd>
 */
public interface <EntityName>Service {
}
```

#### Service 实现

```java
package <动态确定的 service 包路径>.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * <表中文描述> Service 实现
 *
 * @author <作者>
 * @since <yyyy-MM-dd>
 */
@Slf4j
@Service
public class <EntityName>ServiceImpl extends ServiceImpl<<EntityName>Mapper, <EntityName>Entity>
        implements <EntityName>Service {
}
```

### 2. MyBatis 项目

#### Entity

```java
package <动态确定的 entity 包路径>;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * <表中文描述> 实体
 *
 * @author <作者>
 * @since <yyyy-MM-dd>
 */
@Data
public class <EntityName>Entity implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;

    <业务字段，camelCase 命名>

    private LocalDateTime createdDate;

    private String createdBy;

    private LocalDateTime updatedDate;

    private String updatedBy;

    private Integer isDelete;
}
```

#### Mapper 接口

```java
package <动态确定的 mapper 包路径>;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * <表中文描述> Mapper
 *
 * @author <作者>
 * @since <yyyy-MM-dd>
 */
@Mapper
public interface <EntityName>Mapper {

    <EntityName>Entity selectById(@Param("id") Long id);

    int insert(<EntityName>Entity entity);

    int updateById(<EntityName>Entity entity);

    int deleteById(@Param("id") Long id);

    List<<EntityName>Entity> selectByCondition(<EntityName>Query query);
}
```

#### Mapper XML（与 Mapper 接口同目录，同名 `.xml`）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="<Mapper 接口全限定名>">

    <resultMap id="BaseResultMap" type="<Entity 全限定名>">
        <id column="id" property="id"/>
        <result column="<snake_case>" property="<camelCase>"/>
        <!-- 审计字段 -->
        <result column="created_date" property="createdDate"/>
        <result column="created_by" property="createdBy"/>
        <result column="updated_date" property="updatedDate"/>
        <result column="updated_by" property="updatedBy"/>
        <result column="is_delete" property="isDelete"/>
    </resultMap>

    <sql id="Base_Column_List">
        id, <业务列>, created_date, created_by, updated_date, updated_by, is_delete
    </sql>

    <select id="selectById" resultMap="BaseResultMap">
        SELECT <include refid="Base_Column_List"/>
        FROM <table_name>
        WHERE id = #{id}
    </select>

    <insert id="insert" parameterType="<Entity 全限定名>" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO <table_name> (<列名列表>, created_date, created_by, updated_date, updated_by, is_delete)
        VALUES (<#{} 占位符列表>, now(), #{createdBy}, now(), #{updatedBy}, 0)
    </insert>

    <update id="updateById" parameterType="<Entity 全限定名>">
        UPDATE <table_name>
        <set>
            <SET 子句，每列 if test 判断非空>,
            updated_date = now(),
            updated_by = #{updatedBy},
        </set>
        WHERE id = #{id}
    </update>

    <update id="deleteById">
        UPDATE <table_name>
        SET is_delete = 1,
            updated_date = now(),
            updated_by = #{updatedBy}
        WHERE id = #{id}
    </update>
</mapper>
```

### 3. JPA / Hibernate 项目

> **注意**：Spring Boot 3.x 使用 `jakarta.persistence.*`，Spring Boot 2.x 使用 `javax.persistence.*`。按项目实际依赖确定，以下模板以 3.x 为例。

#### Entity

```java
package <动态确定的 entity 包路径>;

import lombok.Getter;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * <表中文描述> 实体
 *
 * @author <作者>
 * @since <yyyy-MM-dd>
 */
@Getter
@Entity
@Table(name = "<table_name>")
public class <EntityName>Entity implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    <业务字段，camelCase 命名，
      @Column(name = "<snake_case 列名>") 仅在字段名 ≠ 列名时使用>

    @Column(name = "created_date")
    private LocalDateTime createdDate;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_date")
    private LocalDateTime updatedDate;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "is_delete")
    private Integer isDelete;

    // 业务方法修改字段，不暴露 setter
    public void updateXxx(final String newValue) {
        this.xxx = newValue;
    }
}
```

#### Repository 接口

```java
package <动态确定的 repository 包路径>;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * <表中文描述> Repository
 *
 * @author <作者>
 * @since <yyyy-MM-dd>
 */
@Repository
public interface <EntityName>Repository extends JpaRepository<<EntityName>Entity, Long>,
        JpaSpecificationExecutor<<EntityName>Entity> {
}
```

---

## 规则

生成代码前先读取当前项目的 `AGENTS.md` 和平台专用规则，再检查同模块现有代码，确认行宽、链式调用、注解和格式习惯。

### 命名映射

| DDL 列名 (snake_case) | Java 字段名 (camelCase) |
|-----------------------|------------------------|
| `id` | `id` |
| `created_date` | `createdDate` |
| `created_by` | `createdBy` |
| `updated_date` | `updatedDate` |
| `updated_by` | `updatedBy` |
| `is_delete` | `isDelete` |
| `<business_column>` | 按 snake → camel 转换 |

### Entity 规范

- 类名：`<TableName>Entity`（单表名转 PascalCase + Entity 后缀）
- 实现 `Serializable`，显式声明 `serialVersionUID = 1L`
- 审计字段齐全：`createdDate`, `createdBy`, `updatedDate`, `updatedBy`, `isDelete`
- 时间字段用 `LocalDateTime`，不用 `Date`
- 禁止使用 `@Data` + `@AllArgsConstructor` 组合（会被序列化框架利用）
- 包路径通过搜索已有 Entity 动态确定，不写死

### Mapper 接口规范

- MyBatis-Plus：继承 `BaseMapper<Entity>`，自带 CRUD，无须写 XML
- MyBatis：声明基本 CRUD 方法，复杂查询在 XML 中实现
- JPA：继承 `JpaRepository<Entity, Long>` + `JpaSpecificationExecutor<Entity>`
- 包路径通过搜索已有 Mapper/Repository 动态确定，不写死

### Mapper XML 规范（仅 MyBatis 项目）

- 与 Mapper 接口同包路径，同名 `.xml`
- 禁止 `${}` 拼接变量值，统一使用 `#{}` 参数化
- 逻辑删除用 `UPDATE SET is_delete = 1`，不用物理 `DELETE`
- 显式列出字段，禁止 `SELECT *`
- `<sql>` 片段和 `<resultMap>` 定义完整的列映射

### Lombok

- 如果项目使用 Lombok：
  - MyBatis-Plus / MyBatis：Entity 用 `@Data`
  - JPA：Entity 用 `@Getter`（不暴露 setter）
- 如果项目不使用 Lombok：手写 getter/setter，日志用 `LoggerFactory.getLogger()`

### 输出路径

- Entity → `<entity 包路径>/<EntityName>Entity.java`
- Mapper 接口 → `<mapper 包路径>/<EntityName>Mapper.java`
- Mapper XML → `<mapper 包路径>/<EntityName>Mapper.xml`（仅 MyBatis 项目）
- JPA Repository → `<repository 包路径>/<EntityName>Repository.java`

### 约束（禁止事项）

- 禁止修改已有 Entity 的字段名和类型，除非用户显式要求
- 禁止删除已有字段，新增字段应在末尾追加
- 禁止引入项目未使用的 Lombok 注解（如项目不用 `@Builder`，则不生成）
- 禁止引入项目未使用的 ORM 框架依赖
- 禁止在 Entity 中硬编码数据库连接信息、密码、Token
- 不确定字段类型/长度时，保留占位符并询问用户，不要猜测
