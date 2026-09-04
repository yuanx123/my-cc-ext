# OpenCode 安装说明

环境要求：OpenCode >=1.15.10，Node.js >=20.11。

在本仓库之外使用时，将带固定发布标签的包加入项目级或用户级 `opencode.json` 的 `plugin` 数组：

```json
{
  "plugin": [
    "my-ext@git+https://github.com/huhuhu-999/my-cc-ext.git#v1.0.24"
  ]
}
```

本仓库会自动把 `.opencode/plugins/my-ext.js` 作为本地插件加载。本地开发时，不要再把 Git 包或 npm 包加入 `plugin` 数组，否则扩展会被重复加载。

配置钩子会以幂等方式把根目录 `skills/` 追加到 `skills.paths`，把 `.opencode/bootstrap.md` 追加到 `config.instructions`。由于包内 Agent 文件不会被自动发现，钩子还会在 `config.agent` 中显式注册 6 个 Agent。存在同名用户 Agent 时，以用户配置为准。共享 Skill 保留原有的不带前缀名称，因此可能与注册同名 Skill 的其他插件冲突。

Git 安装是基于 OpenCode 当前 Bun 安装器验证过的兼容路径，并非永久 API 保证。如果后续 Git 包安装机制发生变化，可在同一包发布后使用 `my-ext@1.0.10` 作为 npm 兜底安装方式。

项目级与用户级配置、Windows 注意事项、升级和卸载说明详见 `docs/README.opencode.md`。
