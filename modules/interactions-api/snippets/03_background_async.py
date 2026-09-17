"""03 — Background / async execution. Fire and poll — no 60s HTTP death."""
import time
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input="Outline a 5-bullet research plan for analysing a 10-K risk section.",
    background=True,  # returns immediately with an id
)
print("started:", interaction.id)

while True:
    interaction = client.interactions.get(id=interaction.id)
    if interaction.status != "in_progress":
        break
    time.sleep(2)

print(interaction.status, interaction.output_text)
