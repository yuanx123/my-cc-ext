# 适配后加固设计（追溯补记）

本文件补齐 `2026-09-10-codex-adaptation-design.md` 未覆盖、却在其收尾时一并落在工作区的改动。这些内容提交时对既有 spec/plan 的追溯为空，经 2026-09-14 代码审查指出后补记于此，使每一项都有可查的设计依据。

## 背景

2026-09-10 的 Codex 增量适配收尾时，工作区除设计内的改动外还含多平台 CI 收敛、统一测试入口、三平台 README 拆分与一处权限放宽。这些内容未写入 spec，审查时无法判断是否越界。本文件按「改了什么 / 为什么 / 边界」逐项补记。

## 统一测试入口

- 新增 `scripts/test-discovery.mjs`（纯函数 `discoverTestFiles`）与 `scripts/run-tests.mjs`（CLI 入口）。
- 原因：旧写法 `node --test tests/<suite>/*.test.mjs` 依赖 shell 展开 glob。Node 20.11 不支持 `--test` 的 glob 参数，Windows shell 也不展开，跨平台 CI 矩阵因此无法成立。
- `package.json` 的 `test:opencode`、`test:codex` 改为调用该入口；`npm test` 成为唯一测试入口。
- 边界：只做文件发现与 spawn，不改变任何用例语义。`tests/opencode/test-discovery.test.mjs` 守住发现集合与 spawn 参数的对应关系。

## 跨平台 CI 矩阵

- 新增 `.github/workflows/ci.yml`：`ubuntu-latest` × `windows-latest` × Node `20.11` / `22` 四格矩阵，统一执行 `npm test`。
- `codex-release.yml` 的逐条验证步骤收敛为一句 `npm test`，新增 `opencode-contract` 任务复用同名可复用工作流；`publish` 改为 `needs: [build, opencode-contract]`。
- 边界：收敛不得减少原有检查项。原列出的可移植性、版本、共享内容与 JavaDoc 检查均包含在 `npm test` 内，并由 `tests/codex/release.test.mjs` 的六项门禁断言守住（该断言经变异验证非空）。

## 行尾钉死为 LF

- 新增 `.gitattributes`，内容 `* text=auto eol=lf`。
- 原因：本仓库是「Markdown 产物 + 字节级校验」形态——`generate-agents.mjs --check` 与 `generator.test.mjs` 直接比对生成文件内容；而 `core.autocrlf=true` 的新检出会把工作区变成 CRLF，使这些断言失败。CI 引入 `windows-latest` 后，该缺陷从本地问题升级为常态红灯。
- 实测：钉死前，全新检出下 `test:opencode` 5 项失败（基线 HEAD 为 7 项）；钉死后，全新检出 0 个 CRLF 文件，GitHub Actions 四格全绿。
- 边界：仅约束行尾，不改文件内容。

## 三平台 README 拆分

- 新增 `docs/README.claude.md`；`docs/README.opencode.md` 与 `docs/README.codex.md` 各自维护平台安装与使用说明；根 `readme.md` 只保留仓库总览与索引。
- 原因：原先平台内容混在根 `readme.md`，任一平台变更都会产生跨平台噪音。
- 边界：平台专属命令与权限只写入对应平台文档，共享规则仍只留在 `skills/` 与 `agents/`。Codex 文档保留「入口 ↔ Agent 源文件」映射，维护者可据此定位正文。

## external_directory 由 deny 放宽为 ask

- `scripts/opencode/agent-mappings.mjs` 的 `PERMISSION_BASELINE.external_directory` 由 `"deny"` 改为 `"ask"`，被全部 6 个生成 Agent 继承，随包发布。
- 原因：工程知识库位于目标项目工作区之外。`deny` 会彻底阻断 `kb-loader` 的知识库加载，使 OpenCode 端知识库功能不可用；`ask` 保留用户按次授权，拒绝后仍按 kb-loader 的不可用分支处理，不绕过限制。
- 授权：2026-09-14 经用户明确确认接受该放宽，单独成提交（`chore(opencode): external_directory 权限由 deny 放宽为 ask`）以便审计与回滚；回退该提交即可恢复 `deny`。
- 边界：这是本仓库唯一一处安全控制放宽。同批其他权限变动均为收紧（新增 `READ_ONLY_PERMISSION` 将审查 Agent 限定为 edit:deny + 4 条精确只读命令）。

## 未采纳项

- **Qodana**：随本批引入 `qodana.yaml` 与 `.github/workflows/qodana_code_quality.yml`，但依赖未配置的 `QODANA_TOKEN`，导致每次推送持续失败（日志：`Qodana Linters require connection to Qodana Cloud`）。经确认后于 2026-09-15 移除，不作为常态化门禁。如需重新引入，应先完成 Qodana Cloud 注册与 secret 配置，再一并补齐触发条件、并发控制、权限收窄与失败模式定义。
- **`docs/AGENTS.codex.global.md`**：本批生成的 Codex 全局指令副本，含硬编码知识库根路径与个人称呼，与 `kb-loader` 的「唯一配置点」原则冲突，且全仓库零引用、不入 npm 文件清单。未提交即移除。

## 验证

`npm test` 为唯一入口，覆盖可移植性、生成产物一致性、版本同步、Codex 与 OpenCode 回归及 JavaDoc 检查。跨平台矩阵在 GitHub Actions 上四格实跑验证，不依赖本地模拟。
