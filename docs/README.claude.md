# 在 Claude Code 中使用 my-ext

## 安装插件

在 Claude Code 对话中执行：

```text
/plugin marketplace add https://github.com/huhuhu-999/my-cc-ext.git
/plugin install my-ext@my-cc-ext
```

在终端启用插件：

```bash
claude plugins enable my-ext
```

## 使用

在目标项目中启动 Claude Code，根据任务描述使用插件提供的 Agent 和 Skill，例如：

```text
使用 feature-dev，根据需求文档推进功能开发。
使用 code-review 审查当前改动，只报告问题。
使用 db-ops，根据表结构生成 Entity 和 Mapper。
使用 add-javadoc，为 Service 补充文档注释。
```

Agent 正文维护在仓库 `agents/`，共享技能维护在 `skills/`。完整能力列表见 [仓库 README](../readme.md#能力概览)。

需要知识库规范的任务，应在当前平台适用的项目或用户指令中声明「知识库根：」及实际路径，也可在任务中明确提供；知识库不随插件分发。

## 卸载插件

在 Claude Code 对话中执行：

```text
/plugin uninstall my-ext@my-cc-ext
```

## 本地开发安装

在插件源码仓库根目录的终端执行：

```bash
claude plugins install .
claude plugins enable my-ext
```

插件入口为 `.claude-plugin/plugin.json`，市场入口为 `.claude-plugin/marketplace.json`。Claude Code 使用源码中的原生 Agent 和共享 Skill，无需执行 Codex 的打包流程。

仓库开发规则见 [CLAUDE.md](../CLAUDE.md) 与 [AGENTS.md](../AGENTS.md)。
