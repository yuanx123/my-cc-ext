# 在 OpenCode 中使用 my-ext

## 环境要求

- OpenCode >=1.15.10
- Node.js >=20.11

## 使用固定 Git 引用安装

项目级和用户级配置使用相同的不可变发布引用：

```json
{
  "plugin": [
    "my-ext@git+https://github.com/huhuhu-999/my-cc-ext.git#v1.0.22"
  ]
}
```

项目级安装时，将该配置加入项目的 `opencode.json`；用户级安装时，将其加入用户级 `opencode.json`。不要从默认分支安装。发布元数据也可以指定完整的 40 位 commit，此时只能用该不可变完整 commit 替换标签。

OpenCode 当前委托 Bun 安装包，因此 Git 安装是已验证的兼容路径，但该行为不是永久的 OpenCode API 保证。如果 Git 包安装变得不兼容，可在同一包发布后使用 `my-ext@1.0.10` 作为 npm 兜底安装方式；两种方式使用相同的 `package.json` 入口。

## 注册机制

插件配置钩子会显式、幂等地完成以下注册：

- 将根目录 `skills/` 追加到 `skills.paths`。
- 将 `.opencode/bootstrap.md` 追加到 `config.instructions`。
- 从包内 Markdown 读取 6 个 `my-ext-*` Agent，并以内联提示词形式注册到 `config.agent`；包内 Agent 文件不会被自动发现。

共享 Skill 保留现有的不带前缀名称。其他插件注册同名 Skill 时会发生冲突，需要移除其中一个冲突包。对于 Agent，存在同名用户 Agent 时以用户配置为准，插件不会覆盖它。

## 本地开发

本仓库会自动加载本地 `.opencode/plugins/my-ext.js`。不要再把 Git 包或 npm 包加入本仓库的 `plugin` 数组。插件检测到两种入口同时存在时会发出警告，但重复插件实例无法共享模块缓存，因此不能同时启用。

## Windows

实现使用 Node 路径和文件 API，不需要符号链接。请在仓库根目录使用 PowerShell 7 或其他已将 Node.js 加入 `PATH` 的 shell 执行命令。JSON 中的固定 Git 标签应与示例完全一致；无需配置符号链接或复制 Skill 目录。

## 升级

修改对应项目级或用户级 `opencode.json` 中的固定标签或完整 40 位 commit，然后重启 OpenCode。只能使用已通过 OpenCode 冒烟门禁的发布引用。

## 卸载

从对应项目级或用户级 `opencode.json` 中移除 `my-ext@...` 条目，然后重启 OpenCode。无需清理复制的 Skill 目录或符号链接。
