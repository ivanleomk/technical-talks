---
id: gemini-live-async
title: Gemini 3.8 Live — async function calling
tags: [live-api, voice, async-tools]
duration_min: 5–8
---

# Gemini 3.8 Live + async function calling

**Point:** keep talking while tools run (`NON_BLOCKING` / background tool calls).

## Beats
- Native speech↔speech + visual context
- Async FC vs blocked sync tool loop
- Tie to Interactions background story (same “don’t stall the UX” idea)

## Demo angle
Pipecat `cancel_on_interruption=False` weather example; Vercel AI Gateway realtime with background tools.
