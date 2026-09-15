# Repository Agent Rules

## Repository Purpose

This repository packages reusable Java development skills and platform-specific agent adapters. Root `skills/` is the only source of shared skill content.

## Shared Content

- Keep shared skills under `skills/<name>/SKILL.md`.
- Read this file before platform-specific project instructions when inspecting a target repository.
- Derive package paths, build tools, framework choices, and code style from the target repository.
- Use repository-relative paths. Never depend on a path outside the current workspace.
- Refer to tool capabilities by purpose, such as reading files, editing files, asking the user, running commands, loading a skill, or delegating to a subagent.

## Safety

- Never write passwords, tokens, private keys, real phone numbers, or internal service addresses.
- Parameterize SQL values and never interpolate untrusted input.
- Require explicit user confirmation before destructive database operations or broad filesystem deletion.
- Preserve user changes that are outside the requested scope.

## Engineering Workflow

- Read existing files before deciding on an implementation.
- Match the target repository's naming, formatting, framework, and test patterns.
- Keep Controller, Service, and data-access responsibilities separated.
- Use TDD for behavior changes: demonstrate RED, implement the smallest GREEN change, then run regression checks.
- Run the relevant build, tests, or executable validation after editing.

## Continuous Integration

- `ci.yml` runs `npm test` on ubuntu-latest and windows-latest across Node 20.11 and 22. It guards pushes to the default branch and pull requests.
- `codex-release.yml` validates, assembles, and publishes the Codex distribution on a published GitHub Release, or manually from the default branch. It calls the reusable `opencode-contract.yml` to verify a real OpenCode install before publishing.
- `.gitattributes` pins line endings to LF. Generated agent files are compared byte-for-byte, so a CRLF checkout fails the suite; keep that file in place.
- `npm test` is the single entry point for every gate. `scripts/run-tests.mjs` expands the per-platform test globs because Node 20.11 and Windows shells do not.

## Extension Boundaries

- Keep platform adapters in their platform directories.
- Do not copy shared skills into platform directories.
- Do not hardcode a model provider or model ID in shared content.
- Keep platform installation commands, hook signatures, namespaces, and permission schemas in platform-specific documentation.
