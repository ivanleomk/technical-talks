"""02 — Sync function calling. You run the tool; Interactions keeps state."""
import json
from google import genai

client = genai.Client()

edgar_lookup = {
    "type": "function",
    "name": "lookup_cik",
    "description": "Resolve a US ticker to an SEC CIK.",
    "parameters": {
        "type": "object",
        "properties": {
            "ticker": {"type": "string", "description": "e.g. NVDA"},
        },
        "required": ["ticker"],
    },
}

interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input="Look up the CIK for NVDA.",
    tools=[edgar_lookup],
)

fc = next(s for s in interaction.steps if s.type == "function_call")
# Pretend we hit SEC company_tickers.json
result = {"ticker": fc.arguments["ticker"], "cik": "0001045810"}

final = client.interactions.create(
    model="gemini-3.8-flash",
    previous_interaction_id=interaction.id,
    tools=[edgar_lookup],
    input=[{
        "type": "function_result",
        "name": fc.name,
        "call_id": fc.id,
        "result": [{"type": "text", "text": json.dumps(result)}],
    }],
)
print(final.output_text)
