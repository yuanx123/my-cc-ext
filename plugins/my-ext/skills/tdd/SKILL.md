---
name: tdd
description: Java TDD 工作流。Red-Green-Refactor 三阶段，自动检测 Maven/Gradle 和测试框架，覆盖率检查。当用户说"tdd""测试驱动""先写测试""red-green-refactor""写单元测试再实现""加个测试"时使用。
---

# Java TDD Workflow

测试驱动开发流程。在当前会话内联执行整个 Red-Green-Refactor 循环。

## Phase 1 — DETECT（探测测试基础设施）

递归搜索所有模块的 `**/pom.xml`、`**/build.gradle`、`**/build.gradle.kts`、`**/src/test/**` 和 `**/*Test.java`。在构建文件中搜索 JUnit、TestNG、Mockito 和 JaCoCo。根据被测类所属模块选择对应构建文件，排除 `target/`、`build/` 和生成目录。

执行命令时，Windows 优先 `mvnw.cmd` / `gradlew.bat`，Unix-like 环境优先 `./mvnw` / `./gradlew`；没有 wrapper 时使用系统 `mvn` / `gradle`。

| 检测到 | 测试命令 | 覆盖率命令 |
|--------|----------|-----------|
| Maven + JUnit 5 | `<maven> test -Dtest=XxxTest -pl <module> -am` | `<maven> test jacoco:report -pl <module> -am` |
| Maven + JUnit 4 | `<maven> test -Dtest=XxxTest -pl <module> -am` | `<maven> test jacoco:report -pl <module> -am` |
| Gradle + JUnit 5 | `<gradle-wrapper> :<module>:test --tests "*XxxTest"` | `<gradle-wrapper> :<module>:test :<module>:jacocoTestReport` |
| 无测试框架 | 询问用户 | — |
| 无 JaCoCo | 覆盖率门禁降级为"测试全部通过即可" | — |

单模块 Maven 项目省略 `-pl <module> -am`；单模块 Gradle 项目省略 `:<module>:` 任务前缀。

### 1.1 定位目标

递归搜索 `**/*Service.java` 和 `**/*ServiceImpl.java`，根据包名、接口实现关系以及用户指定目标确定被测类，不能默认取搜索结果前五个。

### 1.2 读取风格参考

读取 1-2 个已有测试文件，了解：
- 使用的测试框架和扩展（`@ExtendWith(MockitoExtension.class)` vs `@SpringBootTest`）
- 测试命名约定（`should*` / `test*` / `given*`）
- Mock 方式（`@Mock` + `@InjectMocks` / `Mockito.mock()`）
- Assert 库（AssertJ / Hamcrest / JUnit5 Assertions）

---

## Phase 2 — RED（编写失败测试）

### 编写原则

- 测试类放在 `<src/test>/<对应包路径>/` 下
- 测试方法命名：`should<预期行为>When<条件>`
- 每个测试方法只验证一个行为（一个 assert 对应一个场景）
- 覆盖 4 种场景：
  1. **正常路径** — 典型输入，预期成功
  2. **null / 空值** — `null`、空字符串、空集合
  3. **业务异常** — 违反业务规则的输入，预期抛异常
  4. **边界值** — 最大值、最小值、零、负数

### 模板

```java
@ExtendWith(MockitoExtension.class)
class XxxServiceImplTest {

    @Mock
    private XxxMapper xxxMapper;

    @InjectMocks
    private XxxServiceImpl xxxService;

    @Test
    void shouldReturnDtoWhenParamValid() {
        // Arrange
        // Act
        // Assert
    }

    @Test
    void shouldThrowExceptionWhenParamIsNull() {
        // Arrange
        // Act & Assert
        assertThrows(BusinessException.class, () -> xxxService.doSomething(null));
    }

    @Test
    void shouldThrowExceptionWhenBusinessRuleViolated() {
        // Arrange
        // Act & Assert
        assertThrows(BusinessException.class, () -> xxxService.doSomething("invalid"));
    }

    @Test
    void shouldHandleEdgeCaseWhenValueIsZero() {
        // Arrange
        // Act
        // Assert
    }
}
```

### 运行测试确认 RED

```bash
# Maven
<maven> test -Dtest=<TestClassName> -pl <module> -am

# Gradle
<gradle-wrapper> :<module>:test --tests "*<TestClassName>"
```

预期：**FAIL**，且失败原因必须是目标行为尚未实现或断言不满足。编译错误、依赖下载失败、环境错误不能作为有效 RED。

---

## Phase 3 — GREEN（最小实现）

### 实现原则

- 只写让测试通过的最小代码，不做额外重构
- 涉及新 Entity/DTO 时，遵循 `gen-java-entity` 的包路径动态探测
- 构造器注入 + `final` 参数 + 项目业务异常类
- 优先复用已有枚举、常量、工具类
- 生成代码前先读取当前项目的 `AGENTS.md` 和平台专用规则，再检查同模块现有代码，确认行宽、链式调用、注解和格式习惯

### 运行测试确认 GREEN

```bash
<maven> test -Dtest=<TestClassName> -pl <module> -am
```

预期：**PASS** — 所有测试通过。

---

## Phase 4 — REFACTOR（重构）

### 重构清单

- [ ] 消除重复代码（DRY）
- [ ] 方法拆分（每个方法 ≤ 50 行）
- [ ] 消除魔法数字，提取命名常量
- [ ] Early return 减少嵌套（嵌套 ≤ 4 层）
- [ ] 变量声明为 `final`

### 重构后验证

```bash
<maven> test -Dtest=<TestClassName> -pl <module> -am
```

预期：**PASS** — 重构后所有测试仍通过。

---

## Phase 5 — COVERAGE（覆盖率）

### 生成覆盖率报告

```bash
# Maven + JaCoCo
<maven> test jacoco:report -pl <module> -am

# Gradle + JaCoCo
<gradle-wrapper> :<module>:test :<module>:jacocoTestReport
```

### 覆盖率门禁

| 覆盖率 | 判定 | 行动 |
|--------|------|------|
| ≥ 80% line | PASS | 输出汇总报告 |
| < 80% line | 需补充 | 列出未覆盖的分支/方法，回到 Phase 2 补充测试 |
| 无 JaCoCo | SKIP | 仅确认测试全部通过 |

---

## 输出报告

```markdown
## TDD 完成报告

**被测类**: <类全限定名>
**构建系统**: Maven / Gradle
**测试框架**: JUnit 5 / JUnit 4 + Mockito

### RED Phase
- 编写测试: N 个方法
- 覆盖场景: 正常路径 / null / 业务异常 / 边界值
- 预期失败: ✅

### GREEN Phase
- 新增/修改文件: <列表>
- 测试结果: N passed, 0 failed

### REFACTOR Phase
- 重构项: <消除重复 / 拆分方法 / 提取常量>
- 重构后测试: ✅ N passed

### 覆盖率
| 指标 | 数值 |
|------|------|
| Line Coverage | XX% |
| Branch Coverage | XX% |

**结论**: ✅ PASS / ⚠️ BELOW 80%
```

---

## 边界条件

| 场景 | 处理方式 |
|------|----------|
| 没有检测到测试框架 | 询问用户使用 JUnit 5 / JUnit 4 / TestNG / Spock |
| 没有测试目录 `src/test` | 按标准 Maven/Gradle 布局创建 `src/test/java/<package>` |
| 被测方法依赖未创建的 Mapper/Repository | 先定义最小可编译契约并 Mock；契约无法确定时停止并确认，不写 `TBD`、TODO 或待替换占位符 |
| 项目已有测试但命名/风格不统一 | 沿用被测类同模块已有测试的风格 |
| 需要 Spring 上下文 | 使用 `@SpringBootTest` + `@MockBean`，标注为集成测试而非单元测试 |
| 被测方法 > 50 行 | 建议先拆分为小方法再 TDD，拆分为多个 TDD 子任务 |
| 涉及文件上传/网络/消息队列 | Mock 外部依赖，测试只验证业务逻辑 |

---

## 注意事项

- 测试方法不依赖执行顺序（不该有 `@TestMethodOrder`）
- 测试数据在方法内构造，不依赖外部文件或数据库
- 不测试框架本身（如不验证 Spring DI 是否正确注入）
- 不测试 getter/setter/toString/hashCode（Lombok 生成的不需要测试）
- 被 `feature-dev` Agent 调用时，只执行当前计划任务的 TDD 循环，不启动完整流水线
