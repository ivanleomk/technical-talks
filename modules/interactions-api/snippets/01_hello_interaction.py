"""01 — Hello Interactions. One call; inspect typed steps."""
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-3.8-flash",  # or your current live flash
    input="In one sentence: why do agent apps need tool calling?",
)

print(interaction.output_text)
for step in interaction.steps or []:
    print(f"  step: {step.type}")
