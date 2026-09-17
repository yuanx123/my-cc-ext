---
name: code-reviewer
description: 对 Java 代码进行代码审查。检查分层架构、JPA/MyBatis 使用、异常处理、安全性、代码质量和测试覆盖。当用户说"review""审查""code review"或提交前需要检查代码质量时使用。
---

# Java Code Reviewer

对 Java 项目的 git diff 变更进行多维度审查。在当前会话内联执行。

## Phase 1 — GATHER（收集变更 + 探测技术栈）

### 1.1 获取变更

```bash
git diff --name-only HEAD
git diff --stat HEAD
git rev-parse --abbrev-ref HEAD
```

如果 `git diff HEAD` 为空，检查 staged：

```bash
git diff --cached --name-only
```

如仍为空，终止并输出："没有待审查的变更。"

### 1.2 探测技术栈

审查前必须了解项目上下文，避免用不匹配的约定误报：

1. 用文件读取工具读取根目录和相关模块的 `AGENTS.md`，若存在平台专用规则文件则继续读取。
2. 递归搜索 `**/pom.xml`、`**/build.gradle`、`**/build.gradle.kts`，排除构建输出目录。
3. 在所有构建文件中搜索 `lombok`、`mybatis-plus`、`mybatis-spring`、`spring-boot-starter-data-jpa`。
4. 根据变更文件所属模块分别判定技术栈，不能只读取仓库根目录构建文件。

> **核心原则**：项目规则 > 依赖探测 > 通用规则。审查结论应与项目实际技术栈一致。

---

## Phase 2 — REVIEW（逐文件审查）

### 2.1 分层架构（CRITICAL）

搜索所有模块的 `**/src/main/**/*Controller.java`，再检查 `Mapper` / `Repository` 引用；只报告本次 diff 涉及的文件和调用链。

- Controller/Resource 层不应直接访问 DAO/Repository/Mapper，必须经过 Service
- DTO/VO 不应出现在数据访问层中（不要用 DTO 直接做持久化）
- Entity/Model 不应直接暴露到 Controller 层，应使用 DTO/VO 转换
- API/接口模块只放接口定义和传输对象，不放业务实现
- 避免循环依赖：Service 之间单向依赖，必要时抽公共逻辑到独立模块

### 2.2 ORM / 数据库（CRITICAL）

搜索所有模块的 `**/src/main/**/*.xml`，再搜索 `${`；结合参数来源和白名单校验判断是否存在注入风险。

**通用规则：**
- SQL 参数必须使用参数化查询或 ORM 提供的绑定方式，禁止字符串拼接用户输入
- 批量操作必须分页或限制 IN 子句大小（≤ 1000），防止 OOM
- 注意 N+1 查询：关联查询优先使用 JOIN / fetch / 批量加载，避免循环内查库

**JPA/Hibernate（如项目使用）：**
- Entity 类必须标注 `@Entity` 和 `@Table`
- 主键使用 `@Id` + `@GeneratedValue`
- `@OneToMany`/`@ManyToOne` 默认 `FetchType.LAZY`，按需用 `JOIN FETCH` 或 `@EntityGraph`
- 避免在 `@PostLoad` 等生命周期方法中执行复杂逻辑

**MyBatis/MyBatis-Plus（如项目使用）：**
- Mapper XML 中禁止 `${}` 拼接用户输入值（仅可用于动态表名/列名且必须白名单校验）
- 批量操作使用 `<foreach>` 分页或分批处理
- 注意 MyBatis-Plus `LambdaQueryWrapper` 优于字符串字段名

### 2.3 异常处理（CRITICAL）

在所有模块的 `**/src/main/**/*.java` 中搜索 `catch`，读取相邻代码确认是否为空块。不要仅依赖单行正则作结论。

- 不允许空 catch 块 — 至少记录日志或添加注释说明忽略原因
- 不允许 `printStackTrace()`，必须使用日志框架记录
- 业务异常应使用项目定义的业务异常类（而非裸 `RuntimeException`），包含错误码和可读消息
- Controller 层应有统一的异常处理机制（`@ControllerAdvice` / `ExceptionHandler`）
- 资源释放使用 try-with-resources 或 finally 块，避免连接泄漏

### 2.4 安全性（HIGH）

在所有模块的 Java 和配置文件中搜索 `password`、`secret`、`token`、`apikey`、`api_key`，读取命中上下文，区分真实凭据、变量名和示例占位符。

- 不允许硬编码密钥、Token、密码、连接串（应从配置/环境变量/密钥管理服务获取）
- 外部输入（请求参数、文件上传、Header）必须校验（`@Valid`/`@Validated`、参数断言）
- 日志中不得打印敏感信息（密码、手机号、身份证号、银行卡号、Token）
- 敏感数据在内存中使用 `char[]` 而非 `String`（可选，按项目安全等级）
- SQL WHERE 条件中的动态列名/排序字段必须做白名单校验

### 2.5 代码质量（HIGH）

- 方法 ≤ 50 行，类 ≤ 800 行（核心逻辑超出时拆分为多个私有方法或独立类）
- 嵌套层次 ≤ 4 层，使用 early return / guard clause 减少嵌套
- 消除魔法数字和魔法字符串，使用命名常量或枚举
- 变量和参数尽量不可变（`final` 关键字，或使用不可变类）
- 方法参数 ≤ 5 个，超过时封装为参数对象
- 集合/数组返回空集合而非 `null`（`Collections.emptyList()`）
- `Optional` 不用作参数或字段，只用返回值表示"可能为空"

**Lombok（如项目使用）：**
- Entity/DTO 使用 `@Getter`/`@Setter`/`@Data`，不手写 getter/setter
- 日志使用 `@Slf4j`，不手写 Logger 声明
- 依赖注入使用构造器注入 + `@RequiredArgsConstructor`，避免 `@Autowired` 字段注入

**无 Lombok（如项目不使用）：**
- 使用 IDE 生成或手写 getter/setter，保持一致性
- 日志声明：`private static final Logger log = LoggerFactory.getLogger(Xxx.class);`
- 依赖注入优先构造器注入（`final` 字段 + 构造器），避免字段注入

### 2.6 测试（MEDIUM）

- 新增 Service/Component 的 public 方法应有对应单元测试
- 测试命名清晰描述行为：`shouldXxxWhenYyy` 或 `testXxxGivenYyy`
- 一个测试方法只验证一个行为，避免多个 `assert` 无关联
- 测试不依赖外部环境（数据库、网络、文件系统），使用 Mock/Stub
- 测试应包含边界条件（null、空集合、异常输入）

### 2.7 日志（MEDIUM）

- 关键分支记录日志：参数校验失败、异常捕获、远程调用、业务状态变更
- 日志级别正确：
  - `error`：需要人工介入的异常
  - `warn`：可自动恢复的异常、降级逻辑
  - `info`：业务关键节点（订单状态变更、任务完成）
  - `debug`：方法入参/出参、调试细节
- 日志信息包含足够上下文（如订单 ID、用户 ID），但不过量

---

## Phase 3 — REPORT（输出报告）

```markdown
## Code Review 报告

**分支**: <branch>
**变更文件数**: <N>

### CRITICAL（必须修复，BLOCK 合入）

| # | 文件:行号 | 问题 | 建议修复 |
|---|-----------|------|----------|
| 1 | Xxx.java:42 | ... | ... |

### WARNING（应该修复）

| # | 文件:行号 | 问题 | 建议修复 |
|---|-----------|------|----------|

### INFO（建议改进）

| # | 文件:行号 | 问题 | 建议修复 |
|---|-----------|------|----------|

### 总体评价

[PASS / PASS WITH WARNINGS / FAIL]

**总结**: <一句话概括>
```

---

## 边界条件

| 场景 | 处理方式 |
|------|----------|
| `git diff` 为空（无未提交变更） | 检查 `git diff --cached`；如也为空则终止 |
| `AGENTS.md` 不存在 | 继续检查平台专用规则；两者都不存在时仅依赖依赖探测和通用规则，并在报告开头标注“未检测到项目规则” |
| 变更文件 > 50 个 | 仅审查 `.java` 文件；跳过配置文件除非有安全关注 |
| 变更仅包含 `pom.xml` / `build.gradle` | 检查依赖来源、版本锁定和仓库配置；只有项目已有漏洞扫描器且实际执行后，才能报告已知漏洞 |
| 同时存在 Lombok 和非 Lombok 文件 | 按文件分别判定：有 `@Slf4j` 的用 Lombok 标准，没有的用非 Lombok 标准 |
| ORM 混合使用（JPA + MyBatis 同项目） | 两个 ORM 的规则都适用，在报告中标注每个文件使用的 ORM |
| 检测到 Kotlin 文件混在 Java 项目中 | 仅审查 Java 文件；提及存在 Kotlin 文件但说明不在审查范围 |
| 代码库没有测试目录 `src/test` | 测试维度标注 N/A 而非 FAIL |
| 变更包含生成代码（`target/`、`build/`、`generated/`） | 排除这些文件的审查，在报告中注明 |

---

## 注意事项

- 只审查本次 `git diff` 中变更的代码，不审查未改动的文件
- 如果一个文件没有变更则跳过
- 发现 CRITICAL 问题时明确标注 **BLOCK**，建议修复后再合入
- 审查结论应与项目实际技术栈一致 — 探测到的框架和约定优先于通用规则
- 优先复用项目中已有的枚举、常量、工具类和业务异常，不重复造轮子
- 如果变更涉及多个模块，按模块分组输出审查结论
