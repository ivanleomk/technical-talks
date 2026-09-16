"""06 — Custom research agent. Mount repo skills; EDGAR brief in one call.

The repo is mounted into the remote environment as a `repository` source, so
`.agents/skills/edgar-filings` and `research-brief` are on disk for the agent.
(In AI Studio / Managed Agents you can add the same GitHub repo as an
environment source via the UI.)
"""
import time
from google import genai

client = genai.Client()

REPO = "https://github.com/ivanleomk/managed-research-agent"

PROMPT = """
This repo is mounted at /workspace/repo. Read and follow
.agents/skills/edgar-filings/SKILL.md and .agents/skills/research-brief/SKILL.md.
Research NVIDIA (NVDA): find the latest 10-K, list Item 1A risk headings,
write out/brief-nvda-10k.md with citations. Do not invent numbers.
"""

interaction = client.interactions.create(
    agent="antigravity-preview-05-2026",
    environment={
        "type": "remote",
        "sources": [{"type": "repository", "source": REPO, "target": "/workspace/repo"}],
    },
    background=True,
    input=PROMPT,
)

while True:
    interaction = client.interactions.get(id=interaction.id)
    if interaction.status != "in_progress":
        break
    time.sleep(5)

print(interaction.output_text)
