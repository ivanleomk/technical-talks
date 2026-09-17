---
id: builders-night-london-2026-09
event: Builders Night — London AI Hub
date: 2026-09-16
duration_min: 20 + Q&A
status: delivered (arc below matches the 2026-09-16 delivery; Granola "AI Hub Event")
modules:
  - ai-studio-onramp
  - interactions-api
  - managed-agents
  - antigravity-skills     # folded into Act 3 as the skills beat
unused_inventory:          # available but NOT part of this talk's arc
  - gemini-live-async
  - partner-pitches
  - pricing-live
  - gemini-api-cli
---

# Builders Night — AI Studio → Interactions → Managed Agents

## Arc (as delivered, ~20 min)
1. **AI Studio on-ramp** (~4 min) — `ai-studio-onramp`. Free tier, Playground multimodal, Build (boat game, Sheets→email), on-device Gemma transcription.
2. **Interactions API rebuild story** (~8 min) — `interactions-api`. Why Generate Content broke for agents (state, cache economics, thought signatures) → what's new (typed I/O, async create→poll, retention/delete, YouTube native video + agentic video tools).
3. **Managed Agents / Anti Gravity harness** (~6 min) — `managed-agents` + `antigravity-skills`. Two primitives (interaction ID / environment ID), free sandbox, MCP + repo clone + credential proxy + compaction, skills as the alignment lever, `agents.create`.
4. **Close + Q&A** — optional London joke closer (audience asked for it; don't force it). Q&A pocket lives in `SCRIPT.md`.

## Script
Timed speaking script with demo cues: [`SCRIPT.md`](SCRIPT.md)

## Notes
- The old Interactions → Antigravity(EDGAR) → Managed Agents arc with Live async / partner openers is retired for this talk; those modules are listed under `unused_inventory` if a longer slot comes up.
- Figures in modules (cache 10×, ~100:1 I/O, $7 vs $50, 75,640→411 tokens, 66–88%, ~55-day retention) are as cited on stage — re-verify before reusing in print.
