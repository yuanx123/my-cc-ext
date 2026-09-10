---
name: cc-ext-dev-agent
description: 在 Codex 中执行扩展开发 Agent 工作流。用于插件、Skill、MCP 或 Hook 的开发与适配，按目标平台规范执行。
---

# 扩展开发工作流入口

先完整读取[平台执行契约](../../agent-adapter.md)，再完整读取[唯一 Agent 源](../../../agents/cc-ext-dev/AGENT.md)，按契约执行正文。

相对链接以本文件所在目录解析；任务操作仍在用户项目中进行。已受委派时直接执行，不重复委派自身。
