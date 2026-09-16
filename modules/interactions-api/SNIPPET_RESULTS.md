# Snippet validation results — Builders Night demo

Validated **2026-09-16** against the live Interactions API.

- SDK: `google-genai` **2.23.0** (Python)
- Model: **`gemini-3.8-flash`** — worked for 01–04 as written, no swap needed
- Managed Agent: **`antigravity-preview-05-2026`** — still current, no retry needed
- Full request/response trace: [`talk/logs/trace.jsonl`](logs/trace.jsonl) (one JSON object per API call)
- Machine-readable summary: [`talk/logs/summary.json`](logs/summary.json)
- Re-run harness: [`talk/run_snippets.py`](run_snippets.py) — `python3 talk/run_snippets.py [NN ...]` (reads `GEMINI_API_KEY` from env, redacts it from all logs)

## Results

| # | Snippet | Result | Final status | Calls | Output excerpt |
|---|---------|--------|--------------|-------|----------------|
| 01 | `01_hello_interaction.py` | pass | `completed` | 1 create | "Agent apps need tool calling to interact with the external world, enabling them to access real-time inform…" |
| 02 | `02_sync_function_calling.py` | pass | `completed` | 2 creates | "The SEC CIK for NVDA (NVIDIA Corporation) is **0001045810**." |
| 03 | `03_background_async.py` | pass (attempt 2) | `completed` | create + polls | "Here is a 5-bullet research plan for analyzing the Risk Factors section (Item 1A) of a 10-K: * **1. Run a Yo…" |
| 04 | `04_background_tools_loop.py` | pass (attempt 2) | `completed` via `requires_action` loop | create + polls + continuation create | "…summary of recent filing metadata for **CIK 0001045810**: Form 10-K, Filing Date February 26, 2026" |
| 05 | `05_managed_agent_remote.py` | pass | `completed` | create + polls | "The file `out/hello.txt` has been created with the text `managed agents online`." |
| 06 | `06_edgar_research_agent.py` | pass (after fix, see below) | `completed` | create + polls | "…written to `out/brief-nvda-10k.md`, with raw responses preserved in `out/raw/`. 24 Item 1A risk headings…" |

Attempt 1 of 03 and 04 hit a transient backend failure (see gotcha 3); both passed unchanged on immediate re-run. Snippet 06 was fixed to actually mount this repo (see below).

## What changed in the snippets

- **`06_edgar_research_agent.py`** — the only snippet that needed a fix. The old
  version mounted the repo "as pseudocode" (comment only) and ran the prompt
  against a bare remote environment. Environment mounting from GitHub **is**
  available via the API, so the snippet now passes the real thing:

  ```python
  environment={
      "type": "remote",
      "sources": [{"type": "repository",
                   "source": "https://github.com/ivanleomk/managed-research-agent",
                   "target": "/workspace/repo"}],
  }
  ```

  The prompt now points the agent at `/workspace/repo/.agents/skills/...`.
  Demo intent unchanged — the old comment already said "via API, pass
  environment sources pointing at this repository"; now the code does it.
- **01–05** — unchanged; they run as written.

## What the managed runs actually did

- **05** (`agent` + `environment="remote"`): steps were `thought →
  code_execution_call → code_execution_result → model_output`; the sandbox
  created `out/hello.txt` and printed its contents. ~13–20s end to end.
- **06** (repo mounted): the agent read the mounted `edgar-filings` and
  `research-brief` SKILL.md files, pulled NVDA's real 10-K from SEC EDGAR
  (CIK `0001045810`, accession `0001045810-26-000021`, FY ended 2026-01-25,
  filed 2026-02-25), followed the skill output conventions (brief at
  `out/brief-nvda-10k.md`, raw dumps in `out/raw/`, filings table with
  form/date/accession/URL), and catalogued 24 Item 1A risk headings in
  4 categories. ~5.5–8.5 min; 33 code-execution + 5 function-call steps.
- Unmounted control run of 06 also completed the research task purely with
  built-in tools — so the remote agent can do research-style work even
  without skills, but the mounted skills are what enforce the repo's
  conventions (file locations, citations, User-Agent, brief template).

## API gotchas for the talk

1. **Kwargs work.** `client.interactions.create(model=..., input=..., tools=..., background=...)`
   is accepted directly; the SDK normalizes kwargs into the request body.
   A `request={...}` dict form also exists.
2. **Background shape.** `background=True` returns immediately with
   `status="in_progress"` and an id; poll with `client.interactions.get(id=...)`.
   Final state for success is `status="completed"` with `output_text` + `steps`.
3. **Transient dead interactions → 400, not `failed`.** Twice (same ~15s
   window) a background interaction died server-side mid-poll: `get` started
   returning `400 invalid_request` and that id **never** became gettable again
   (still 400s an hour later) — the failure never surfaces as
   `status="failed"`. Immediate re-run of the same snippet worked. Demo tip:
   on a 400 during polling, retry once, then re-create the interaction.
4. **Function calling.** Sync create returns a `function_call` step directly
   (`{type, name, id, arguments}`). In background mode the status becomes
   `requires_action`. Continue with
   `create(previous_interaction_id=..., input=[{"type": "function_result", "name", "call_id": <step.id>, "result": [{"type": "text", "text": ...}]}])`
   — the continuation is itself a new interaction that can run in the
   background again (see trace for 04).
5. **Thought steps carry opaque `signature` blobs** (~1 KB base64). Fine in
   logs, noisy on slides.
6. **Status enum is wider than the happy path:** `in_progress`, `queued`,
   `requires_action`, `completed`, `failed`, `cancelled`, `incomplete`,
   `budget_exceeded`. The snippets poll while `in_progress`; treating `queued`
   the same way is safer (not observed in these runs).
7. **Agent ids in the SDK:** `antigravity-preview-05-2026`,
   `deep-research-pro-preview-12-2025`, `deep-research-preview-04-2026`,
   `deep-research-max-preview-04-2026`.
8. **`environment="remote"`** string shorthand works; the object form adds
   `sources` with `type` ∈ `repository` / `gcs` / `inline` / `skill_registry`.
   A `repository` source clones a public GitHub repo to `target` before the
   agent starts.
9. **Latency budget:** sync create ~12–90s; background 10-K plan ~20–180s;
   managed-agent hello world ~13–20s; full mounted EDGAR brief ~5.5–8.5 min.
   Pre-run 06 before the talk if the venue Wi-Fi is a risk.

## Skills ↔ Managed Agents readiness (Task B)

- Layout matches Antigravity / Agent Skills conventions:
  `.agents/AGENTS.md` root instructions + `.agents/skills/<name>/SKILL.md`.
- All 6 skills (`daily-digest`, `design-md`, `edgar-filings`,
  `openalex-lit-review`, `research-brief`, `web-source-triage`) have valid YAML
  frontmatter: `name` matches the directory (lowercase-hyphen, ≤64 chars) and
  an actionable third-person `description` (≤1024 chars), followed by
  step-by-step bodies. Validated programmatically.
- **Empirically mount-ready:** a managed agent with this repo mounted as a
  `repository` source listed `.agents/skills` and followed
  `edgar-filings` + `research-brief` correctly (06 run above).
- No skill changes were needed.

## Task C — Gemini API CLI (managed agent scaffold)

The experimental [`gemini-api` CLI](https://github.com/google-gemini/gemini-api-cli)
(**v0.2.1**, sha256-verified binary) ran the full managed-agent lifecycle
against this repo's skills — see [`talk/GEMINI_API_CLI.md`](GEMINI_API_CLI.md)
for the walkthrough and `talk/logs/cli_*` for sanitized request/response shapes.

| Step | Command | Result |
|------|---------|--------|
| smoke | `gemini-api run "…capital of France…"` | pass — `completed` |
| scaffold | `gemini-api agents init cli-agent` | pass — `talk/cli-agent/` (agent.yaml + AGENTS.md + skills/) |
| test | `gemini-api agents test --prompt "…NVDA → CIK…"` | pass — agent read mounted `edgar-filings/SKILL.md`, correct CIK 0001045810 |
| deploy | `gemini-api agents create` | pass — `edgar-research-agent` created |
| invoke | `gemini-api run "…AAPL…" --agent edgar-research-agent` | pass — fresh sandbox, CIK 0000320193, latest 10-K 2025-10-31 |

CLI gotchas: `--dry-run` prints the real API key in the `x-goog-api-key`
header (redact before slides); the CLI's scaffold layout (`AGENTS.md` +
`skills/`) inlines to the same `/.agents/` paths as this repo's `.agents/`
tree, so skills transfer by copying directories; a newer
`antigravity-preview-09-2026` base agent was spotted via `agents list`
(05-2026 still works).

## Reading the logs

`trace.jsonl` has one object per API call:

```json
{"ts": "...", "snippet": "04_background_tools_loop.py", "attempt": 2,
 "call_index": 5, "call": "interactions.get",
 "request": {"method": "GET", "path": "/interactions/{id}", "id": "..."},
 "response": {"http_status": ..., "id": "...", "status": "requires_action",
              "top_level_keys": [...], "steps": [{"type": "function_call", "name": "...", "id": "...", "arguments": {...}}],
              "output_text": "...capped at 2k chars...", "usage": {...}}}
```

`call_index` resets per harness process; navigate with `snippet` + `attempt`:

```bash
jq -c 'select(.snippet=="04_background_tools_loop.py" and .attempt==2)' talk/logs/trace.jsonl
jq -c 'select(.response.status=="requires_action")' talk/logs/trace.jsonl
jq -c 'select(.response.error)' talk/logs/trace.jsonl   # the two transient 400s
```

No secrets: `GEMINI_API_KEY` is only read from the environment and is redacted
from every log line by the harness; the committed logs were additionally
scanned for key material.
