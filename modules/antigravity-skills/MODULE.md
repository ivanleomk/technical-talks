---
id: antigravity-skills
title: Skills — the alignment lever for simple agents
tags: [skills, anti-gravity, agents, markdown]
duration_min: 3–4
status: active (delivered 2026-09-16, folded into Managed Agents act)
---

# Skills — the alignment lever

**Point:** simple agents are enough now — bash + Google Search + URLContext covers most tasks — and markdown skills are the primary lever for aligning behavior, not rigid scaffolding.

## Beats
- Complex plan → to-do → sub-agent scaffolds are increasingly unnecessary as models improve.
- A skill is a markdown file describing a capability and its conventions; the agent reads it and follows it.
- Layout: `.agents/AGENTS.md` root instructions + `.agents/skills/<name>/SKILL.md` (Anti Gravity / Agent Skills conventions).
- Skills travel: same files work locally, mounted from GitHub, or injected inline into a managed environment.

## Source
Skills live in https://github.com/ivanleomk/managed-research-agent (`.agents/`). Link and demo from there — do not fork skills into this repo (see `SOURCE.md`).
