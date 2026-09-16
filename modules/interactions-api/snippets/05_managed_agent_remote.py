"""05 — Managed Agent. Same Interactions surface; agent + remote sandbox."""
import time
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    agent="antigravity-preview-05-2026",
    environment="remote",
    background=True,
    input=(
        "Create out/hello.txt with 'managed agents online'. "
        "Then print the file contents."
    ),
)

while True:
    interaction = client.interactions.get(id=interaction.id)
    if interaction.status != "in_progress":
        break
    time.sleep(3)

print(interaction.status)
print(interaction.output_text)
# interaction.steps shows tool/code execution for the talk UI
