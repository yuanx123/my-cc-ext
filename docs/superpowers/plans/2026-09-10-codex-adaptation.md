# Codex 增量适配实施计划

**目标：** 在独立分支增加 Codex 支持，保留目录和现有平台行为。

**架构：** Codex 清单复用根 Skill；薄入口读取现有 Agent，平台差异集中于 `codex/agent-adapter.md`。

**技术栈：** Markdown、JSON、Node.js 标准测试框架、现有 Python 校验工具。

## 用户确认的目录调整

以下调整覆盖初次实现中将专属入口放入根 `skills/` 的安排：

- [x] 先修改目录隔离测试，确认原结构导致失败。
- [x] 将 Codex 专属入口迁到 `codex/skills/`，修正源码相对链接；市场模板迁到 `codex/marketplace.json`。
- [x] 打包时合并专属入口到产物 `skills/` 并转换链接，原始 npm 包和共享技能目录不包含专属入口。
- [x] 安装文档统一使用组装产物，移除源码直接 Git 安装说明。
- [x] 验证新源码与产物的链接、共享技能不变、真实隔离安装，并清理临时目录。

## 任务与检查点

- [x] 检查现有清单、Agent 源、打包和版本脚本；核验官方格式及知识库。
- [x] 在 `tests/codex/plugin.test.mjs` 添加清单、Agent 引用、打包资源、知识库可移植性与版本漂移测试。运行 `node --test tests/codex/*.test.mjs`，确认缺少 Codex 文件导致失败。
- [x] 新增 `.codex-plugin/plugin.json`、`codex/agent-adapter.md` 和 `codex/skills/*-agent/SKILL.md`，正文仅保留执行契约及源文件链接。
- [x] 修改 `skills/kb-loader/SKILL.md`，从当前平台已加载的指令解析知识库声明；在 `scripts/opencode/sync-version.mjs` 的 `jsonTargets` 追加 `{ file: ".codex-plugin/plugin.json", keys: ["version"] }`。
- [x] 在 `package.json` 添加 Codex 生产资源和 `test:codex`，接入默认测试；更新测试 fixture 以携带 Codex 清单，保留既有平台契约。
- [x] 新增 `docs/README.codex.md`，更新 `readme.md` 的平台入口和目录说明。
- [x] 真实安装对照发现本地市场不列出自身根目录插件；通过 `scripts/codex/stage-marketplace.mjs` 组装安装产物，市场模板位于 `codex/marketplace.json`。
- [x] 运行 Codex 测试、插件/Skill 校验、打包检查及原有回归；区分新失败与基线失败。
- [x] 独立审查与最终 diff 检查；修正执行契约的插件根目录描述。
- [x] 清理会话临时目录，报告结果。变更留在分支工作区，不自动提交或发布。

## 验证结果

- 目录调整后重跑 Codex 与共享内容测试、可移植性和版本同步检查：通过。隔离 Codex 安装显示已安装并启用，安装缓存中的所有专属入口链接均可解析。

- `node --test tests/codex/*.test.mjs`：通过，包含本地市场打包、空格路径、拒绝覆盖与源码目录保护。
- 官方 `validate_plugin.py` 及新增入口、`kb-loader` 的 `quick_validate.py`：通过；缺失的 PyYAML 仅安装到会话临时目录。
- `npm run lint:portability`、`npm run version:check`、`npm run test:python`：通过。
- 本地真实安装：以临时隔离配置运行 Codex，添加打包市场、安装 `my-ext@my-cc-ext-local`，列表返回 `installed: true`、`enabled: true`；安装后的 Agent 原文和入口 Skill 与源码逐文件一致。
- `npm test`：被基线已有的 `check:agents` 生成文件漂移阻断，涉及 `.opencode/agents/my-ext-feature-dev.md` 和 `.opencode/agents/my-ext-code-review.md`。
- 单独运行 OpenCode 回归仍有基线问题：`agents.test.mjs` 和 `plugin-config.test.mjs` 的审查权限预期；`generator.test.mjs` 的旧 Agent 清单；`documentation.test.mjs` 和 `version-sync.test.mjs` 的旧版本常量。保留原 OpenCode 行为，未通过改权限或重新生成内容掩盖这些问题。
- 未运行带模型调用的业务工作流，也未发布远程分支；安装与资源发现验证不代表所有 Java 业务场景已端到端验证。
