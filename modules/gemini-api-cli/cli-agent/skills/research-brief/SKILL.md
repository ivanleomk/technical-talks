---
name: research-brief
description: Use when the user wants a research brief, literature scan, company/filing dig, or daily digest synthesis. Orchestrates OpenAlex, EDGAR, and web-source triage into one cited markdown brief.
---

# Research brief

## When to use
Any open-ended research ask that should end in a short cited brief (not raw dumps).

## Steps
1. Restate the question in one sentence and list 2–4 sub-questions.
2. Choose sources:
   - Academic / ML / agents → use `openalex-lit-review`
   - US public companies / filings → use `edgar-filings`
   - Product pages, blogs, docs → use `web-source-triage`
3. Run the matching skills; keep raw responses under `out/raw/`.
4. Synthesize into `out/brief-YYYY-MM-DD-<slug>.md` with this shape:

```markdown
# <Title>
Date: <UTC ISO date>
Question: <one line>

## Executive summary
- 3–5 bullets

## Findings
### <theme>
- Claim (source)

## Open questions
- ...

## Sources
1. Title — URL — retrieved <UTC>
```

5. Confidence: high / medium / low with one line why.
6. If daily-digest mode, also follow `daily-digest`.

## Guardrails
- No unsourced claims in Findings.
- Prefer ≤12 sources for a single brief unless asked for exhaustive.
