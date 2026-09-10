# 在 Codex 中使用 my-ext

## 安装

### 从 Git 市场安装

默认分支包含市场入口且 `Codex Release` 首次发布成功后，执行：

```powershell
codex plugin marketplace add huhuhu-999/my-cc-ext
codex plugin add my-ext@my-cc-ext
codex plugin list --marketplace my-cc-ext --json
```

无需手动打包或安装 Node.js。市场文件 `.agents/plugins/marketplace.json` 指向 `codex-dist` 分支中的 `plugins/my-ext`，Codex 获取的是已组装的完整插件。安装后开启新任务。

首次发布前上述入口尚不可用；开发验证可使用下面的本地组装方式。

### 从源码组装安装包

在包含本次适配的仓库根目录执行，将可安装文件输出到一个新的仓库外目录：

```powershell
codex --version
npm run stage:codex -- "$env:USERPROFILE/my-ext-codex-local"
codex plugin marketplace add "$env:USERPROFILE/my-ext-codex-local"
codex plugin add my-ext@my-cc-ext-local
codex plugin list --marketplace my-cc-ext-local --json
```

打包需要 Node.js 和 npm，以现有 npm 发布文件清单为基础，将 `codex/skills/` 的专属入口组装进安装包的 `skills/`，并转换入口中的相对链接。源码根 `skills/` 只保留共享技能。拒绝覆盖已存在的输出目录。输出是安装产物，不是另一份维护的源码。保留该目录供后续 Codex 市场发现；可自行选择其他新的仓库外路径。

上述命令使用支持 `codex plugin add` 的 CLI。若本机没有该子命令，升级 Codex，或在添加市场后从桌面端 Plugins 目录选择 `my-cc-ext-local` 并安装 `my-ext`。安装后开启新任务，必要时重启应用，让技能发现重新加载。

本地市场将插件放在 `plugins/my-ext/`，插件入口为 `.codex-plugin/plugin.json`。本机 CLI 验证中，指向市场根目录自身的本地插件不会出现在可用列表，因此不能直接用 `codex plugin marketplace add .` 安装当前工作区。打包方案无需移动源码或创建符号链接，也不需要安装 Claude Code 或 OpenCode。添加市场及安装插件会更新本机 Codex 配置。

### 分发安装包

Codex 统一安装组装后的产物。可将输出目录整体分发，接收方添加该目录为市场并安装 `my-ext@my-cc-ext-local`。市场模板位于源码 `codex/marketplace.json`，打包时写入输出目录的 `.agents/plugins/marketplace.json`。

源码仓库可以作为 Git 市场添加，由市场转向发布分支；不要将源码根目录或原始 npm 包直接当作完整插件安装，其中根 `skills/` 不含专属工作流入口。Claude Code 与 OpenCode 仍沿用原安装方式。

## 使用

共享 Skill 由 Codex 按描述选择，也可显式指定，例如 `$gen-java-entity`、`$add-javadoc`。如果同名 Skill 来自多个插件，使用宿主技能选择器确认选择 `my-ext` 的入口。

Agent 通过以下工作流 Skill 暴露，正文仍只维护在 `agents/<name>/AGENT.md`：

| Codex 入口 | Agent 唯一来源 | 用途 |
| --- | --- | --- |
| `$cc-ext-dev-agent` | `agents/cc-ext-dev/AGENT.md` | 扩展开发，按目标平台规范执行 |
| `$code-review-agent` | `agents/code-review/AGENT.md` | 只读深度代码审查 |
| `$db-ops-agent` | `agents/db-ops/AGENT.md` | 数据库、SQL、Entity、Mapper |
| `$feature-dev-agent` | `agents/feature-dev/AGENT.md` | 从需求文档推进功能开发 |
| `$fix-agent` | `agents/fix/AGENT.md` | 复杂缺陷调查和修复 |
| `$superpowers-planner-agent` | `agents/superpowers-planner/AGENT.md` | 设计规范和实施计划 |

例如：

```text
使用 $feature-dev-agent，根据当前项目的需求文档推进功能开发。
使用 $code-review-agent 审查当前改动，只报告问题，不修改文件。
```

薄入口源码位于 `codex/skills/<name>-agent/SKILL.md`，仅在 Codex 安装包中位于 `skills/<name>-agent/SKILL.md`。入口统一读取 `codex/agent-adapter.md` 后再读取 Agent 原文。插件资源相对安装位置解析，业务文件、状态和命令始终位于当前用户项目。

## 知识库与能力要求

在目标项目适用的 `AGENTS.md` 或当前平台用户指令中声明「知识库根：」及实际路径，也可在任务中明确提供。`kb-loader` 会按知识库索引解析规范；不会自动读取其他平台的用户配置。知识库不随插件打包，外部目录访问需要当前 Codex 宿主允许。

本插件不安装 Agent 正文引用的第三方 Skill。工作流需要的额外技能未安装时会报告缺失，不会假称已执行。

Claude Agent 的 `model`、`tools`、`permissionMode` 不会成为 Codex 配置。实际模型、工具和权限由当前 Codex 会话控制；只读审查与阶段确认要求仍然有效。工作流 Skill 不是具有独立权限配置的原生 Agent 注册。

支持且允许子代理时可委派；不支持时内联执行。内联审查没有独立子代理上下文，执行时必须说明这一限制。其他平台继续使用原生 Agent；这些新增入口的描述限定于 Codex。

## 升级与卸载

Git 市场安装的用户执行：

```powershell
codex plugin marketplace upgrade my-cc-ext
codex plugin add my-ext@my-cc-ext
```

随后开启新任务。卸载使用 `codex plugin remove my-ext@my-cc-ext`。本地组装安装继续按下面步骤处理。

更新时重新打包到新的目录，移除旧本地市场登记并添加新路径，再重新安装并开启新任务：

```powershell
npm run stage:codex -- "$env:USERPROFILE/my-ext-codex-local-next"
codex plugin marketplace remove my-cc-ext-local
codex plugin marketplace add "$env:USERPROFILE/my-ext-codex-local-next"
codex plugin add my-ext@my-cc-ext-local
```

卸载插件：

```powershell
codex plugin remove my-ext@my-cc-ext-local
```

若整个市场不再使用，可执行 `codex plugin marketplace remove my-cc-ext-local`，然后自行清理不再使用的打包目录。

## 开发验证

### 自动发布

`.github/workflows/codex-release.yml` 在正式 GitHub Release 发布时运行，也可在默认分支手动运行 `Codex Release` 完成首次发布。Release 标签须为 `v` 加 `package.json` 版本，源提交必须已经进入默认分支；预发布不会更新稳定插件。

流程先执行 Codex、共享资源、可移植性、版本和 JavaDoc 检查，然后打包；发布任务只接收成功构建的产物，用普通 Git 提交更新 `codex-dist`，不强制推送。该分支仅存自动生成的文件与 `SOURCE_COMMIT`，不要手动修改。验证或推送失败时原远程产物保持不变。

GitHub Actions 的发布任务需要仓库内容写权限；若组织策略限制该权限或分支规则阻止机器人推送，需要在仓库设置中允许此工作流更新 `codex-dist`。默认分支和 Claude/OpenCode 文件不会被发布任务改写。

首次启用顺序：合并适配分支到默认分支，然后手动运行 `Codex Release`，确认成功后对外提供 Git 安装地址。后续更新先同步插件版本，再发布对应 Release。当前工作流的验证范围是 Codex 及共享内容，不代表已有 OpenCode 全量基线问题已修复。

### 本地检查

```powershell
npm run test:codex
npm run lint:portability
npm run version:check
npm test
```

Codex 测试验证清单、Agent 原文引用、知识库可移植性、npm 生产资源和版本漂移修复。`npm test` 还会运行原有 OpenCode 与 JavaDoc 检查。版本以 `package.json` 为准，现有 `npm run version:sync` 同步各平台清单。

官方依据：[Package your plugin](https://developers.openai.com/plugins/build/plugins)。本仓库使用仍受支持的 Codex 兼容清单，保留现有平台目录结构。
