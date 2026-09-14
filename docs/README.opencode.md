# 在 OpenCode 中使用 my-ext

## 环境要求

- OpenCode >=1.15.10
- Node.js >=20.11

检查本机环境：

```powershell
opencode --version
node --version
```

## 使用固定 Git 引用安装

用户级配置路径：

- Windows：`%USERPROFILE%\.config\opencode\opencode.json`
- Linux / macOS：`~/.config/opencode/opencode.json`

文件不存在时可以新建。如果已有配置，只追加 `plugin` 字段或数组项，不要覆盖其他配置。

项目级和用户级配置使用相同的不可变发布引用：

```json
{
  "plugin": [
    "my-ext@git+https://github.com/huhuhu-999/my-cc-ext.git#v1.0.29"
  ]
}
```

项目级安装时，将该配置加入项目的 `opencode.json`；用户级安装时，将其加入用户级 `opencode.json`。不要从默认分支安装。发布元数据也可以指定完整的 40 位 commit，此时只能用该不可变完整 commit 替换标签。

OpenCode 当前委托 Bun 安装包，因此 Git 安装是已验证的兼容路径，但该行为不是永久的 OpenCode API 保证。如果 Git 包安装变得不兼容，可在同一包发布后使用 `my-ext@1.0.10` 作为 npm 兜底安装方式；两种方式使用相同的 `package.json` 入口。

## 注册机制

安装后完全退出并重新启动 OpenCode，然后执行 `opencode debug config`。解析后的配置应包含指向插件包 `skills/` 的 `skills.paths`、指向 `.opencode/bootstrap.md` 的 `instructions`，以及以下 Agent：

- `my-ext-db-ops`
- `my-ext-feature-dev`
- `my-ext-fix`
- `my-ext-code-review`
- `my-ext-superpowers-planner`
- `my-ext-opencode-ext-dev`

在对话中使用 `@my-ext-feature-dev`、`@my-ext-db-ops` 等名称调用 Agent；共享 Skill 由模型根据任务自动加载。

插件配置钩子会显式、幂等地完成以下注册：

- 将根目录 `skills/` 追加到 `skills.paths`。
- 将 `.opencode/bootstrap.md` 追加到 `config.instructions`。
- 从包内 Markdown 读取 6 个 `my-ext-*` Agent，并以内联提示词形式注册到 `config.agent`；包内 Agent 文件不会被自动发现。

共享 Skill 保留现有的不带前缀名称。其他插件注册同名 Skill 时会发生冲突，需要移除其中一个冲突包。对于 Agent，存在同名用户 Agent 时以用户配置为准，插件不会覆盖它。

## 知识库与权限

在目标项目的 `AGENTS.md` 或当前平台用户指令中声明「知识库根：」和实际路径。Agent 的外部目录访问默认询问授权；确认提示时核对路径，只批准当前任务需要的知识库目录。拒绝授权后不会绕过限制，按 `kb-loader` 的不可用分支处理。

未配置知识库且项目没有强制要求时，可以依据项目文件继续工作；必须标明未加载外部规范。项目明确要求知识库时，暂停依赖规范的步骤，先补齐配置或授权。

`my-ext-code-review` 禁止编辑和委派，只允许权限清单中固定的只读 Git 命令。加载 Skill 不会授予写权限。其他 Agent 的编辑与一般 shell 操作仍需授权。同名用户 Agent 会完整覆盖插件入口，使用自定义入口时须自行保留这些约束。

宿主未提供委派能力或当前任务禁止委派时，共享技能按其串行流程执行，不通过扩大权限绕过限制。

## 本地开发

必须使用包含 OpenCode 支持的固定发布标签或完整 40 位 commit。当前开发分支尚未发布时，只能在本仓库根目录启动 `opencode` 进行本地测试，不能通过远程引用完成用户级安装。

本仓库会自动加载本地 `.opencode/plugins/my-ext.js`。不要再把 Git 包或 npm 包加入本仓库的 `plugin` 数组。插件检测到两种入口同时存在时会发出警告，但重复插件实例无法共享模块缓存，因此不能同时启用。

## Windows

实现使用 Node 路径和文件 API，不需要符号链接。请在仓库根目录使用 PowerShell 7 或其他已将 Node.js 加入 `PATH` 的 shell 执行命令。JSON 中的固定 Git 标签应与示例完全一致；无需配置符号链接或复制 Skill 目录。

## 升级

修改对应项目级或用户级 `opencode.json` 中的固定标签或完整 40 位 commit，然后重启 OpenCode。只能使用已通过 OpenCode 冒烟门禁的发布引用。

## 卸载

从对应项目级或用户级 `opencode.json` 中移除 `my-ext@...` 条目，然后重启 OpenCode。无需清理复制的 Skill 目录或符号链接。
