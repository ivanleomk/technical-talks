# Speaking script — Builders Night, London AI Hub (2026-09-16 delivery)

~20 min + Q&A. Reconstructed from the delivered talk (Granola: "AI Hub Event", 16 Sep 2026) for rehearsal and reuse. Lines are spoken English — read them aloud, don't put them on slides.

Legend: **[SCREEN]** = switch what's projected. **[DEMO]** = live interaction. Timings are cumulative targets.

---

## 0:00–1:00 — Cold open

**[SCREEN]** aistudio.google.com, already signed in.

> Everything I'm going to show you tonight runs on the free tier of AI Studio. No cloud project, no billing account — if you have a Google login, you can do all of this on the train home.

> I want to cover three things: how you get started, why we rebuilt our core API for agents, and how you run agents on our infrastructure without managing any of it.

## 1:00–4:30 — Act 1: AI Studio on-ramp

**[DEMO]** Playground: drop in an image or short video alongside a text prompt.

> This is the Playground. It's multimodal by default — text, images, audio, video, all in one prompt box. This is where you figure out whether the model can do your thing at all, before you write a line of code.

**[DEMO]** Build tab: generate the boat game from a single prompt, then tweak it with one follow-up ("make the waves bigger", etc.).

> This is Build. Think Lovable, but inside AI Studio. One prompt, and I get a full deployable app. And I don't edit code to change it — I just keep talking to it.

**[DEMO]** Sheets→email workflow: show the attendee sheet, run the app, show a generated email.

> Here's a less toy example. This app reads a Google Sheet of attendees — through the native Workspace integration — and drafts a personalised email for each of them. I built this for tonight's attendee list. If you got an email from me, a model wrote it. *(beat)*

**[SCREEN]** AI Studio transcription with Gemma selected.

> And it's not all server-side. This transcription is running on Gemma — a 4-billion-parameter model that fits in about a gigabyte of RAM. That's on-device. Your audio never leaves the machine.

> So that's the on-ramp. Now let me show you what changed underneath, because we rebuilt the API — and the reason is agents.

## 4:30–13:00 — Act 2: the Interactions API rebuild story

### Why Generate Content broke (4:30–8:00)

**[SCREEN]** Slide: old Generate Content request shape (messages array, JSON blob).

> Generate Content was designed for one-shot calls: send a prompt, get a completion. Agents are not that. Agents are long, stateful, tool-heavy loops — and when you run those on an API that makes *you* manage the state, two things go wrong.

> First: you get the state subtly wrong. You drop a turn, reorder a tool result, and the model's performance quietly degrades. You don't get an error — you get a dumber agent.

> Second, and this is the one that costs you money: broken state destroys your input cache. Cached tokens are roughly ten times cheaper. And for agents, the input-to-output ratio is about a hundred to one — you feed the whole history back in every step. So the same agent run can cost you around seven dollars with a healthy cache, or around fifty with a broken one. Same prompts, same model. *(Figures as cited on the night — sanity-check against current pricing before quoting in print.)*

> Two more failure modes. Multimodal inputs used to be an unordered JSON blob — at scale, the model genuinely gets confused about what goes with what. And reasoning models emit thought signatures — opaque base64 objects — that you must pass back exactly, or you silently lose reasoning performance. Most people didn't even know they were dropping them.

### What Interactions does instead (8:00–10:30)

**[SCREEN]** Snippet 01 — `client.interactions.create`, minimal.

> So: the Interactions API. One method — `interactions.create` — whether you're calling a model, an agent, or a custom agent you've built.

> State lives server-side, behind an interaction ID. You pass the ID, we reconstruct the context — correctly, with the cache intact, with the thought signatures round-tripped. That whole class of bugs is just gone.

> Inputs and outputs are strongly typed. Text, image, audio, function call, function result — one consistent vocabulary in both directions.

**[SCREEN]** Snippet 03 — `background=True`, then a poll loop.

> And it's async-first. An agent run can take ten, twenty minutes. You do not want an HTTP connection open for twenty minutes. Create returns an ID immediately; you poll it whenever you like.

> Interactions are retained for up to fifty-five days, and there's `interactions.delete` when you're handling anything sensitive and want it gone.

### YouTube + agentic video (10:30–13:00)

**[DEMO]** Interactions call with a YouTube URL as `type: video`; show token count in the response usage.

> Video is now a native input type — including YouTube. You pass a URL, type video, and ask questions about it.

> Here's the fun part. I asked a question about the full Google I/O keynote. Vanilla call: about seventy-five thousand tokens — the model ingests everything.

**[DEMO]** Same call with the agentic video keyword flipped; show the tool steps and the usage.

> Flip one keyword, and it goes agentic. The model gets tools — get the transcript, get the audio, watch a specific segment — and it decides what it actually needs. Same question: four hundred and eleven tokens.

> On our benchmarks that's a sixty-six to eighty-eight percent cost reduction, with slightly *higher* accuracy — because the model reads the transcript instead of skimming everything. *(Benchmark claim from the launch material — cite it, don't re-derive it.)*

## 13:00–19:00 — Act 3: Managed Agents on the Anti Gravity harness

### Simple agents + skills (13:00–15:00)

> Before the infrastructure — a word on how we build agents now. For most tasks, a bash tool, Google Search, and URL context is enough. The elaborate scaffolding — planner, to-do list, sub-agent hierarchy — you need less of it every model generation.

> The lever that actually matters is skills: markdown files that describe a capability and its conventions. The agent reads them and follows them. My research skills are just a folder of markdown in a GitHub repo. *(Skills repo: github.com/ivanleomk/managed-research-agent — show it if asked, don't detour.)*

### The harness (15:00–19:00)

**[SCREEN]** Slide: interaction ID vs environment ID.

> Managed Agents runs on the Anti Gravity harness — the same harness behind the Anti Gravity app and what we ship on Google Cloud. It's also the default RL training harness for Gemini, which is why it works well out of the box: the model was trained in this exact loop.

> Two primitives. The interaction ID is the model's context — you've already met it. The environment ID is a persistent VM sandbox. And they're decoupled: you can fire a completely fresh interaction into an environment that's been alive for days, with all its files and state intact.

> The sandbox is free. You pay for model tokens, nothing else.

**[DEMO]** Snippet 05/06 — create with `environment="remote"`, GitHub repo mounted, poll to completion. (Pre-run a backup; the full mounted run takes 5–8 minutes.)

> What do you get in the box? MCP servers via the MCP CLI. Clone a GitHub or GCS repo straight into the sandbox — that's how my skills get in. Inline skill injection if you don't want a repo. Credential proxying, so the agent can use a secret without ever seeing it. And when the context buffer overflows, compaction happens automatically — you don't manage it.

> And if you want this packaged: `client.agents.create` gives you a named custom agent you can call like any model.

## 19:00–20:00 — Close

> So: AI Studio to prototype, Interactions when you write code, Managed Agents when you want it to run without you. All of it starts on the free tier. Go build something on the train home.

**[Optional joke beat]** — the audience asked for the London joke at the end. It lives in the AI Studio conversation history (saved to Drive). Pull it up **only if the room asks or energy is right**; it's a closer, not a scheduled beat.

---

## Q&A pocket (from the real 2026-09-16 Q&A)

**"Can my agents talk to each other?"**
> Today it's fire-and-forget — you launch them, they run. Steering, stop-and-cancel, and inter-agent coordination are in progress. The workaround right now: a shared message board or a GCS bucket, with credentials injected through the proxy.

**"Can I run Claude / GPT inside the sandbox?"**
> Technically yes — it's a VM, you can install keys and call whoever you like. I wouldn't recommend it: the harness is RL-tuned for Gemini, so you're paying for a harness the other model wasn't trained in.

**"Can I bring my own sandbox?"**
> Not currently supported. It's on the roadmap.

**"What about prompt injection into transcription?"** (Gemma acting on spoken instructions / formatting drift)
> Real risk. For Gemma, tune with twenty to thirty recorded examples of your actual audio. The hosted Gemini models give you more control through the system prompt.

**"Why Google over Anthropic or OpenAI?"**
> Honest answer: scope. Robotics, audio, generative media, weather, biology — the surface is bigger. We know we have a gap in developer mindshare; the strategy is more evals, more community benchmarks on Kaggle, and faster iteration on the Flash models.

---

## Before production — checklist
- Re-verify on-stage figures against current docs: cache multiplier, $7/$50 example, 75,640→411 tokens, 66–88% benchmark, 55-day retention, Gemma size/RAM.
- Pre-run the mounted managed-agent demo (5–8 min) and keep the completed run open as backup; venue Wi-Fi killed nothing this time, but see the transient-400 gotcha in `../../modules/interactions-api/SNIPPET_RESULTS.md`.
- Stage the attendee sheet with fake data before the Sheets→email demo.
- Check `agents list` for a newer preview than `antigravity-preview-05-2026`.
- Locate the London joke in AI Studio history before doors open.
