---
name: db-ops-agent
description: 在 Codex 中执行数据库操作 Agent 工作流。用于 DDL、SQL、Entity、Mapper、Repository、索引设计和 SQL 审查。
---

# 数据库操作工作流入口

先完整读取[平台执行契约](../../agent-adapter.md)，再完整读取[唯一 Agent 源](../../../agents/db-ops/AGENT.md)，按契约执行正文。

相对链接以本文件所在目录解析；任务操作仍在用户项目中进行。已受委派时直接执行，不重复委派自身。
