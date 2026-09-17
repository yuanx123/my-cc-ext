---
name: build-fix
description: Java 构建错误修复。检测 Maven/Gradle 构建系统，分组解析编译错误，逐个修复并验证。当用户说"build fix""构建失败""编译错误""fix build""构建修一下""编译修一下"时使用。
---

# Java Build Fix

修复 Java 项目的编译/构建错误。在当前会话内联执行，逐个修复直至构建通过。

## Phase 1 — DETECT（检测构建系统）

递归搜索 `**/pom.xml`、`**/build.gradle`、`**/build.gradle.kts`、`mvnw*` 和 `gradlew*`，排除 `target/`、`build/` 和生成目录。根构建文件用于确定聚合项目，子目录构建文件用于确定模块边界。

执行构建时按操作系统选择命令：Windows 优先 `mvnw.cmd` / `gradlew.bat`，Unix-like 环境优先 `./mvnw` / `./gradlew`；没有 wrapper 时才使用系统的 `mvn` / `gradle`。

| 检测到 | 构建命令 | 单模块编译 |
|--------|----------|-----------|
| `pom.xml` (多模块) | `<maven> compile` | `<maven> compile -pl <module> -am` |
| `pom.xml` (单模块) | `<maven> compile` | — |
| `build.gradle(.kts)` + wrapper | `<gradle-wrapper> compileJava` | `<gradle-wrapper> :<module>:compileJava` |
| `build.gradle(.kts)` 无 wrapper | `gradle compileJava 2>&1` | — |
| 两者都有 | 优先 Maven | — |
| 两者都没有 | 停止，询问用户 | — |

单模块 Maven 项目省略 `-pl <module> -am`；单模块 Gradle 项目省略 `:<module>:` 任务前缀。

---

## Phase 2 — BUILD（首次构建 + 错误收集）

```bash
<构建命令> 2>&1
```

如果构建成功（exit 0）→ 输出 "BUILD SUCCESS — 无需修复" 并终止。

如果构建失败，保存错误输出用于 Phase 3 分组。

---

## Phase 3 — PARSE（解析和分组）

### 3.1 错误分类

| 错误模式 | 分类 | 优先级 | 说明 |
|----------|------|--------|------|
| `cannot find symbol` | 缺失导入/符号 | 1 (最高) | import 遗漏、类名拼写错误 |
| `package ... does not exist` | 缺失依赖 | 1 | pom.xml/gradle 中未声明依赖 |
| `incompatible types` | 类型不匹配 | 2 | 泛型错误、返回类型不匹配 |
| `method does not override` | 接口/父类变更 | 2 | 接口新增方法、签名变更 |
| `unreported exception` | 未处理异常 | 3 | 缺少 try-catch 或 throws 声明 |
| `deprecated` | 废弃 API 使用 | 4 (最低) | 警告级别 |

### 3.2 分组逻辑

1. 按文件路径分组
2. 组内按行号排序
3. 组间按优先级排序（1 最高，4 最低）
4. 同优先级按依赖拓扑排序（底层模块先修）
5. 统计总错误数

---

## Phase 4 — FIX LOOP（逐个修复循环）

对每个错误组，按优先级顺序处理：

```
For each file in sorted error groups:
1. READ   ：读取文件（错误行 ± 15 行上下文）
  2. DIAGNOSE — 对照分类表确定根因
  3. FIX    — 使用当前平台的文件编辑工具做最小变更
  4. BUILD  — 重新运行构建命令
  5. CHECK  — 确认该错误消失且无新错误引入
  6. NEXT   — 继续下一个错误
```

**修复原则：**
- 每个文件修复间隔运行一次构建
- 一个文件有多个错误时，一次性修复所有错误后再构建
- 优先修复"根因"错误（如缺失 import 可能导致多个 `cannot find symbol`）
- 只修复编译错误，不做逻辑重构；需要重构时单独建立重构任务

---

## Phase 5 — GUARDRAILS（护栏）

遇到以下情况时**停止并询问用户**：

| 触发条件 | 判断标准 | 行动 |
|----------|----------|------|
| 修复引入更多错误 | 新错误数 > 修复消除的错误数 | 回退上次修改，告知用户 |
| 同一错误 3 次后仍存在 | 同一文件同一行错误经 3 轮 fix-build 未解决 | 停止，建议分析更深层框架问题 |
| 需要架构级变更 | 修复需要移动包、拆分模块、重构接口签名 | 停止，建议使用 `feature-dev` Agent 做完整开发 |
| 缺失外部依赖 | `package does not exist` 且不在 pom.xml/build.gradle 中 | 建议用已选定的 Maven/Gradle 命令安装或添加依赖声明 |
| 错误涉及生成代码 | 路径含 `target/`、`build/`、`generated/` | 建议用已选定的构建命令执行 clean 后重新生成 |
| 超过 50 个错误 | 可能是系统性问题 | 展示前 10 个，询问是逐个修复还是分析根因 |

---

## Phase 6 — SUMMARY（汇总报告）

```markdown
## Build Fix 报告

**构建系统**: Maven / Gradle
**修复轮次**: <N 轮>

### 修复详情

| # | 文件:行号 | 错误类型 | 修复方式 |
|---|-----------|----------|----------|
| 1 | XxxService.java:42 | cannot find symbol | 添加 import ... |
| 2 | YyyEntity.java:15 | incompatible types | 修正泛型参数 |

### 结果

| 指标 | 数值 |
|------|------|
| 初始错误数 | N |
| 已修复 | M |
| 剩余 | 0 |
| 新引入 | 0 |

**最终状态**: BUILD SUCCESS
```

---

## 边界条件

| 场景 | 处理方式 |
|------|----------|
| 同时存在 Maven 和 Gradle | 优先 Maven；如果 Maven 构建报环境错误（JDK 版本等），降级 Gradle |
| 多模块项目的子模块单独构建失败 | 先尝试 `-pl <module>` 编译单个模块 |
| 错误发生在注解处理器生成的代码 | 跳过，标注"生成代码，建议 clean rebuild" |
| 编译通过但 `@Deprecated` 警告很多 | 不在本次修复范围，在 Summary 中提及警告数量 |
| 构建命令执行超时（> 120s） | 询问用户是否继续等待或手动介入 |

---

## 注意事项

- 只修复编译/构建错误，不做逻辑审查或重构
- 不修改 `pom.xml` / `build.gradle` 中的依赖版本，除非缺失依赖导致构建失败
- 不删除任何业务代码来"修复"编译错误
- 优先使用项目中已有的 import 和类路径风格
