# 在 Codex 中使用 my-ext

## 安装

使用支持插件命令的 Codex 和新版 Git，在终端执行：

```powershell
codex plugin marketplace add huhuhu-999/my-cc-ext
codex plugin add my-ext@my-cc-ext
codex plugin list --marketplace my-cc-ext --json
```

确认结果包含 `installed: true`、`enabled: true`，然后开启新任务，必要时重启 Codex。使用者无需克隆源码或手动构建，市场会从 `codex-dist` 分支获取已发布的插件。

## 使用

在目标项目中打开 Codex，通过技能选择器选择 `my-ext`，或直接指定技能：

```text
使用 $feature-dev-agent，根据需求文档开发功能。
使用 $code-review-agent 审查当前改动，只报告问题。
使用 $add-javadoc，为 Service 补充文档注释。
```

Agent 通过以下工作流 Skill 暴露，正文仍只维护在 `agents/<name>/AGENT.md`：

| 工作流入口 | Agent 唯一来源 | 用途 |
|---|---|---|
| `$feature-dev-agent` | `agents/feature-dev/AGENT.md` | 功能开发 |
| `$superpowers-planner-agent` | `agents/superpowers-planner/AGENT.md` | 设计与计划 |
| `$code-review-agent` | `agents/code-review/AGENT.md` | 深度代码审查 |
| `$fix-agent` | `agents/fix/AGENT.md` | 复杂缺陷排查 |
| `$db-ops-agent` | `agents/db-ops/AGENT.md` | 数据库、SQL、Entity、Mapper |
| `$cc-ext-dev-agent` | `agents/cc-ext-dev/AGENT.md` | 插件与扩展开发 |

共享技能也可直接使用，例如 `$gen-java-entity`、`$add-javadoc`。需要知识库时，在目标项目的 `AGENTS.md` 中声明「知识库根：」和实际路径，并允许访问。未配置且项目没有强制要求时，按项目已有规范执行。

这些入口以工作流 Skill 运行，模型、权限和子代理能力由当前 Codex 会话决定。适配细节见 [Agent 执行契约](../codex/agent-adapter.md)。

薄入口源码位于 `codex/skills/<name>-agent/SKILL.md`，仅在 Codex 安装包中位于 `skills/<name>-agent/SKILL.md`。入口统一先读取 [Agent 执行契约](../codex/agent-adapter.md)，再读取上表对应的 Agent 原文。

## 升级与卸载

维护者发布新版本后，执行：

```powershell
codex plugin marketplace upgrade my-cc-ext
codex plugin add my-ext@my-cc-ext
codex plugin list --marketplace my-cc-ext --json
```

确认显示预期版本后开启新任务，无需重复添加市场。

卸载插件执行 `codex plugin remove my-ext@my-cc-ext`；不再使用市场时，再执行 `codex plugin marketplace remove my-cc-ext`。

## 开发与发布

**推送源码只会触发检查，不会发布 Codex 插件。发布正式 GitHub Release 后，才会自动构建并更新分发分支。**

按本仓库的流程操作：

1. 在新分支修改源码：共享技能在 `skills/`，Agent 正文在 `agents/`，Codex 入口在 `codex/skills/`。
2. 将 `package.json` 的 `version` 改为尚未发布的新版本，再执行：

   ```powershell
   npm run generate:agents
   npm run version:sync
   npm test
   ```

3. 检查并提交源码、生成文件和版本同步改动，合并到 `master` 并推送。
4. 打开 [新建 Release 页面](https://github.com/huhuhu-999/my-cc-ext/releases/new)：新建标签 `v<版本号>`，Target 选 `master`，填写更新说明，不勾选 **Set as a pre-release**，点击 **Publish release**。例如包版本为 `1.0.30`，标签就是 `v1.0.30`；不要复用旧标签。
5. 打开 [Codex Release 工作流](https://github.com/huhuhu-999/my-cc-ext/actions/workflows/codex-release.yml)，确认 `build`、`opencode-contract`、`publish` 全部成功，再按上面的更新命令验证安装版本。

工作流会执行仓库测试、组装插件、验证 OpenCode 真实安装，再更新 `codex-dist`。源码目录保持原样，分发分支由工作流维护；任一门禁失败都不会发布新产物。

首次构建或需要重新构建时，也可在同一工作流页面点击 **Run workflow**，选择 `master` 运行。手动运行不会自动提升版本号；日常更新仍按上述正式 Release 流程发布。

### 本地验证（可选）

发布前需要在 Codex 中试用改动时，在仓库根目录执行：

```powershell
npm run stage:codex -- "$env:USERPROFILE/my-ext-codex-local"
codex plugin marketplace add "$env:USERPROFILE/my-ext-codex-local"
codex plugin add my-ext@my-cc-ext-local
```

需要 Node.js 和 npm，输出路径必须是新的仓库外目录。安装后开启新任务验证。再次打包时换用新目录，先移除旧登记 `codex plugin marketplace remove my-cc-ext-local`，再添加新路径并安装。结束试用后可移除本地插件与市场。

## 常见问题

- **出现 `Sparse checkout leaves no entry on working directory`**：执行 `git --version` 和 `Get-Command git`，确认实际使用的 Git。升级 [Git for Windows](https://git-scm.com/downloads/win)，确保 PATH 优先使用新版，然后完全退出并重启终端和 Codex。仅在某个终端修改 PATH 不会影响已运行的 Codex。
- **推送后插件没有更新**：检查是否已发布正式 Release，以及发布工作流是否全部成功；草稿和预发布不会更新稳定插件。
- **发布时无法推送 `codex-dist`**：检查 GitHub Actions 的仓库内容写权限，以及分支规则是否允许工作流推送。
