# my-ext OpenCode Bootstrap

This package shares the root `skills/` directory across platforms. When shared instructions use Claude Code terminology, apply these OpenCode mappings:

| Shared term | OpenCode behavior |
|---|---|
| Read | Use the available file reading capability. |
| Write or Edit | Use the available patch or file editing capability. |
| Glob | Use the available file pattern search capability. |
| Grep | Use the available content search capability. |
| Bash | Use the available shell execution capability. |
| Skill | Load the matching skill from the registered `skills.paths`. |
| my-ext:skill-name | Resolve the unprefixed shared skill name; Agent prefixes never rename shared skills. |
| Agent or subagent | Delegate to the matching `my-ext-*` subagent. |
| AskUserQuestion or user-question | Use OpenCode's user-question capability when available; otherwise ask one precise question in normal conversation. |
| TodoWrite or task tracking | Use the available task tracking capability for multi-step work. |

Agent name mapping:

| Claude Code agent | OpenCode agent |
|---|---|
| db-ops | my-ext-db-ops |
| feature-dev | my-ext-feature-dev |
| fix | my-ext-fix |
| cc-ext-dev | my-ext-opencode-ext-dev |
| code-review | my-ext-code-review |
| superpowers-planner | my-ext-superpowers-planner |

Package agents are registered explicitly by the plugin config hook; package files under `.opencode/agents` are not auto-discovered. Keep Claude Code lifecycle automation platform-specific instead of transplanting it into this bootstrap.

This file is registered once through `config.instructions`. The plugin never copies this content into user messages and keeps no per-session injection state.

Knowledge-base discovery uses the shared kb-loader skill and current-platform instructions. External-directory access asks for authorization; denial must not be bypassed. Follow kb-loader's unavailable branch when configuration or access is missing.

The review agent denies editing and delegation and permits only its exact read-only shell commands. Loading skills never expands permissions. When delegation is unavailable or not authorized, skills with an inline fallback run serially in the current task.
