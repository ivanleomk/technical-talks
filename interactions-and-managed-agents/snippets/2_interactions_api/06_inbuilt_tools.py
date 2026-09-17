"""
05 — Inbuilt Tools: Agentic Video Understanding

No client-side tool loop: set processing="agentic" on a video input and the
server navigates the timeline via built-in processing_call / processing_result steps.
"""

from dotenv import load_dotenv
from google import genai
from rich import print

load_dotenv(override=True)
client = genai.Client()

MODEL = "gemini-3.8-flash"
VIDEO_URI = "https://youtu.be/7Z5Vy9JBANs"

input_items = [
    {"type": "video", "uri": VIDEO_URI, "processing": "agentic"},
    {"type": "text", "text": "In one sentence: what is this video about?"},
]
print(input_items)

interaction = client.interactions.create(model=MODEL, input=input_items)
print(interaction.output_text)
print({"total_tokens": interaction.usage.total_tokens})

# Output:
# [{'type': 'video', 'uri': 'https://youtu.be/...', 'processing': 'agentic'}, ...]
# Interaction(..., steps=[ProcessingCallStep(...), ProcessingResultStep(...), ...])
# This video is a keynote presentation introducing major updates to Google Gemini...
