"""04 — Background + tools. Complex apps: poll until requires_action, then continue."""
import json
import time
from google import genai

client = genai.Client()

tools = [{
    "type": "function",
    "name": "fetch_filing_meta",
    "description": "Return recent filing metadata for a CIK.",
    "parameters": {
        "type": "object",
        "properties": {"cik": {"type": "string"}},
        "required": ["cik"],
    },
}]

interaction = client.interactions.create(
    model="gemini-3.8-flash",
    input="Fetch recent 10-K metadata for CIK 0001045810 and summarise forms+dates.",
    tools=tools,
    background=True,
)

while True:
    interaction = client.interactions.get(id=interaction.id)
    if interaction.status == "requires_action":
        fc = next(s for s in interaction.steps if s.type == "function_call")
        # Your side effect (curl EDGAR) happens here
        meta = {"forms": [{"form": "10-K", "filingDate": "2026-02-26"}]}
        interaction = client.interactions.create(
            model="gemini-3.8-flash",
            previous_interaction_id=interaction.id,
            tools=tools,
            background=True,
            input=[{
                "type": "function_result",
                "name": fc.name,
                "call_id": fc.id,
                "result": [{"type": "text", "text": json.dumps(meta)}],
            }],
        )
        continue
    if interaction.status != "in_progress":
        break
    time.sleep(2)

print(interaction.output_text)
