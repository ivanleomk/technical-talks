"""
02 — Thought Signatures in generate_content: Opaque Reasoning State

Pain point: Gemini 3 thinking models return encrypted thought_signature bytes on
model parts. generate_content is stateless, so every follow-up must replay those
parts in contents—another opaque payload the client has to preserve by hand.
"""

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(override=True)
client = genai.Client()

MODEL = "gemini-3.8-flash"
prompt = "In one sentence: why do agent apps need tool calling?"

res = client.models.generate_content(
    model=MODEL,
    contents=prompt,
    config=types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(include_thoughts=True),
    ),
)

for part in res.candidates[0].content.parts:
    if part.thought:
        print(f"Thought summary: {part.text[:120]}...")
    else:
        print(f"Answer: {part.text}")
        print(f"Thought signature: {len(part.thought_signature or b'')} bytes")

print(res)
# Output:
# Thought summary: **My Reasoning on Tool Calling for Agent Apps**
# ...
# Answer: Agent apps need tool calling to interact with external systems...
# Thought signature: 1940 bytes
