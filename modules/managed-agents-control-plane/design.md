# Design: Managed Agents messaging control plane

Status: sketch (17 Sep 2026)  
Owner intent: GrokBot-like multi-bot UX, but **Managed Agents own the runs**; Cloudflare owns inbox + lifecycle.

## Problem
GrokBot-style assistants need: many chats in flight, Telegram/WA/app messages while a model is busy, routines, leaf bots (expense tracker + custom MCPs). Steering every step in a desktop agent is heavy. Managed Agents already give sandbox + skills; we need a **control plane** that:
1. Normalizes inbound channels
2. Tracks turn-in-flight vs new interaction
3. Survives environment death without dumping recovery on the user

## Shape

```
Telegram / WA / in-app
        │
        ▼
  Gateway Worker (normalize → Event)
        │
        ▼
  Durable Object (one per conversation)
        │  SQLite: inbox, runs, env, pending
        ▼
  Gemini Interactions API
  (agent=…, background=true, previous_interaction_id, environment)
```

### Why one Durable Object (per conversation)
- **SQLite in the DO** is the source of truth for that chat: pending user messages, current run, history of `interaction_id` / `environment_id`.
- Single-threaded DO = natural lock: “is a turn in flight?” before dispatching a new `interactions.create`.
- No distributed race across five Workers guessing whether to start or append.
- Sub-agents / leaf bots can be **rows or child run records** in the same DO (or a second DO keyed by `bot_id:conversation_id` if isolation is needed later). Start with one DO per user-facing conversation.

### Run record (minimum columns)
| Field | Why |
|-------|-----|
| `conversation_id` | DO key / FK |
| `interaction_id` | Chain with `previous_interaction_id` |
| `environment_id` | Reattach sandbox; detect death |
| `status` | `queued` / `in_progress` / `requires_action` / `completed` / `failed` / `cancelled` |
| `started_at` / `ended_at` | Notify “done” |
| `last_error` | Environment gone, 400 chain, etc. |

**Always persist both `interaction_id` and `environment_id`.** Interaction alone is conversation history; environment is files + packages. Environments idle (~15m) and delete after inactivity — failures will happen.

### Turn-in-flight rule
On inbound event:
1. Insert into `pending_messages`.
2. If `status == in_progress` → **do not** create a new interaction; wait for completion (or `requires_action`).
3. If idle → create interaction with `previous_interaction_id` (if any) + `environment` = last good `environment_id` **or** `"remote"` if env is dead.
4. On completion → notify channel (“done”); drain pending into next turn (coalesce).

### Forced read-before-finish (makeshift hook)
Control plane owns the inbox. Expose a tool the Managed Agent **must** call (or the plane injects as next input):

`read_pending_user_messages` → returns all unread rows since run start, marks them delivered.

Gate: do not treat the run as user-complete until pending is empty **or** the agent explicitly acknowledged them this turn. That way mid-run Telegram noise isn’t lost and isn’t a second parallel brain.

### Environment death → agent-led recovery (not user-led)
When follow-up with `environment=<old_id>` fails (gone / expired):
1. Mark env dead in SQLite.
2. Start a **new** remote environment; keep `previous_interaction_id` if history still matters, or start fresh with a system note.
3. Inject a short system/user message to the agent: sandbox was reset, files lost; recover what you can from cited URLs / prior brief / skills; don’t ask the human to rebuild the workspace by hand.
4. Notify user lightly only if user-visible work was lost (“agent is redoing X after a sandbox reset”).

90% of recovery = prompt + skills + APIs; 10% = surface blocker (auth, quota).

### Channel gateway (Hermes-ish)
CLI: `connect telegram` → store bot token in secrets → webhook URL on Worker.  
Normalize to:

```json
{ "conversation_id", "channel", "user_id", "text", "media", "ts", "raw_id" }
```

Same schema for WhatsApp / in-app. Unified “RockBot/GrokBot-shaped” event bus.

### Leaf bots / MCPs
Main conversation DO dispatches leaf runs (expense tracker) as Managed Agents with custom MCP allowlists + network transforms. Config lives in SQLite or a small config DO; secrets never in sandbox plaintext.

### Cloudflare pieces
| Piece | Role |
|-------|------|
| Worker | Webhooks, CLI API, notify out |
| DO + SQLite | Per-conversation state machine |
| Queues (optional) | Burst coalesce, completion fan-in |
| Cron Triggers | Routines (digest, sync) |
| Secrets Store | Channel tokens, `GEMINI_API_KEY` |

Managed Agent **compute** stays on Google; CF is control + messaging.

## Non-goals (v0)
- Replacing Antigravity IDE UX
- Perfect multi-writer sync across devices
- Auto-send on third-party chats without explicit policy

## v0 milestone
1. One DO + SQLite schema above  
2. Telegram in → Managed Agent out → Telegram “done”  
3. Pending-message tool + coalesce  
4. Persist `environment_id`; simulated env death → agent recovery message  
5. CLI `connect telegram` stub  

Expense tracker MCP = first leaf after the spine works.

## Open questions
- One DO per conversation vs one DO per user (multi-chat in one SQLite)?
- Completion: poll Interactions vs client reconnect / alarm in DO?
- When to drop `previous_interaction_id` after env death (history vs clean slate)?

## Related
- Repo demos: `ivanleomk/managed-research-agent`  
- Talk modules: `interactions-api`, `managed-agents`, `gemini-api-cli`
