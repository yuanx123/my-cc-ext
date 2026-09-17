# Claude Code 与 OpenCode 双平台兼容设计

- 文档版本：1.1
- 状态：已批准
- 最后更新：2026-07-23

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-07-23 | 初始双平台兼容设计 |
| 1.1 | 2026-07-23 | 明确 Skill 命名、instructions 加载、Agent 生成与权限、Git 分发及契约测试 |

## 1. 背景

当前仓库通过 `.claude-plugin/plugin.json` 和
`.claude-plugin/marketplace.json` 作为 Claude Code 插件及市场发布，根目录
`skills/` 和 `agents/` 由 Claude Code 插件机制发现。

第一阶段需要在不破坏现有 Claude Code 安装方式、注册名称和行为的前提下，
参考 `superpowers` 插件的多平台架构，增加 OpenCode 原生支持。

## 2. 目标

- Claude Code 与 OpenCode 共用根目录 `skills/`，Skill 只维护一份。
- 保留现有 Claude Code Marketplace 安装和版本管理方式。
- OpenCode 可通过 Git 包声明安装插件，无需复制或手动链接 Skill。
- OpenCode 能发现全部可移植 Skill，并加载适配后的 Agent。
- 明确隔离平台相关的工具名、权限、模型和扩展开发知识。
- 提供可自动执行的 OpenCode 配置、打包、安装和注册测试。

## 3. 非目标

- 第一阶段不支持 Codex、Cursor、Gemini CLI、Copilot CLI 或 Factory Droid。
- 不建设 OpenCode Marketplace 或第三方 Registry。
- 不把 Claude Code Hook 迁移为通用跨平台 Hook。
- 不重写现有 Skill 的业务流程。
- 不改变现有 Claude Code Agent 和 Skill 的注册名称。
- 不在 Agent 中硬编码 OpenCode 使用的模型供应商或模型 ID。

## 4. 总体架构

采用“共享内容中心 + 平台薄适配器”架构：

```text
skills/                         # 共享 Skill，唯一内容源
agents/                         # Claude Code Agent
.claude-plugin/                 # Claude Code manifest 和 marketplace
.opencode/
  plugins/my-ext.js             # OpenCode 插件入口
  agents/                       # 生成的 OpenCode Agent 和独立扩展开发 Agent
  bootstrap.md                  # 通过 instructions 加载的平台适配规则
  INSTALL.md                    # OpenCode 安装说明
package.json                    # OpenCode Git/npm 包入口
AGENTS.md                       # 跨平台仓库规则入口
docs/README.opencode.md         # OpenCode 用户文档
scripts/opencode/               # Agent 生成、版本同步和静态检查脚本
tests/opencode/                 # OpenCode 适配器测试
```

根目录共享内容不依赖 `.opencode/`。OpenCode 适配器可以依赖根目录共享内容，
从而保持依赖方向单向，避免平台逻辑进入 Skill。

## 5. 组件设计

### 5.1 共享 Skill

根目录 `skills/` 保持唯一事实来源。OpenCode 插件在配置阶段把该目录加入
OpenCode Skill 搜索路径，不生成 `.opencode/skills/` 副本。

第一阶段保留现有 Skill 目录名和 frontmatter `name`，OpenCode 中的 Skill 也使用
这些无前缀名称。OpenCode Skill 不承诺 `my-ext-` 命名空间；安装文档必须说明
同名冲突风险，静态检查必须保证本插件内部名称唯一。不得为了 OpenCode 加前缀而
修改现有 Claude Code Skill 注册名称。

Skill 中与 Claude Code 强绑定的描述按以下规则处理：

- 正文优先改为“读取文件、搜索内容、编辑文件、执行命令”等平台无关语义，避免
  直接要求调用 `Read`、`Glob`、`Grep`、`Edit`、`Bash` 等平台工具名。
- 绝对路径改为仓库相对路径或“读取当前项目规范”的语义描述。
- `CLAUDE.md` 改为优先读取 `AGENTS.md`，必要时再读取平台专用规则。
- 无法用映射保持语义一致的指令才进行最小的平台无关改写。
- 保留的平台专属词必须进入显式 allowlist，并由 portability lint 检查。

### 5.2 OpenCode 插件入口

`.opencode/plugins/my-ext.js` 是 `package.json` 的 `main` 入口，职责限定为：

1. 解析插件包根目录。
2. 在 OpenCode `config` hook 中去重追加根目录 `skills/` 到
   `config.skills.paths`。
3. 去重追加 `.opencode/bootstrap.md` 到 `config.instructions`，由 OpenCode
   原生指令加载机制处理，不修改用户消息。
4. 读取并注册 `.opencode/agents/*.md` 到 `config.agent`。
5. 对 Agent 文件和解析结果使用模块级缓存。

插件不得修改用户已有的 Skill 路径、Agent 配置或权限。所有配置采用追加或
按 `my-ext-*` 名称合并的方式；同名用户配置优先，插件不静默覆盖。

本地 `.opencode/plugins/` 入口与包配置入口同时启用时，OpenCode 可能分别加载
两次。仓库开发文档明确禁止在本仓库内再次通过 `plugin` 数组加载自身；插件仍需
对 Skill 路径和 instructions 路径做幂等去重，但不把模块级缓存视为跨实例去重。

### 5.3 OpenCode Agent

OpenCode Agent 使用 `my-ext-*` 前缀规避全局名称冲突：

- `my-ext-db-ops`
- `my-ext-feature-dev`
- `my-ext-fix`
- `my-ext-superpowers-planner`
- `my-ext-opencode-ext-dev`

前四个 Agent 以现有 `agents/<name>/AGENT.md` 为业务流程来源，通过 Node.js
生成脚本产生 OpenCode frontmatter 和平台术语适配后的文件。生成文件提交到仓库，
文件头记录来源和内容摘要；检查模式重新生成到内存并比较结果，防止手工修改和正文
漂移。生成过程只允许声明式映射，不改变业务步骤。

`cc-ext-dev` 不进行机械转换，因为正文描述的是 Claude Code 扩展体系；OpenCode
单独维护 `my-ext-opencode-ext-dev`，只介绍 OpenCode Agent、Skill、Plugin、MCP
和权限。

所有 OpenCode Agent 显式声明 `mode: subagent`，不声明 `model`，从调用它的主
Agent 继承模型。权限使用 OpenCode `permission` 字段而不是已废弃的 `tools`
字段，并至少明确：

- `read`、`glob`、`grep`、`skill`：允许。
- `edit`：询问。
- `bash`：默认询问，仅对明确的只读命令设置允许规则。
- `external_directory`：默认拒绝；任务确需访问时由用户显式授权。
- `task`：仅允许设计中列出的 `my-ext-*` 子代理；不使用全局通配放行。

数据库操作没有独立的 OpenCode 权限键。任何真实数据库连接或执行必须通过 Bash、
MCP 或自定义工具对应的权限规则继续询问，生成 SQL 文本不等同于执行 SQL。

### 5.4 Bootstrap

`.opencode/bootstrap.md` 只包含平台适配信息，不重复 Skill 和 Agent 的完整内容：

- Claude Code 工具名到 OpenCode 工具名的映射。
- Skill 加载方式。
- 子代理委托方式。
- 用户提问、待办和文件编辑工具的对应语义。
- OpenCode Agent 名称与现有 Claude Code Agent 名称的对应关系。

bootstrap 作为 `config.instructions` 的一个路径注册，由 OpenCode 原生加载。
插件不使用 `chat.message` 或实验性消息转换 hook，不维护按会话注入状态，也不把
bootstrap 内容写入用户消息历史。

### 5.5 项目规则

新增 `AGENTS.md` 作为跨平台公共规则入口。`CLAUDE.md` 继续保存 Claude Code
专用的插件命名、安装和自动路由说明，并引用公共规则。

公共规则中不得出现某个平台专属的安装命令、工具函数签名或命名空间。

### 5.6 安装和分发

OpenCode 通过项目或用户 `opencode.json` 的 `plugin` 数组安装 Git 包：

```json
{
  "plugin": [
    "my-ext@git+https://github.com/yuanx123/my-cc-ext.git#v1.0.10"
  ]
}
```

`package.json` 提供包名、版本、ES Module 类型和 `.opencode/plugins/my-ext.js`
入口，并通过 `files` 明确包含插件入口、bootstrap、OpenCode Agent 和共享
`skills/`。通过 `engines.opencode` 声明已验证的最低 OpenCode 版本。

OpenCode 官方文档主要承诺 npm 包安装；Git specifier 依赖当前 OpenCode 的 Bun
安装实现。因此第一阶段必须用固定 tag 或 commit 安装，禁止文档示例跟随默认分支，
并以真实 OpenCode 安装烟测作为发布门禁。未来若 Git 安装不再受支持，可发布相同
`package.json` 的 npm 包作为兼容路径，不改变适配器结构。Claude Code 继续使用
现有 Marketplace，不受 `package.json` 影响。

## 6. 数据流

```text
OpenCode 启动
  -> 从 opencode.json 安装固定 tag/commit 的 Git 包
  -> 执行 .opencode/plugins/my-ext.js
  -> config hook 去重追加 skills.paths
  -> config hook 去重追加 instructions: bootstrap.md
  -> config hook 读取并合并 my-ext-* subagent
  -> 模型按需调用共享 Skill 或 OpenCode Agent
```

后续消息使用 OpenCode 已解析的配置；插件不执行逐消息注入。

## 7. 错误处理

- 找不到 `skills/`：该插件注册失败并报告解析后的绝对路径，不声称终止整个
  OpenCode 进程。
- 找不到 `bootstrap.md`：该插件注册失败并报告明确错误，不注册空 instructions。
- 单个 Agent frontmatter 无效：指出文件名和解析错误，避免静默跳过。
- 用户已有同名 Agent：保留用户配置并记录冲突信息。
- 重复调用 `config` hook：Skill 路径和 instructions 路径保持幂等。
- 检测到仓库本地入口和包入口同时配置：记录明确警告并指向卸载说明。
- Windows 路径：统一使用 `node:path`，禁止手工拼接 `/` 或 `\\`。

错误信息不得输出用户环境变量、Token、完整私有配置或其他敏感内容。

## 8. 版本管理

以下文件的版本必须一致：

- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json` 的 `plugins[0].version`
- `package.json`

`package.json.version` 是版本更新入口，不增加第四个版本事实来源。检查和更新脚本
至少支持：

- 检查版本漂移。
- 从 `package.json.version` 更新两个 Claude Code manifest 声明位置。
- 检查安装文档中的示例 tag 是否与发布版本一致。

第一阶段脚本必须支持 Windows 开发环境；不把仅依赖 Bash 的脚本作为唯一入口。

## 9. 测试设计

### 9.1 静态验证

- 所有 JSON manifest 可解析。
- 三个版本字段一致。
- Skill frontmatter 的 `name` 与目录名一致且无重复。
- OpenCode Agent 名称均带 `my-ext-` 前缀且无重复。
- 共享 Skill 中不存在工作区外绝对路径或未列入 allowlist 的平台专属工具名。
- 共享 Skill 不以 `CLAUDE.md` 作为唯一项目规则来源。
- 四个生成式 OpenCode Agent 与 Claude Code 来源及生成脚本结果一致。

### 9.2 OpenCode 插件测试

- 插件入口可作为 ES Module 加载。
- `config` hook 保留已有 Skill 路径并追加根目录 `skills/`。
- 重复调用 `config` hook 不产生重复路径。
- `config` hook 保留已有 instructions 并追加 `bootstrap.md`，重复调用保持幂等。
- OpenCode Agent 被正确解析和注册。
- 用户同名 Agent 不被覆盖。
- 所有注册 Agent 均为 `subagent`、不固定模型并满足权限基线。
- Agent 文件和解析结果使用缓存，重复调用不重复读盘。
- Windows 和 POSIX 路径夹具产生相同注册结果。
- 同时出现本地入口和包入口时产生明确诊断，配置合并仍保持幂等。

### 9.3 打包与 OpenCode 契约测试

- 打包清单包含入口、bootstrap、OpenCode Agent 和全部共享 Skill，不包含敏感文件。
- 在临时项目中通过固定 Git tag/commit 安装包并运行 OpenCode 配置解析。
- 使用 `opencode debug config` 或等价公开接口验证最终的 `skills.paths`、
  `instructions` 和 `agent` 配置。
- 至少覆盖 Windows 和 Linux，以及最低支持 OpenCode 版本和当前稳定版本。
- Git 安装、入口解析或配置契约任一失败时阻止发布。

### 9.4 回归验证

- Claude Code manifest 和 marketplace 内容仍可解析。
- 现有 Python 测试通过。
- Claude Code 原有 Agent、Skill 数量和名称不变。

## 10. 文档

主 README 增加平台选择入口，保留 Claude Code 安装说明，并链接
`docs/README.opencode.md`。OpenCode 文档覆盖：

- Git 包安装与固定版本。
- Git 安装属于已测试兼容路径而非永久 API 保证，以及 npm 兼容退路。
- 项目级和用户级配置示例。
- Skill 和 Agent 的发现方式。
- 名称对应关系。
- Skill 保持无前缀名称及其冲突处理方式。
- 禁止在仓库本地入口已自动加载时再次配置包入口。
- Windows 常见安装问题。
- 升级与卸载方法。

## 11. 风险与控制

- **OpenCode 配置 API 变化**：把 `skills.paths`、`instructions` 和 `agent` 配置写入
  限制在单个插件入口，并通过最低版/稳定版契约测试发现变化。
- **Git 插件安装实现变化**：固定版本并执行真实安装烟测；必要时切换到 npm 分发。
- **Agent 正文漂移**：四个业务 Agent 由 Claude Code 来源确定性生成，CI 比较生成
  结果；OpenCode 扩展开发 Agent 因业务领域不同而独立维护。
- **工具映射不完整**：共享内容优先使用平台无关语义，bootstrap 只保留无法消除的
  当前映射，portability lint 维护显式 allowlist。
- **全局名称冲突**：OpenCode Agent 使用稳定的 `my-ext-` 前缀；Skill 保留现有
  无前缀名称并在文档中声明冲突策略。
- **重复加载**：禁止本地入口和包入口同时配置，所有数组合并保持幂等，不依赖
  模块缓存实现跨实例互斥。
- **Windows 安装差异**：使用 Node.js 文件 API 和路径 API，测试不依赖符号链接。

## 12. 实施边界

本设计批准后，实施计划按以下顺序拆分：

1. 公共规则、Skill 平台中立化和 portability lint。
2. OpenCode Agent 生成脚本、生成产物及独立扩展开发 Agent。
3. OpenCode 插件入口和通过 `config.instructions` 注册的 bootstrap。
4. `package.json`、固定版本安装文档和版本同步。
5. 单元测试、打包检查、真实 OpenCode 契约测试和 Claude Code 回归验证。

每一步都必须保持 Claude Code 现有安装方式可用。
