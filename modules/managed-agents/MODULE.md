---
id: managed-agents
title: Managed Agents — the Anti Gravity harness
tags: [managed-agents, anti-gravity, sandbox, mcp, environments]
duration_min: 6–8
status: active (delivered 2026-09-16)
---

# Managed Agents — the Anti Gravity harness

**Point:** the Managed Agents API runs the same Anti Gravity harness used in the Anti Gravity app and Google Cloud — and it's the default RL training harness for Gemini, so it works well out of the box.

## Beats
1. **Two primitives**
   - **Interaction ID** = model context. **Environment ID** = persistent VM sandbox.
   - They're decoupled: send a fresh interaction into a long-lived environment.
2. **Billing** — the sandbox is free; you pay model tokens only.
3. **What the harness gives you**
   - MCP servers via the MCP CLI.
   - Clone GitHub / GCS repos into the sandbox.
   - Inline skill injection (see `antigravity-skills` for the skills story).
   - Credential proxying — agent uses secrets without seeing them.
   - Automatic context compaction when the buffer overflows.
4. **Custom agents** — `client.agents.create` gives you a named agent callable like any model.

## Artifacts
- `../interactions-api/snippets/05` (remote environment hello), `06` (GitHub-mounted skills run)
- Validated mount of `ivanleomk/managed-research-agent` (2026-09-16; agent id `antigravity-preview-05-2026` — check for newer previews before reuse)
