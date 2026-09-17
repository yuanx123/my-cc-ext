---
name: code-review-agent
description: 在 Codex 中执行只读深度代码审查 Agent 工作流。用于跨文件调用链、事务、并发、安全和代码规范审查，仅报告问题。
---

# 深度代码审查工作流入口

先完整读取[平台执行契约](../../codex/agent-adapter.md)，再完整读取[唯一 Agent 源](../../agents/code-review/AGENT.md)，按契约执行正文。

相对链接以本文件所在目录解析；任务操作仍在用户项目中进行。已受委派时直接执行，不重复委派自身。
