# Design: Managed Agents messaging control plane

Status: sketch (17 Sep 2026) — revised same day  
Intent: GrokBot-like multi-bot UX; **Managed Agents + Gemini 3.8** own reasoning; Cloudflare is a thin, configurable control plane.

## Pivot (vs earlier draft)
- **Earlier:** one Durable Object *per conversation*.
- **Now:** **one Durable Object** (per user / per deploy) that handles **all** conversations.
- Why: Gemini Interactions already gives **server-side history** via `previous_interaction_id` (+ optional `environment_id` for sandboxes). The DO does not need to be the chat log — it needs to be the **orchestrator state machine**: which chats exist, what’s in-flight, pending inbox, channel config, routines.

For fitness / expenses / email “keep me updated” bots, a strong orchestrator model (3.8 Flash / Live / Managed Agent) doing the work beats a fleet of thin DOs.

## Architecture

```
Telegram / WA / in-app / email hooks
              │
              ▼
     Gateway Worker (normalize Event)
              │
              ▼
     Single Durable Object + SQLite
     (config, conversations index, runs,
      pending inbox, routines)
              │
              ▼
     Interactions / Managed Agents
     (history on Google; env for sandbox)
```

### What lives where
| Concern | Where |
|---------|--------|
| Message history / model memory | `previous_interaction_id` (Interactions store) |
| Sandbox files / packages | `environment_id` (persist; recover on death) |
| Turn-in-flight, pending msgs, notify | **DO SQLite** |
| Channel tokens, MCP allowlists, bot persona | **DO SQLite** (or Secrets Store + DO pointers) |
| Heavy reasoning / tools | Gemini 3.8 + Managed Agent skills/MCPs |

### SQLite sketch (single DO)
- `conversations(id, channel, external_thread_id, last_interaction_id, last_environment_id, status, …)`
- `pending_messages(id, conversation_id, payload, created_at, delivered_at)`
- `runs(id, conversation_id, interaction_id, environment_id, status, …)`
- `bots` / `config` (persona, MCPs, notify prefs) — **easy config**
- `routines` (cron-like metadata; CF Cron pokes the DO)

Turn rule stays: if that conversation’s run is `in_progress`, enqueue pending; else create/chain interaction. Multiple conversations can be in flight as **rows**, serialized through one DO (alarm/queue if fan-out gets hot).

### Pending read gate
Still: tool or injected follow-up `read_pending_user_messages` so mid-run Telegram doesn’t vanish. Control plane owns the inbox; model only reads via that API.

### Environment death
Persist `environment_id`. On failure → new remote env + short agent note (“sandbox reset, recover what you need”) — agent-led, not user-led.

---

## v0 — shippable spine (easy config)

**Goal:** one configurable bot, one channel, orchestrator does the job.

1. **Single DO + SQLite** with conversations + runs + pending.
2. **CLI / config file** (Hermes-ish):
   - `bot.name`, `bot.system` / skills mount
   - `channel: telegram` + token
   - `model` / `agent` (e.g. Managed Agent or `gemini-3.8-flash`)
3. Telegram webhook → Worker → DO → `interactions.create` (`background=true`).
4. Persist `interaction_id` + `environment_id`; on complete → Telegram “done” (+ short summary).
5. Pending coalesce + forced read tool.
6. One example leaf skill: **expense log** or **fitness weigh-in** (skill markdown + optional MCP stub) — prove “configure, don’t code a new product.”

**Non-goals for v0:** multi-channel fan-in, multi-bot roster UI, fancy routines UI, per-conversation DO sharding.

**Config shape (illustrative):**
```yaml
bot:
  id: cos-lite
  agent: antigravity-preview-09-2026   # or model: gemini-3.8-flash
  skills: [expense-log]                 # mount from repo / inline
channels:
  telegram:
    token_secret: TELEGRAM_BOT_TOKEN
notify:
  on_complete: true
```

---

## v1 — multi-bot / multi-channel / routines

1. Same DO; many `bots` rows; route by chat ↔ bot binding.
2. Channels: Telegram + WhatsApp + in-app gateway (normalized Event).
3. Routines: CF Cron → DO → “wake conversation X with prompt Y.”
4. Custom MCP registry per bot (expense, Gmail read-only, etc.) + network allowlists.
5. Main orchestrator bot that **dispatches** leaf Managed Agents (still one DO tracking child `run` rows).
6. Better recovery UX + optional env snapshot download when critical.
7. Scale escape hatch: if single DO throughput hurts, **shard DO by user_id** (still not per conversation unless measured need).

---

## Why this is easier to build on
- Interactions = free conversation store; DO stays small.
- 3.8 as orchestrator collapses “fitness / money / email” into config + skills, not new services.
- v0 is one YAML + one DO + one webhook — demoable for talks and personal use.
- v1 adds roster/routines without rewriting the run machine.

## Open questions
- Serialize all conversations through one DO alarm loop vs parallel `fetch` from DO to Interactions (DO still authoritative for locks)?
- Default after env death: keep `previous_interaction_id` or cold start + summary row in SQLite?
- Config UX: CLI only for v0, or also a tiny web settings page?

## Related
- `ivanleomk/managed-research-agent` (skills demo)
- Talk modules: `interactions-api`, `managed-agents`, `gemini-api-cli`
