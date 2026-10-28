from fastapi import FastAPI
from fastapi.responses import Response
from backend.interpreter import interpret_instruction
from backend.svg_generator import build_3ss_svg

app = FastAPI()

@app.get("/")
def home():
    return {"status": "AI Cutter Guide backend running!"}


# --------------------------
# INTERPRETER ENDPOINT
# --------------------------
@app.post("/interpret")
def interpret(data: dict):
    user_text = data.get("instruction", "")
    result = interpret_instruction(user_text)
    return {"parameters": result}


# --------------------------
# SVG GENERATOR ENDPOINT
# --------------------------
@app.post("/generate-svg")
def generate_svg(data: dict):
    params = data.get("parameters")

    if params is None:
        return {"error": "Missing 'parameters' in request body."}

    pack_type = params.get("pack_type")

    if pack_type != "3SS":
        return {"error": "Only 3SS supported right now."}

    # Generate SVG using params
    svg = build_3ss_svg(params)

    return {"svg": svg}

