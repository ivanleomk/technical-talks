# technical-talks

Mix-and-match content library for Ivan’s technical talks.

## How to use
1. **Modules** are reusable beats. Each `modules/<id>/MODULE.md` has frontmatter (`id`, `duration_min`, `status`) — `status: active` means it matches a delivered talk; `status: inventory` means it's available but not in a current arc.
2. **Talks** are assemblies — `talks/<slug>/TALK.md` composes modules by id (never duplicates their prose) and links a `SCRIPT.md` with the timed speaking script and demo cues.
3. Ask the **Deck** bot to propose a talk from modules, or to split a new talk into modules.

## Layout
```
modules/          # atomic content units
talks/            # full talk outlines (compose modules) + speaking scripts
assets/           # shared diagrams, screenshots
bots/             # Deck bot brief (persona mirror)
```

## Current talk: Builders Night / London AI Hub (delivered 2026-09-16)
Arc: `ai-studio-onramp` → `interactions-api` → `managed-agents` (+ `antigravity-skills`). See `talks/builders-night-london-2026-09/`.

Unused inventory (kept for longer slots): `gemini-live-async`, `partner-pitches`, `pricing-live`, `gemini-api-cli`.

Source demo repo for research skills: https://github.com/ivanleomk/managed-research-agent — link out, don't fork skills into this repo.
