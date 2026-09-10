# Codex 增量适配设计

本设计取代 `2026-08-04-codex-adaptation-design.md` 的实施依据。用户已确认完整适配，并要求在 `codex/add-codex-support` 分支完成，保留现有仓库结构。

## 内容与平台边界

- 新增 `.codex-plugin/plugin.json`，沿用插件名 `my-ext`，版本跟随 `package.json`；使用官方仍支持的兼容清单，不迁移既有平台入口。
- `skills/` 继续作为共享 Skill 唯一来源。Codex 专属 `*-agent` 薄入口位于 `codex/skills/`，引用 `agents/<name>/AGENT.md`，不复制正文。仅打包时将入口合并到安装包 `skills/` 并重定位相对链接。
- 覆盖源文件：`agents/cc-ext-dev/AGENT.md`、`agents/code-review/AGENT.md`、`agents/db-ops/AGENT.md`、`agents/feature-dev/AGENT.md`、`agents/fix/AGENT.md`、`agents/superpowers-planner/AGENT.md`。
- Codex 工具、路径、命名空间与委派语义统一写入 `codex/agent-adapter.md`。插件资源相对已安装插件定位，业务工作目录始终是用户项目。
- Agent 前置说明只负责路由；子代理已被委派时直接执行正文，不递归委派自身。无协作能力时内联执行，并明确无法提供独立审查上下文。
- 不继承 Claude 的模型和权限配置；保留正文中的只读审查、阶段门禁、用户确认和安全要求。
- 非 Codex 宿主继续使用原生 Agent；薄入口不得改变既有注册关系。
- `kb-loader` 优先读取当前上下文和当前平台指令中的知识库声明，不再强制依赖 Claude 全局文件。用户显式配置的外部知识库仍受宿主文件权限约束。

## 安装与发布

本地市场模板保存在 `codex/marketplace.json`；保留 `.claude-plugin/marketplace.json`。新增源码 `.agents/plugins/marketplace.json`，使用 `git-subdir` 指向同仓库 `codex-dist` 分支的 `plugins/my-ext`。用户直接添加源码 Git 市场，实际安装的是完整组装包，不把源码根目录作为插件安装。

`.github/workflows/codex-release.yml` 在正式 Release 发布或默认分支手动触发时执行。构建任务验证 Codex、共享内容、版本与 JavaDoc，然后组装并上传包含隐藏文件的产物。发布任务依赖构建成功，通过普通 Git 提交更新 `codex-dist`，不强制推送。保留 `SOURCE_COMMIT` 追溯源码，产物分支不参与手工维护。首次使用需先合并源码市场入口，再执行首次发布。

实施对照验证发现：本机 Codex 能添加市场，但本地插件与市场同处根目录时可用列表为空；使用子目录插件可成功安装，是否存在 Claude 清单不影响此结果。新增 `scripts/codex/stage-marketplace.mjs`，按 npm 发布清单在用户指定的新目录生成本地市场及 `plugins/my-ext/` 安装产物，保留源码结构。拒绝覆盖已有目录或向源码目录内输出，不重复维护 Skill 正文。

扩展现有 npm 文件清单，包含 Codex 清单、执行契约、Agent 原文及 Skill 依赖模板。现有版本同步脚本追加 Codex 清单，不升级版本或改动旧平台安装引用。

## 验证

沿用 Node.js 标准测试框架。先添加缺失清单、适配入口、资源闭包和版本漂移测试并观察失败，再实现。验证 npm 打包后的资源引用、共享 Skill 可移植性、官方技能清单校验与现有回归测试。基线已存在的 OpenCode 漂移单独记录，不通过重写平台行为掩盖失败。

## 官方依据

2026-09-10 已读取 [Package your plugin](https://developers.openai.com/plugins/build/plugins)：`.codex-plugin/plugin.json` 保持兼容支持，`skills` 可指向根 `skills/`，现有 `.claude-plugin/marketplace.json` 可作为兼容市场入口；`codex plugin marketplace add` 支持本地路径和 Git 来源。
