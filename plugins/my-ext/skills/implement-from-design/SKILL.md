---
name: implement-from-design
description: 根据设计文档（PRD、技术方案、架构设计等）实现 Java 编码。自动适配项目技术栈，遵循分层架构、TDD 流程和项目编码规范。当用户提供设计文档并要求开发功能、或说"开发这个功能""实现这个需求""按设计编码"时使用。
---

# 根据设计文档实现编码

你是一个严格遵循设计文档和项目规范来编写代码的实现者。

## 前置步骤：项目技术栈探测

实现前必须先了解项目上下文，按以下顺序获取信息：

### 1. 阅读项目规则

首先读取项目根目录下的 `AGENTS.md`；若当前平台还有专用规则文件，再读取该文件作为补充。从项目规则中获取：
- 项目定位、模块结构和分层约定
- ORM 框架（JPA/Hibernate / MyBatis / MyBatis-Plus / JdbcTemplate）
- DI 容器（Spring Boot / Guice / Quarkus / 无 DI）
- 包路径命名规范
- 编码约定（命名风格、异常类、日志框架）

### 2. 探测 Lombok

检查项目是否使用 Lombok，按优先级：

1. 检查 `pom.xml` 或 `build.gradle` 中是否有 `lombok` 依赖
2. 检查项目中是否存在 `@Slf4j`、`@Data`、`@Getter` 等 Lombok 注解的实际使用

Lombok 使用状态影响：构造器注入写法、getter/setter 生成方式、日志声明方式。

### 3. 补充探测

项目规则未覆盖的信息通过文件系统探测：

- **构建工具**：`pom.xml` → Maven，`build.gradle` → Gradle
- **ORM 框架**：依赖中查找 JPA/Hibernate、MyBatis/MyBatis-Plus、JdbcTemplate 等
- **DI 容器**：依赖中查找 Spring、Guice、Quarkus 等
- **分层结构**：通过目录结构推断模块划分和包路径

> **核心原则**：项目规则 > 依赖探测 > 通用规则。实现应与项目实际技术栈一致，不要引入项目未使用的框架或约定。
> **产出语言**：同步更新或产出的文档、注释一律使用简体中文（代码注释、README、DDL 注释等）；代码标识符、命令、路径字符串保持原文。

---

## 工作流

### 第一步：读取设计文档

先确认设计文档位置，按优先级搜索：

1. 交接方（feature-dev / superpowers-planner）传入的 `plan_file` / `design_file` 完整路径，或用户显式指定的文档路径（完整路径已含 `<yyyy-MM>/`，优先直接使用）
2. `doc/features/<yyyy-MM>/<feature-name>/` 功能月目录中的设计文档和实施计划（`feature-dev` 输出；在 `doc/features/` 顶层各 `<yyyy-MM>/` 下定位 `<feature-name>` 功能目录，忽略同夹 `archive/`，多版本并存时取最新 `<yyyy-MM-dd>`）
3. `doc/plan/` 目录下的实施计划
4. `doc/design/` 目录下的设计文档
5. `doc/` 或 `docs/` 目录下的设计文档
6. `doc/superpowers/specs/` 目录下的 Spec（`superpowers-planner` 输出）
7. `specs/`、`design/` 目录下的规格说明

读取后，提取以下信息：
- **功能范围**：要实现哪些接口/模块
- **数据模型**：Entity/Domain、DTO、VO 定义
- **接口定义**：Controller 路由、Service 方法签名
- **业务规则**：校验规则、异常场景、边界条件
- **依赖关系**：需要调用哪些已有 Service/Repository/Mapper

### 第二步：分析现有代码

实现前先搜索项目中的可复用代码：

1. 搜索同名或相似的 Entity/DTO/Enum，避免重复定义
2. 确认项目中已有的接口定义、常量和枚举
3. 确认已有的 Service 和 Repository/Mapper，避免重复逻辑
4. 参考同模块已有的实现模式（命名风格、异常处理、日志写法、分页方式）

### 第三步：规划实现顺序

按分层依赖，自底向上实现。根据项目 ORM 框架调整：

**JPA/Hibernate 项目：**
```
1. 枚举 / 常量        → 接口/常量模块
2. DTO / VO           → 接口/传输对象模块
3. Entity             → 领域/数据访问模块
4. Repository         → 领域/数据访问模块
5. Service            → 业务逻辑模块
6. Controller         → Web/API 模块
7. 单元测试           → 在对应业务实现前创建并确认 RED
```

**MyBatis/MyBatis-Plus 项目：**
```
1. 枚举 / 常量        → 接口/常量模块
2. DTO / VO           → 接口/传输对象模块
3. Entity/Model       → 领域/数据访问模块
4. Mapper             → 领域/数据访问模块（接口 + XML）
5. Service            → 业务逻辑模块
6. Controller         → Web/API 模块
7. 单元测试           → 在对应业务实现前创建并确认 RED
```

列出具体文件清单。如涉及修改已有文件，需特别标注。建议将文件清单呈现给用户确认后再开始编码。

### 第四步：按 TDD 波次实现

基础类型和持久化契约就绪后，每个业务行为都必须按以下顺序执行，禁止先完成生产实现再补测试：

1. 编写能够表达预期行为的测试
2. 运行目标测试并确认因预期行为尚未实现而失败（RED），不能把编译错误或环境错误当作 RED
3. 编写使测试通过的最小生产代码（GREEN）
4. 在测试保持通过的前提下重构
5. 完成当前波次后统一编译和运行相关测试

**编译纪律（最高优先级）**：禁止逐文件编译。按分层波次批量写完所有文件后，统一编译验证。规则：

- 每完成一层（如所有 DTO、所有 Entity、所有 Mapper）才编译 1 次
- 编译失败时，分析所有错误，集中批量修复后再编译，不得改一个文件编译一次来试探
- 绝对禁止写完一个 Java 文件就立即 `mvn compile` 的行为
- **文档同步**：编码中发现实际实现与设计文档/实施计划不一致时（类名、方法签名、字段类型、业务逻辑等调整），必须同步更新对应的 `*-design.md` 和 `*-plan.md`。代码即文档，文档即代码，两者始终保持一致

每实现一个文件必须遵循项目规范。生成代码前先读取当前项目的 `AGENTS.md` 和平台专用规则，再搜索同模块现有代码确认行宽、链式调用、注解和格式习惯。以下为模板示例，实际编码时以项目规则和现有代码风格为准。

#### 包路径确定

通过搜索已存在的同类文件动态确定，禁止写死。方法：
1. 使用文件模式搜索同类文件（如 `**/service/**Impl.java`）
2. 从中提取包路径前缀
3. 新增文件放到与已有文件同级的对应子包中

#### 构造器注入——Lombok 项目

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class XxxServiceImpl implements XxxService {

    private final XxxRepository xxxRepository;
    // 构造器由 @RequiredArgsConstructor 自动生成，不使用 @Autowired 字段注入

    // 方法 < 50 行，参数加 final
    public XxxDto doSomething(final String param) {
        // 参数校验在方法开头
        if (param == null || param.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "参数不能为空");
        }
        // 使用 early return 减少嵌套
        // 关键节点打日志
        log.info("处理xxx, param={}", param);
        // ...
    }
}
```

#### 构造器注入——无 Lombok 项目

```java
@Service
public class XxxServiceImpl implements XxxService {

    private static final Logger log = LoggerFactory.getLogger(XxxServiceImpl.class);

    private final XxxRepository xxxRepository;

    // 手动构造器注入
    public XxxServiceImpl(final XxxRepository xxxRepository) {
        this.xxxRepository = xxxRepository;
    }

    public XxxDto doSomething(final String param) {
        if (param == null || param.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "参数不能为空");
        }
        log.info("处理xxx, param={}", param);
        // ...
    }
}
```

#### DTO 规范

```java
// DTO: 接口/传输对象模块
@Data  // 使用 Lombok 时；无 Lombok 则手写或 IDE 生成 getter/setter
public class XxxRequest {
    @NotBlank(message = "名称不能为空")
    private String name;
}
```

#### Entity / Mapper 规范

Entity 和 Mapper 的生成模板统一委托给 `gen-java-entity` skill，该 skill 已覆盖：

- **MyBatis-Plus**：`@TableName` + `@TableId` + `BaseMapper<Entity>` + `ServiceImpl<M, E>`
- **MyBatis**：纯 POJO + Mapper 接口 + 同名 XML（`resultMap`/`<sql>`/CRUD）
- **JPA/Hibernate**：`@Entity` + `@Getter` + `JpaRepository` + `JpaSpecificationExecutor`

需要生成 Entity/Mapper 时，先通过文件模式搜索探测项目 ORM 框架和包路径，然后按 `gen-java-entity` 的模板生成。核心规范摘要：

- Entity 实现 `Serializable`，显式 `serialVersionUID`
- 审计字段齐全：`createdDate`, `createdBy`, `updatedDate`, `updatedBy`, `isDelete`
- 时间字段用 `LocalDateTime`，不用 `Date`
- MyBatis-Plus Entity 用 `@Data`，JPA Entity 用 `@Getter`（不暴露 setter）
- 逻辑删除用 `UPDATE SET is_delete = 1`，XML 禁止 `SELECT *`

#### 异常处理

- 业务异常使用项目定义的业务异常类（如 `BusinessException`），附带错误码和可读消息
- Controller 层不 try-catch，交给全局异常处理器（`@ControllerAdvice` / `@ExceptionHandler`）
- Service 层只在需要转换异常类型时才 catch（如将 `DataAccessException` 转为 `BusinessException`）
- 资源操作必须使用 try-with-resources 确保释放

### 第五步：补齐测试与统一回归验证

以下模板在第四步各业务波次开始时使用。本步骤只检查场景是否完整并执行模块回归，不得把缺失测试留到生产代码完成后再补。

每个 Service/Component 的 public 方法写单元测试。根据项目测试框架选择：

**Spring Boot + Mockito（最常见）：**
```java
@ExtendWith(MockitoExtension.class)
class XxxServiceImplTest {

    @Mock
    private XxxRepository xxxRepository;
    @InjectMocks
    private XxxServiceImpl xxxService;

    @Test
    void shouldReturnDtoWhenParamValid() {
        // Arrange
        // Act
        // Assert
    }

    @Test
    void shouldThrowExceptionWhenParamEmpty() {
        // Arrange
        // Act & Assert
        assertThrows(BusinessException.class, () -> xxxService.doSomething(""));
    }
}
```

**集成测试（需要 Spring 上下文时）：**
```java
@SpringBootTest
class XxxServiceImplIT {

    @MockBean
    private XxxRepository xxxRepository;
    @Autowired
    private XxxServiceImpl xxxService;
    // ...
}
```

- 测试命名：`should<预期行为>When<条件>`
- 一个测试方法只验证一个行为
- 覆盖正常路径 + 异常路径 + 边界条件

### 第六步：调用 code-reviewer 审查

实现完成后，调用 `code-reviewer` skill 对本次变更进行正式审查：

1. 运行 `git diff` 获取变更
2. 委托 `code-reviewer` skill 执行审查
3. 如存在 **CRITICAL** 问题，立即修复后重新审查
4. 如存在 **WARNING**，逐项评估后修复

### 第七步：自检

审查通过后，逐项自检：

- [ ] 分层调用正确（Controller → Service → Repository/Mapper）
- [ ] DTO 和 Entity 没有跨层混用
- [ ] 没有硬编码密钥、Token、密码或敏感信息
- [ ] 异常不吞掉（空 catch），日志不打印敏感信息
- [ ] 参数使用 `final`，返回值不返回 null（返空集合）
- [ ] 方法 < 50 行，嵌套层次 ≤ 4
- [ ] 包路径动态确定，没有写死
- [ ] 测试可运行且覆盖核心分支和边界条件
- [ ] 代码风格与项目已有代码一致

### 第八步：输出总结

```markdown
## 实现总结

**设计文档**: <文档路径>
**技术栈**: <框架>/<ORM>/<DI>，Lombok: <是/否>

### 新增文件

| 模块 | 文件 | 说明 |
|------|------|------|
| api | XxxRequest.java | 请求 DTO |
| component | XxxEntity.java | 实体 |

### 修改文件

| 文件 | 变更说明 |
|------|----------|

### 实现要点

- 遵循分层架构，Controller → Service → Repository
- 异常使用项目业务异常类，Controller 统一异常处理
- 构造器注入，参数不可变

### code-reviewer 结果

[粘贴审查结论摘要，或标注"无 CRITICAL / WARNING，全部通过"]

### 待完成

- [ ] 集成测试
- [ ] 接口文档更新
```
