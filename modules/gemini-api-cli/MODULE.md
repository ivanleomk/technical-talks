---
id: gemini-api-cli
title: gemini-api CLI (Philipp / Google)
tags: [cli, scaffold, agents-init]
duration_min: 3–5
status: inventory (not delivered 2026-09-16 — validated and ready as an alternate ship path)
---

# Gemini API CLI lifecycle

`gemini-api agents init` → `test` → `create` → `run --agent`

## Artifacts
- `GEMINI_API_CLI.md`
- `cli-agent/` scaffold (EDGAR skills)
- Deployed demo id used in validation: `edgar-research-agent` (delete when done)

Gotcha: `agents --dry-run` can print `x-goog-api-key` — never log dry-run raw; rotate keys if leaked.
