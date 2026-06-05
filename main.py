import re
import json
import os
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Volta")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

GENERATION_MODELS = [
    "openrouter/auto",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v3-base:free",
    "google/gemma-3-12b-it:free",
    "qwen/qwen3-8b:free",
]

ANALYSIS_MODELS = [
    "openrouter/auto",
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-12b-it:free",
    "qwen/qwen3-8b:free",
]

RETRYABLE_CODES = ("429", "404", "503", "529")


def get_client() -> OpenAI:
    return OpenAI(
        base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        api_key=os.environ["OPENROUTER_API_KEY"],
    )


def sanitize(text: str, max_len: int = 500) -> str:
    return re.sub(r"[^\w\s.,!?'\"-]", "", text.strip()[:max_len])


class GenerateRequest(BaseModel):
    theme: str
    mood: str
    length: int
    poetic_form: str
    keywords: str = ""
    rhyme_scheme: str = "Free Verse"


class AnalyzeRequest(BaseModel):
    poem: str


def build_poem_prompt(req: GenerateRequest) -> str:
    theme = sanitize(req.theme, 100)
    keywords = sanitize(req.keywords, 200)
    form = sanitize(req.poetic_form, 50)
    mood = sanitize(req.mood, 50)
    rhyme = sanitize(req.rhyme_scheme, 50)
    rhyme_line = f"Use a {rhyme} rhyme scheme." if rhyme != "Free Verse" else "Use free verse."
    kw_line = f"Keywords to weave in naturally: {keywords}." if keywords else ""
    return (
        f"Write a {mood} poem about '{theme}' in the {form} form.\n"
        f"{kw_line}\n"
        f"{rhyme_line}\n"
        f"Poem length: {req.length} lines.\n"
        f"Avoid clichés. Be vivid, original, and surprising.\n"
        f"Output only the poem — no title, no preamble, no commentary."
    )


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.post("/generate")
async def generate(req: GenerateRequest):
    prompt = build_poem_prompt(req)
    client = get_client()

    async def event_stream():
        last_error = None
        for model in GENERATION_MODELS:
            try:
                stream = client.chat.completions.create(
                    extra_headers={"X-Title": "Volta"},
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    stream=True,
                    max_tokens=600,
                )
                yield f"data: {json.dumps({'model': model})}\n\n"
                for chunk in stream:
                    delta = chunk.choices[0].delta if chunk.choices else None
                    if delta and delta.content:
                        yield f"data: {json.dumps({'text': delta.content})}\n\n"
                yield "data: [DONE]\n\n"
                return
            except Exception as e:
                last_error = str(e)
                if any(code in str(e) for code in RETRYABLE_CODES):
                    continue
                break
        yield f"data: {json.dumps({'error': last_error or 'All models failed.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    poem = sanitize(req.poem, 2000)
    prompt = (
        "Analyze the following poem concisely. For each point, give a 1–2 sentence answer:\n"
        "- Mood\n- Theme\n- Poetic form\n- Rhyme scheme\n- Line count\n\n"
        f"Poem:\n{poem}"
    )
    client = get_client()
    last_error = None
    for model in ANALYSIS_MODELS:
        try:
            completion = client.chat.completions.create(
                extra_headers={"X-Title": "VoltaAnalysis"},
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
            )
            if (
                completion
                and completion.choices
                and completion.choices[0].message
                and completion.choices[0].message.content
            ):
                return {
                    "analysis": completion.choices[0].message.content.strip(),
                    "model": model,
                }
            last_error = f"Model '{model}' returned empty response."
        except Exception as e:
            last_error = str(e)
            if any(code in str(e) for code in RETRYABLE_CODES):
                continue
            break
    return {"error": last_error or "All models failed."}
