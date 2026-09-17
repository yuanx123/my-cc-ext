# 实施计划（Plan）模板

> 用法：superpowers-planner / feature-dev 编写 `doc/features/<yyyy-MM>/<feature-name>/<yyyy-MM-dd>-<sub-feature>-plan.md`（`<yyyy-MM>` 为当前年月第一层目录，如 `2026-09`，`<feature-name>` 功能名目录在其下）前，必须优先读取本文件，按以下模板输出任务与波次。
> 文档定位：Plan 面向 **agent 执行**（执行导向）；设计规范(Spec)面向**人审**，两份**独立成文、不混写**，Spec 另按 `spec-skeleton.md` 输出。
> 目录约定：产出以 `doc/features/<yyyy-MM>/<feature-name>/` 为功能月目录（`<yyyy-MM>` 年月为第一层、`<feature-name>` 功能名在年月下），设计/计划文档与 DDL/SQL 附属资源（同夹 `sql/`）均在其中；归档在 `doc/features/<yyyy-MM>/<feature-name>/archive/`（平铺，只用于当月夹内过时版本）。
> 提交约定：产出文档与实现代码一律留工作区交用户审阅，**不自动执行 git add / git commit**；任何提交须用户明确许可。
> 语言约定：产出文档（设计/计划/README/DDL 注释等）一律使用简体中文；代码标识符、命令、路径字符串保持原文。

## 计划文档头部（含版本历史）

```markdown
# <功能名称> 实施计划

> 状态：draft | active
> 当前版本：v1.x
> 最近更新：<yyyy-MM-dd>
> **设计文档**: doc/features/<yyyy-MM>/<feature-name>/<yyyy-MM-dd>-<sub-feature>-design.md
> **目标**: <一句话>
> **架构**: <2-3 句话>
> **技术栈**: <按 CLAUDE.md/AGENTS.md 实际探测结果>

**版本历史（变更记录规约）**：任何实质修订（含临时调整）必须**追加一行**并**递增版本号**，不得覆盖旧行；「当前版本」同步为最新行版本：

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.1 | <yyyy-MM-dd> | <本次变更摘要> |
| v1.0 | <yyyy-MM-dd> | 初稿：<初始任务范围摘要> |

---
```

## 硬性约束（计划开头必列，执行 agent 先读）

```markdown
## 硬性约束
- **禁 git 写操作**：不得执行 git add / git commit / git push（除非任务明确允许，一般一律禁止）
- **禁连库/禁执行 DML**：不得直连数据库执行 DDL/DML（DDL/DML 交用户或 DB 运维执行）
- **只改下列文件**：<明确列出允许创建/修改的文件清单>；清单外文件一律不动
- **注释与代码简洁性规范**：遵循「注释精简口径（MUST）」与「代码简洁性（MUST）」（见 feature-dev 约束区）
- **完成即留工作区**：实现完成并验证通过后不自动提交，与 design/plan 一并交用户审阅
```

## 文件结构映射

在定义任务之前，明确每个文件：

```markdown
创建：
  <api-module>/src/main/java/.../XxxRequest.java    — 请求 DTO
  <api-module>/src/main/java/.../XxxResponse.java   — 响应 DTO
  ...

修改：
  <app-module>/src/main/java/.../XxxController.java:80-120  — 新增接口方法
  ...

测试：
  <test-module>/src/test/java/.../XxxServiceTest.java
  ...
```

## 任务粒度模板

每个任务是一个动作（2-5 分钟），按文件给出**接口/SQL 与替换前后代码**，并附**验证命令与预期**和**验收标准**（可验证完成条件，供执行 agent 自验与审查核对）。格式：

````markdown
### 任务 N：<任务名>

**文件：**
- 创建：`exact/path/to/NewFile.java`
- 修改：`exact/path/to/Existing.java:80-120`
- 测试：`exact/path/to/Test.java`

- [ ] **步骤 1：编写失败测试**

```java
package com.xxx.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TemplateValidationServiceTest {

    private final TemplateValidationService service = new TemplateValidationService();

    @Test
    void shouldReturnErrorWhenTemplateMismatch() {
        TemplateValidationResult result = service.validate("invalid_template.xlsx", "OPERATOR_IMPORT");

        assertThat(result.isMatched()).isFalse();
        assertThat(result.getCheckMsg()).contains("模板不符合");
    }
}
```

- [ ] **步骤 2：运行测试验证失败**

```bash
mvn -pl pare-lmp-integrate-component -am test -Dtest=XxxServiceTest#shouldReturnErrorWhenTemplateMismatch
```
预期：FAIL

- [ ] **步骤 3：编写最小实现**

```java
package com.xxx.service;

public class TemplateValidationService {

    public TemplateValidationResult validate(final String fileName, final String expectedTemplateCode) {
        if (!"operator_import_template.xlsx".equals(fileName) || !"OPERATOR_IMPORT".equals(expectedTemplateCode)) {
            return new TemplateValidationResult(false, "模板不符合");
        }
        return new TemplateValidationResult(true, "模板校验通过");
    }
}
```

```java
package com.xxx.service;

public class TemplateValidationResult {

    private final boolean matched;
    private final String checkMsg;

    public TemplateValidationResult(final boolean matched, final String checkMsg) {
        this.matched = matched;
        this.checkMsg = checkMsg;
    }

    public boolean isMatched() {
        return matched;
    }

    public String getCheckMsg() {
        return checkMsg;
    }
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
mvn -pl pare-lmp-integrate-component -am test -Dtest=XxxServiceTest#shouldReturnErrorWhenTemplateMismatch
```
预期：PASS

- [ ] **步骤 5：留工作区待审阅（不自动提交）**

实现完成且测试通过后，本步骤**不执行任何 git add / git commit**：文件留在工作区，与设计/计划文档一起交用户审阅；提交与否由用户决定，仅在用户明确指示时才执行 git add / git commit。

**验收标准**：<可验证完成条件，如某测试通过 / 某接口返回符合预期 / 某 SQL 结果正确>
````

## 并行执行波次模板

```markdown
## 执行波次

### Wave 1 (Foundation) — 并行
├── Task 1: DDL 和实体
├── Task 2: 枚举和常量
└── Task 3: DTO 定义

### Wave 2 (Persistence + Logic) — 依赖 Wave 1
├── Task 4: Mapper 实现 (depends: 1)
├── Task 5: Excel 解析 (depends: 3)
└── Task 6: 业务写入 (depends: 1,4)

### Wave 3 (API + Integration) — 依赖 Wave 2
├── Task 7: Controller 接口 (depends: 3,5,6)
└── Task 8: 集成测试 (depends: 5,6,7)

### Wave FINAL — 审查
├── F1: 计划合规审计
├── F2: 代码质量审查
├── F3: 端到端 QA
└── F4: 范围一致性检查
```

## 范围外禁止（计划末尾必列）

```markdown
## 范围外禁止
- <与本计划无直接关联的重构 / 优化 / 预留扩展>
- <未列入「只改下列文件」清单的文件一律不动>
- <超出本 plan 的接口 / 表 / 字段 / 场景>
- <其他明确不做的动作，如连库、提交 git 等>
```
