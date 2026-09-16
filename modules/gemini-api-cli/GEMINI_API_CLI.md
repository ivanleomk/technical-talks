# Gemini API CLI — managed agent scaffold walkthrough (Task C)

Reference: [Philipp Schmid — Gemini Managed Agents: Developer Guide](https://www.philschmid.de/gemini-managed-agents-developer-guide)
CLI repo: [google-gemini/gemini-api-cli](https://github.com/google-gemini/gemini-api-cli) (experimental, Apache-2.0)

Validated **2026-09-16**. Everything below ran live against the API.

## What we used (pinned)

- **CLI:** `gemini-api` **v0.2.1** — precompiled `gemini-api-linux-x64` binary from the
  [v0.2.1 release](https://github.com/google-gemini/gemini-api-cli/releases/tag/v0.2.1),
  sha256 `937f8841f256cd30178f6be46719c0758470b4440651a39696e4ca64b272ff49`
  (verify after download: `echo "<sha>  gemini-api" | sha256sum -c -`).
- **Auth:** `GEMINI_API_KEY` env var (never printed; the CLI also accepts `--api-key`).
- **Base agent:** `antigravity-preview-05-2026` (the only `--base-agent` the CLI supports for init).

## The lifecycle, as run

```bash
# 0. smoke test — plain model interaction (default model gemini-3.5-flash)
gemini-api run "What is the capital of France?"

# 1. scaffold — creates agent.yaml + AGENTS.md + skills/ + workspace/
cd talk
gemini-api agents init cli-agent

# 2. customize — see talk/cli-agent/:
#    agent.yaml  -> id: edgar-research-agent, tools: code_execution + google_search
#    AGENTS.md   -> this repo's .agents/AGENTS.md research instructions
#    skills/     -> edgar-filings + research-brief SKILL.md copied from .agents/skills/

# 3. test locally-scaffolded config against a live remote sandbox
cd cli-agent
gemini-api agents test --prompt "Using the edgar-filings skill: resolve ticker NVDA ..."

# 4. deploy (creates the named managed agent)
gemini-api agents create

# 5. invoke the deployed agent — fresh sandbox forked from the baked-in environment
gemini-api run "Resolve ticker AAPL to its SEC CIK ..." --agent edgar-research-agent
```

All five steps succeeded. Results:

| Step | Command | Result |
|------|---------|--------|
| smoke | `run "capital of France"` | `completed`, "Paris", 16 tokens |
| test | `agents test --prompt "…NVDA…"` | `completed`; agent **read the mounted `edgar-filings/SKILL.md`**, hit EDGAR, wrote a brief file; NVDA → CIK 0001045810 + 3 recent filings; 34.6k tokens |
| create | `agents create` | `✓ Created agent: edgar-research-agent` |
| invoke | `run … --agent edgar-research-agent` | `completed`; fresh sandbox, read the **baked-in** skill, AAPL → CIK 0000320193, latest 10-K filed 2025-10-31; 20.7k tokens |

## Request/response shapes (sanitized logs)

The CLI auto-logs every interaction to `.gemini/logs/<interaction-id>.jsonl`
(line 1 = request, line 2 = reassembled response; no auth headers, no binary
data). Sanitized copies committed under `talk/logs/`:

| File | What it shows |
|------|----------------|
| `cli_01_agents_test_dryrun.txt` | `agents test --dry-run` → `POST /v1beta/interactions` with `agent`, `stream: true`, and `environment.sources[]` inlining `AGENTS.md` + each `skills/**/SKILL.md` to `/.agents/...` |
| `cli_02_agents_create_dryrun.txt` | `agents create --dry-run` → `POST /v1beta/agents` with `{name, base_agent, base_environment.sources[]}` (same inlining, persisted) |
| `cli_03_agents_test_interaction.jsonl` | auto-logged request+response for the NVDA test |
| `cli_03_agents_test_verbose.jsonl` | `--verbose` step stream: `read_file(SKILL.md)` → `code_execution` (SEC curl) → `write_file(brief)` → `model_output` |
| `cli_04_agents_list_get.txt` | `agents list` / `agents get --json` (deployed config, truncated) |
| `cli_05_run_deployed_agent_interaction.jsonl` | auto-log for the deployed AAPL run |
| `cli_05_run_deployed_agent_verbose.jsonl` | step stream for the deployed run |

Gotcha: `--dry-run` prints the **real API key** in the `x-goog-api-key` header —
redact before pasting into slides/logs (the committed copies above are redacted).

## How the scaffold maps to this repo

- CLI agent dir convention: `agent.yaml` + `AGENTS.md` + `skills/` + `workspace/`.
  `AGENTS.md` → inlined to `/.agents/AGENTS.md`; `skills/<name>/SKILL.md` →
  inlined to `/.agents/skills/<name>/SKILL.md` — **the same layout as this
  repo's `.agents/` tree**, so skills transfer by copying directories.
- `agents test` = ephemeral: inlines the local files into a one-shot
  interaction (nothing persisted server-side).
- `agents create` = persisted: stores a named agent whose `base_environment`
  carries the same inline sources; every `run --agent` forks a fresh sandbox
  from it.
- Alternative to copying skills into the scaffold: keep `agent.yaml`'s
  `environment.sources` pointing at the GitHub repo (`type: github`), like
  snippet 06 does from Python. Copying was chosen here so the demo folder is
  self-contained and diffable.

## Cleanup / ops notes

- Delete the demo agent when done: `gemini-api agents delete edgar-research-agent`.
- `agents list` shows every agent on the account — a shared key shows other
  people's agents; one was spotted using a newer `antigravity-preview-09-2026`
  base, so newer previews exist beyond what the SDK enum knows.
- `.gemini/` is gitignored here; only sanitized excerpts belong in `talk/logs/`.
