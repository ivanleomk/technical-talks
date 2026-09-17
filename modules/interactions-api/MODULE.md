---
id: interactions-api
title: Interactions API — why Generate Content was rebuilt
tags: [api, state, caching, thought-signatures, async, video]
duration_min: 8–10
status: active (delivered 2026-09-16)
---

# Interactions API — the rebuild story

**Point:** Generate Content was built for single-turn calls; agents broke it. Interactions moves state server-side, types the I/O, and makes long runs async.

## Beats
1. **Why it broke for agents**
   - Manual state management goes subtly wrong → model performance degrades.
   - Broken state destroys the input cache. Cached tokens are ~10× cheaper and agent input:output is ~100:1, so a run can swing from ~$7 to ~$50 (figures as cited in the 2026-09-16 delivery; re-verify against current pricing before reuse).
   - Multimodal inputs were an unordered JSON blob — confuses the model at scale.
   - Reasoning models emit opaque **thought signatures** (base64) that must round-trip exactly or you lose performance.
2. **What's new**
   - One method — `client.interactions.create` — for models, agents, and custom agents.
   - Server-side state via **interaction ID**: no manual context stitching, no cache babysitting.
   - Strongly typed multimodal inputs and outputs (text, image, audio, function call/result) with one consistent vocabulary.
   - **Async**: create returns an ID; poll it. No holding an HTTP connection open for a 10–20 min agent run.
   - Retention up to ~55 days, plus `client.interactions.delete` for sensitive-data cleanup.
3. **YouTube as a native input**
   - Pass a URL with `type: video` — vanilla call on a full Google I/O keynote: ~75,640 tokens.
   - Flip one keyword for **agentic video**: the model gets get-transcript / get-audio / watch-segment tools and the same question costs ~411 tokens.
   - Benchmarks cited: 66–88% cost reduction with slightly higher accuracy in agentic mode (talk-notes figures; mark as claimed, not re-measured).

## Artifacts
- `snippets/01`–`04` (hello, sync FC + `previous_interaction_id`, `background=True`, background tools loop)
- `logs/trace.jsonl`, `SNIPPET_RESULTS.md` — validated 2026-09-16 against `gemini-3.8-flash`
