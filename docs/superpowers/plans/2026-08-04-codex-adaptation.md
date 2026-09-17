# Codex 完整适配实施计划

> **给代理工作者：** 必需的子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施此计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 将现有 Claude Code 插件完整适配为 Codex 原生插件，同时让 5 个 Agent 的正文继续只维护在 `agents/<name>/AGENT.md`。

**架构：** 新增 Codex 原生清单并复用根 `skills/`。每个 Claude Agent 通过一个只声明触发条件和源文件路径的薄 Skill 暴露给 Codex，所有工具、委派和宿主路径转换集中在 `codex/agent-adapter.md`，不复制 Agent 正文。

**技术栈：** Markdown、JSON、Python 3 标准库 `unittest`、Git、Codex 插件清单。

---

## 文件映射

- 创建 `.codex-plugin/plugin.json`：Codex 原生插件元数据和 Skill 入口。
- 创建 `codex/agent-adapter.md`：全部 Codex Agent 适配器共用的执行契约。
- 创建 `skills/cc-ext-dev-agent/SKILL.md`：`cc-ext-dev` 的 Codex 发现入口。
- 创建 `skills/db-ops-agent/SKILL.md`：`db-ops` 的 Codex 发现入口。
- 创建 `skills/feature-dev-agent/SKILL.md`：`feature-dev` 的 Codex 发现入口。
- 创建 `skills/fix-agent/SKILL.md`：复杂缺陷修复 Agent 的 Codex 发现入口。
- 创建 `skills/superpowers-planner-agent/SKILL.md`：规划 Agent 的 Codex 发现入口。
- 创建 `tests/test_codex_plugin.py`：清单、版本、适配器引用和单一内容源契约测试。
- 修改 `.claude-plugin/plugin.json`：同步 `1.1.0` 版本和跨平台描述。
- 修改 `.claude-plugin/marketplace.json`：同步 `1.1.0` 版本和跨平台描述。
- 修改 `readme.md`：增加 Codex 能力、安装、调用、限制和目录说明。

### 任务 1：建立 Codex 插件结构契约

**文件：**
- 创建：`tests/test_codex_plugin.py`

- [ ] **步骤 1：编写失败测试**

```python
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_VERSION = "1.1.0"
AGENT_ADAPTERS = {
    "cc-ext-dev-agent": "cc-ext-dev",
    "db-ops-agent": "db-ops",
    "feature-dev-agent": "feature-dev",
    "fix-agent": "fix",
    "superpowers-planner-agent": "superpowers-planner",
}


def load_json(relative_path: str) -> dict:
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def load_skill_frontmatter(skill_path: Path) -> dict[str, str]:
    text = skill_path.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) != 3:
        raise AssertionError(f"Missing YAML frontmatter: {skill_path}")
    fields = {}
    for line in parts[1].strip().splitlines():
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    return fields


class CodexPluginManifestTest(unittest.TestCase):
    def test_manifest_declares_existing_skill_root(self):
        manifest = load_json(".codex-plugin/plugin.json")
        self.assertEqual("my-ext", manifest["name"])
        self.assertEqual(EXPECTED_VERSION, manifest["version"])
        self.assertEqual("./skills/", manifest["skills"])
        self.assertTrue((ROOT / manifest["skills"]).is_dir())
        self.assertEqual("Java Development Toolchain", manifest["interface"]["displayName"])

    def test_all_plugin_versions_match(self):
        codex_manifest = load_json(".codex-plugin/plugin.json")
        claude_manifest = load_json(".claude-plugin/plugin.json")
        marketplace = load_json(".claude-plugin/marketplace.json")
        self.assertEqual(
            {EXPECTED_VERSION},
            {
                codex_manifest["version"],
                claude_manifest["version"],
                marketplace["plugins"][0]["version"],
            },
        )


class CodexAgentAdapterTest(unittest.TestCase):
    def test_shared_execution_contract_exists(self):
        contract = ROOT / "codex/agent-adapter.md"
        self.assertTrue(contract.is_file())
        content = contract.read_text(encoding="utf-8")
        self.assertIn("AGENTS.md", content)
        self.assertIn("Task", content)
        self.assertIn("Skill", content)

    def test_each_adapter_points_to_its_canonical_agent(self):
        for skill_name, agent_name in AGENT_ADAPTERS.items():
            with self.subTest(skill=skill_name):
                skill_path = ROOT / "skills" / skill_name / "SKILL.md"
                self.assertTrue(skill_path.is_file())
                frontmatter = load_skill_frontmatter(skill_path)
                self.assertEqual(skill_name, frontmatter["name"])
                content = skill_path.read_text(encoding="utf-8")
                self.assertIn("../../codex/agent-adapter.md", content)
                self.assertIn(f"../../agents/{agent_name}/AGENT.md", content)
                self.assertTrue((ROOT / "agents" / agent_name / "AGENT.md").is_file())

    def test_adapters_do_not_copy_agent_body(self):
        for skill_name, agent_name in AGENT_ADAPTERS.items():
            with self.subTest(skill=skill_name):
                skill_text = (ROOT / "skills" / skill_name / "SKILL.md").read_text(encoding="utf-8")
                agent_text = (ROOT / "agents" / agent_name / "AGENT.md").read_text(encoding="utf-8")
                agent_body = agent_text.split("---", 2)[2]
                long_agent_lines = {
                    line.strip()
                    for line in agent_body.splitlines()
                    if len(line.strip()) >= 40
                }
                copied_lines = {
                    line.strip()
                    for line in skill_text.splitlines()
                    if line.strip() in long_agent_lines
                }
                self.assertEqual(set(), copied_lines)


class CodexDocumentationTest(unittest.TestCase):
    def test_readme_documents_codex_installation(self):
        readme = (ROOT / "readme.md").read_text(encoding="utf-8")
        self.assertIn("Claude Code", readme)
        self.assertIn("Codex", readme)
        self.assertIn("codex plugin marketplace add yuanx123/my-cc-ext", readme)
        self.assertIn(".codex-plugin/plugin.json", readme)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **步骤 2：运行测试验证它失败**

运行：

```bash
python -m unittest tests.test_codex_plugin -v
```

预期：FAIL/ERROR，首先报告 `.codex-plugin/plugin.json`、`codex/agent-adapter.md`
和 Agent 适配 Skill 不存在，版本仍为 `1.0.10`，README 未包含 Codex 安装命令。

- [ ] **步骤 3：提交失败测试**

```bash
git add tests/test_codex_plugin.py
git commit -m "test: define Codex plugin adaptation contract"
```

### 任务 2：添加 Codex 清单并同步插件版本

**文件：**
- 创建：`.codex-plugin/plugin.json`
- 修改：`.claude-plugin/plugin.json`
- 修改：`.claude-plugin/marketplace.json`
- 测试：`tests/test_codex_plugin.py`

- [ ] **步骤 1：创建 Codex 原生清单**

```json
{
  "name": "my-ext",
  "version": "1.1.0",
  "description": "Java 开发全流程工具集。覆盖设计规划、数据库操作、代码实现、代码审查、缺陷修复和扩展开发。",
  "author": {
    "name": "yuanziquan"
  },
  "repository": "https://github.com/yuanx123/my-cc-ext",
  "license": "MIT",
  "keywords": ["java", "database", "sql", "mybatis", "code-review", "tdd", "skill", "agent"],
  "skills": "./skills/",
  "interface": {
    "displayName": "Java Development Toolchain",
    "shortDescription": "Java 后端开发 Agent 与 Skill 工具集",
    "longDescription": "覆盖需求规划、数据库操作、代码实现、审查、缺陷修复、构建修复、TDD 和扩展开发。",
    "developerName": "yuanziquan",
    "category": "Developer Tools",
    "capabilities": ["Read", "Write"],
    "websiteURL": "https://github.com/yuanx123/my-cc-ext",
    "defaultPrompt": [
      "使用 my-ext 规划并实现这个 Java 后端需求。",
      "使用 my-ext 审查并修复当前 Java 代码。"
    ]
  }
}
```

- [ ] **步骤 2：同步 Claude 清单和市场版本**

将 `.claude-plugin/plugin.json` 和 `.claude-plugin/marketplace.json` 中的版本改为
`1.1.0`，并使用以下精确描述；不改变插件名、作者、许可证或市场 source：

```text
.claude-plugin/plugin.json description:
Java 开发全流程工具集。覆盖设计规划、数据库操作(DDL/DML/Entity/Mapper)、代码实现、代码审查、缺陷修复和扩展开发，支持 Claude Code 与 Codex。

.claude-plugin/marketplace.json 顶层 description:
Java 开发全流程 Claude Code 与 Codex 工具集

.claude-plugin/marketplace.json plugins[0].description:
Java 开发全流程工具集。提供设计规划、功能开发、数据库操作和扩展开发 Agent 工作流，以及 DDL、Entity、枚举、TDD、构建修复、代码审查、缺陷修复和 JavaDoc 等 Skill，支持 Claude Code 与 Codex。
```

- [ ] **步骤 3：运行清单测试**

运行：

```bash
python -m unittest tests.test_codex_plugin.CodexPluginManifestTest -v
```

预期：2 个测试 PASS。

- [ ] **步骤 4：提交清单变更**

```bash
git add .codex-plugin/plugin.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "feat: add Codex plugin manifest"
```

### 任务 3：实现共享执行契约和 Agent 发现入口

**文件：**
- 创建：`codex/agent-adapter.md`
- 创建：`skills/cc-ext-dev-agent/SKILL.md`
- 创建：`skills/db-ops-agent/SKILL.md`
- 创建：`skills/feature-dev-agent/SKILL.md`
- 创建：`skills/fix-agent/SKILL.md`
- 创建：`skills/superpowers-planner-agent/SKILL.md`
- 测试：`tests/test_codex_plugin.py`

- [ ] **步骤 1：编写共享 Codex 执行契约**

`codex/agent-adapter.md` 必须明确：

```markdown
# Codex Agent 执行契约

本文件只定义平台映射。业务流程以调用方声明的
`agents/<name>/AGENT.md` 为唯一事实源。

1. 先读取 Agent 文件，解析 frontmatter 和正文。
2. 忽略 `tools`、`model`、`permissionMode` 的 Claude 专属配置。
3. 完整保留正文中的阶段门禁、用户确认、状态文件和验证要求。
4. 按能力映射工具，不硬编码 Codex 工具名称。

| Agent 语义 | Codex 执行能力 |
| --- | --- |
| Read / Glob / Grep | 读取和搜索文件 |
| Write / Edit | 创建或编辑文件 |
| Bash | 执行当前环境的 shell 命令 |
| Skill | 加载并遵循同名 Skill |
| Task | 委派边界明确的子任务；不可用时内联执行 |
| TodoWrite | 使用当前任务计划能力 |
| AskUserQuestion | 使用当前用户询问能力 |

Codex 使用 `AGENTS.md` 作为持久项目指令入口。Claude 专属工作目录和调用语法
应转换为当前宿主或项目的等价约定。处理扩展开发时，目标平台的清单、命令、
Hook 和权限结构必须通过该平台当前官方文档核验。
```

- [ ] **步骤 2：创建 5 个薄适配 Skill**

每个文件使用同一结构，只改变 `name`、`description` 和 canonical Agent 路径：

```markdown
---
name: db-ops-agent
description: 在 Codex 中处理数据库 DDL、SQL、Entity、Mapper、索引设计或 SQL 审查等复杂工作流时使用。
---

# Codex Agent 入口

- 执行契约：`../../codex/agent-adapter.md`
- 唯一 Agent 源：`../../agents/db-ops/AGENT.md`

先完整读取执行契约，再完整读取唯一 Agent 源，并按执行契约运行该 Agent 工作流。
不要在本文件复制、概括或改写 Agent 正文。
```

其余映射严格为：

```text
cc-ext-dev-agent -> ../../agents/cc-ext-dev/AGENT.md
feature-dev-agent -> ../../agents/feature-dev/AGENT.md
fix-agent -> ../../agents/fix/AGENT.md
superpowers-planner-agent -> ../../agents/superpowers-planner/AGENT.md
```

- [ ] **步骤 3：运行适配器测试**

运行：

```bash
python -m unittest tests.test_codex_plugin.CodexAgentAdapterTest -v
```

预期：3 个测试 PASS，确认契约存在、所有 Agent 引用有效且没有复制正文长行。

- [ ] **步骤 4：提交 Agent 适配层**

```bash
git add codex/agent-adapter.md skills/cc-ext-dev-agent skills/db-ops-agent skills/feature-dev-agent skills/fix-agent skills/superpowers-planner-agent
git commit -m "feat: expose shared agents to Codex"
```

### 任务 4：补充用户文档并执行回归验证

**文件：**
- 修改：`readme.md`
- 测试：`tests/test_codex_plugin.py`
- 测试：`skills/add-javadoc/tests/test_scan_javadoc.py`

- [ ] **步骤 1：更新 README**

将开头改为同时支持 Claude Code 与 Codex，并增加以下内容：

```markdown
## Codex 安装

```bash
codex plugin marketplace add yuanx123/my-cc-ext
```

添加市场后，在 Codex/ChatGPT 桌面端的 Plugins 目录选择该市场并安装
`my-ext`，然后重启应用或开启新任务。

Codex 会直接加载原有 Skill。Claude Code Agent 通过带 `-agent` 后缀的工作流
Skill 暴露，例如 `db-ops-agent` 和 `feature-dev-agent`。Agent 正文仍只维护在
`agents/<name>/AGENT.md`。

Codex 不继承 Claude Agent frontmatter 中的独立模型和 `permissionMode`，而是使用
当前 Codex 会话的模型、权限和可用协作能力。
```

目录结构同时列出 `.codex-plugin/plugin.json` 和 `codex/agent-adapter.md`。

- [ ] **步骤 2：运行 Codex 适配测试**

运行：

```bash
python -m unittest tests.test_codex_plugin -v
```

预期：全部 6 个测试 PASS。

- [ ] **步骤 3：运行现有回归测试**

运行：

```bash
python -m unittest discover -s skills/add-javadoc/tests -p "test_*.py" -v
```

预期：现有 JavaDoc 扫描测试全部 PASS。

- [ ] **步骤 4：执行静态校验**

运行：

```bash
python -m json.tool .codex-plugin/plugin.json
python -m json.tool .claude-plugin/plugin.json
python -m json.tool .claude-plugin/marketplace.json
git diff --check
git status --short
```

预期：三个 JSON 均格式合法，`git diff --check` 无输出，状态只包含本计划内文件。

- [ ] **步骤 5：提交文档变更**

```bash
git add readme.md docs/superpowers/plans/2026-08-04-codex-adaptation.md
git commit -m "docs: document Codex plugin usage"
```
