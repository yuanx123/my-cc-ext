---
name: write-a-skill
description: 创建结构良好、渐进式披露、带捆绑资源的新 Agent Skill。当用户想要创建、编写或构建新 Skill 时使用。
---

# 编写 Skill

## 流程

1. **收集需求** — 向用户询问：
   - 这个 Skill 覆盖什么任务/领域？
   - 应该处理哪些具体使用场景？
   - 需要可执行脚本还是只需要指令？
   - 是否需要包含参考资料？

2. **起草 Skill** — 创建：
   - `SKILL.md`，包含简洁的指令
   - 如果内容超过 500 行，拆分为额外的参考文件
   - 如果需要确定性操作，添加工具脚本

3. **与用户确认** — 展示草稿并询问：
   - 是否覆盖了你的使用场景？
   - 有没有遗漏或不清晰的地方？
   - 哪些部分需要增加/减少细节？

## Skill 目录结构

```
skill-name/
├── SKILL.md           # 主指令文件（必需）
├── REFERENCE.md       # 详细文档（按需）
├── EXAMPLES.md        # 使用示例（按需）
└── scripts/           # 工具脚本（按需）
    └── helper.js
```

## SKILL.md 模板

```md
---
name: skill-name
description: 能力的简要描述。Use when [触发条件]。
---

# Skill 名称

## 快速开始

[最小可运行示例]

## 工作流

[复杂任务的分步流程，含 checklist]

## 高级功能

[链接到独立文件：参见 REFERENCE.md]
```

## description 编写要求

`description` 是 Agent **判断是否加载该 Skill 的唯一依据**。它会出现在系统提示词中，与其他已安装的 Skill 并列展示。Agent 读取这些描述后，根据用户请求选择最相关的 Skill。

**目标**：让 Agent 获得足够信息来判断：

1. 这个 Skill 提供什么能力
2. 何时/为何触发（具体关键词、上下文、文件类型）

**格式要求**：

- 最多 1024 个字符
- 使用第三人称
- 第一句：做什么
- 第二句：`Use when [触发条件]`

**好的示例**：

```
从 PDF 文件中提取文本和表格、填写表单、合并文档。Use when working with PDF files or when user mentions PDFs, forms, or document extraction.
```

**差的示例**：

```
帮助处理文档。
```

差的示例让 Agent 无法区分这个 Skill 和其他文档类 Skill。

## 何时添加脚本

满足以下条件之一就添加工具脚本：

- 操作是确定性的（校验、格式化）
- 同一段代码会被反复生成
- 错误需要显式处理

脚本比每次生成代码更省 token，也更可靠。

## 何时拆分文件

满足以下条件之一就拆分：

- `SKILL.md` 接近或超过 500 行
- 内容有明显独立的领域（如财务 schema vs 销售 schema）
- 高级功能不常用

## 审查 Checklist

起草完成后，逐项确认：

- [ ] description 包含触发条件（"Use when..."）
- [ ] SKILL.md 控制在 500 行以内，较长细节已拆入一级参考文件
- [ ] 没有时效性信息
- [ ] 术语前后一致
- [ ] 包含具体示例
- [ ] 引用层级不超过一级
