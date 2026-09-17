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
        self.assertEqual(
            "Java Development Toolchain", manifest["interface"]["displayName"]
        )

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
                skill_text = (ROOT / "skills" / skill_name / "SKILL.md").read_text(
                    encoding="utf-8"
                )
                agent_text = (ROOT / "agents" / agent_name / "AGENT.md").read_text(
                    encoding="utf-8"
                )
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
        self.assertIn(
            "codex plugin marketplace add yuanx123/my-cc-ext", readme
        )
        self.assertIn(".codex-plugin/plugin.json", readme)


if __name__ == "__main__":
    unittest.main()
