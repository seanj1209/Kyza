import os
from dotenv import load_dotenv

print("Loading .env...")
load_dotenv()

print("Loaded key:", os.getenv("OPENAI_API_KEY"))

from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


INTERPRETER_PROMPT = """
You are an AI packaging engineer. Your job is to convert user instructions 
into structured JSON parameters for generating a cutter guide.

You MUST:

1. Identify which pack type the user wants:
   - 3SS (3-side-seal sachet)
   - FLOWWRAP (pillow pack / flow wrap)
   - SUP (stand-up pouch)

2. Extract ALL dimensions mentioned (numbers ALWAYS in mm).

3. Apply defaults if the user does not specify values:
   - seal_mm: 10
   - end_seal_mm: 12
   - fin_seal_mm: 12
   - bleed_mm: 3
   - safe_zone_mm: 3
   - notch: "none"
   - zip_mm: null
   - valve: "no"
   - window: { "type": "none", "width_mm": null, "height_mm": null }

4. NEVER assume pack type—ask a clarifying question if unknown.

5. If the user gives incomplete information (missing width, height etc.)
   ask ONE QUESTION ONLY to fill the missing detail.

6. Your output must ALWAYS be valid JSON. No commentary.

7. JSON structure must match EXACTLY one of the defined parameter schemas.
"""


import json

def interpret_instruction(user_text: str):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": INTERPRETER_PROMPT},
                {"role": "user", "content": user_text},
            ],
        )
        result = response.choices[0].message.content
        return result
    except Exception as e:
        return f"Error: {str(e)}"


