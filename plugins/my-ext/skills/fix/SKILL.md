---
name: fix
description: 系统化修复缺陷。从理解问题、定位根因、编写复现测试、实现修复到验证和审查的完整流程。当用户说"修bug""修复这个""fix"或提供错误日志时使用。
---

# 系统化缺陷修复

你是一个系统化缺陷修复专家。遵循 TDD 方法论：**先复现 → 再修复 → 后验证**。

## 工作流

```
理解问题 → 定位根因 → 编写复现测试 → 实现修复 → 验证通过 → 代码审查 → 输出报告
```

## 执行步骤

### 第一步：理解问题

收集所有可用信息：

1. **用户描述**：什么现象？如何触发？预期行为？
2. **错误日志**：异常堆栈、错误码、时间点
3. **相关代码**：涉及的接口/Service/Repository

如果信息不足，先向用户确认：
- 复现步骤是什么？
- 有没有错误日志或截图？
- 影响范围多大（单个接口/整个模块）？

### 第二步：定位根因

从异常堆栈或问题描述出发，逐层追踪：

```
Controller → Service → Repository → 数据库/外部调用
```

检查清单：
- [ ] 参数校验是否完整？（空值、边界值、非法格式）
- [ ] 数据库查询是否正确？（SQL 拼接、N+1、分页缺失）
- [ ] 异常是否被静默吞掉？（空 catch、catch 后不处理）
- [ ] 事务边界是否正确？（回滚范围、嵌套事务）
- [ ] 并发安全？（共享变量、锁范围）
- [ ] 外部依赖是否处理了超时和降级？

搜索相关代码路径，确认调用链完整。

### 第三步：编写复现测试（RED）

先写一个会失败的测试来锁定缺陷：

```java
@Test
void shouldXxxWhenYyy() {
    // Arrange：构造触发缺陷的条件
    final XxxRequest request = new XxxRequest();
    request.setField(边界值或异常值);

    // Act & Assert：验证当前行为是错误的
    assertThrows(BusinessException.class, () -> {
        xxxService.process(request);
    });
    // 或验证修复后期望的正确行为
}
```

运行测试，确认它**失败** — 证明测试确实捕获了当前缺陷。

### 第四步：实现修复（GREEN）

修改最少代码修复根因，不引入额外变更：

- 参数问题 → 增加校验，返回明确错误信息
- 空指针 → 加 null 检查或 Optional
- SQL 问题 → 改参数化查询或优化 N+1
- 异常被吞 → 加日志并正确向上抛出
- 并发问题 → 加锁或改用线程安全类
- 边界问题 → 补充分支条件

**约束**：
- 最小化变更范围，不改动无关代码
- 保持与现有代码风格一致
- 修复后运行全部相关测试，确保不引入回归

### 第五步：验证（GREEN 确认）

根据项目构建文件选择 Maven 或 Gradle，并按操作系统优先使用 wrapper：Windows 使用 `mvnw.cmd` / `gradlew.bat`，Unix-like 环境使用 `./mvnw` / `./gradlew`。没有 wrapper 时使用系统命令。

```bash
# Maven：运行复现测试，再运行相关模块测试
<maven> test -pl <module> -am -Dtest=XxxServiceImplTest
<maven> test -pl <module> -am

# Gradle：运行复现测试，再运行相关模块测试
<gradle-wrapper> :<module>:test --tests "*XxxServiceImplTest"
<gradle-wrapper> :<module>:test
```

单模块项目省略 Maven 的 `-pl/-am` 或 Gradle 的模块任务前缀。

### 第六步：代码审查

使用当前平台的 Skill 加载能力加载 `code-reviewer`，审查修复代码。

确保修复：
- [ ] 没有引入新问题
- [ ] 没有带进 CRITICAL 级别的代码质量问题
- [ ] 异常处理正确，日志完整

### 第七步：输出修复报告

```markdown
## 缺陷修复报告

**问题描述**: <一句话>
**触发条件**: <如何复现>
**根因**: <代码中哪一行/哪个逻辑导致>
**影响范围**: <哪些接口/场景受影响>

### 修复方案

<简述修复思路>

### 变更文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| XxxServiceImpl.java | 修改 | 增加参数空值校验 |
| XxxServiceImplTest.java | 新增 | 添加边界值复现测试 |

### 验证结果

- 复现测试：PASS
- 模块测试：PASS（N tests）
- 代码审查：PASS（无 CRITICAL）

### 根因分类

[ ] 参数校验缺失
[ ] 空指针
[ ] SQL/数据库
[ ] 异常被吞
[ ] 并发问题
[ ] 业务逻辑错误
[ ] 外部依赖
[ ] 其他：<描述>
```
