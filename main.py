import re
import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.getenv("GOOGLE_AI_API_KEY"):
        raise RuntimeError(
            "GOOGLE_AI_API_KEY is not set. Copy .env.example to .env and add your key."
        )
    yield


app = FastAPI(title="Volta", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
]

RETRYABLE_CODES = ("429", "503", "529")


def get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=os.environ["GOOGLE_AI_API_KEY"],
    )


def sanitize(text: str, max_len: int = 500) -> str:
    return re.sub(r"[^\w\s.,!?'\"-]", "", text.strip()[:max_len])


async def stream_to_sse(prompt: str):
    """Shared SSE streaming for all generation/revision endpoints."""
    client = get_client()
    last_error = None
    for model in GEMINI_MODELS:
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                max_tokens=2048,
            )
            yield f"data: {json.dumps({'model': model})}\n\n"
            async for chunk in stream:
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


async def call_with_fallback(messages: list, max_tokens: int):
    client = get_client()
    last_error = None
    for model in GEMINI_MODELS:
        try:
            completion = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
            )
            if (
                completion
                and completion.choices
                and completion.choices[0].message
                and completion.choices[0].message.content
            ):
                return completion.choices[0].message.content.strip(), None, model
            last_error = f"Model '{model}' returned empty response."
        except Exception as e:
            last_error = str(e)
            if any(code in str(e) for code in RETRYABLE_CODES):
                continue
            break
    return None, last_error or "All models failed.", None


class GenerateRequest(BaseModel):
    theme: str
    mood: str
    length: int
    poetic_form: str
    keywords: str = ""
    rhyme_scheme: str = "Free Verse"
    style_inspiration: str = ""


class ReviseRequest(BaseModel):
    poem: str
    instruction: str


class AnalyzeRequest(BaseModel):
    poem: str


class TitleRequest(BaseModel):
    poem: str


def build_poem_prompt(req: GenerateRequest) -> str:
    theme = sanitize(req.theme, 100)
    keywords = sanitize(req.keywords, 200)
    form = sanitize(req.poetic_form, 50)
    mood = sanitize(req.mood, 50)
    rhyme = sanitize(req.rhyme_scheme, 50)
    style = sanitize(req.style_inspiration, 100)
    rhyme_line = f"Use a {rhyme} rhyme scheme." if rhyme != "Free Verse" else "Use free verse."
    kw_line = f"Keywords to weave in naturally: {keywords}." if keywords else ""
    style_line = f"Write in the style of {style}." if style else ""
    return (
        f"Write a {mood} poem about '{theme}' in the {form} form.\n"
        f"{kw_line}\n"
        f"{style_line}\n"
        f"{rhyme_line}\n"
        f"Poem length: {req.length} lines.\n"
        f"Avoid clichés. Be vivid, original, and surprising.\n"
        f"Output only the poem — no title, no preamble, no commentary."
    )


def build_revise_prompt(req: ReviseRequest) -> str:
    poem = sanitize(req.poem, 2000)
    instruction = sanitize(req.instruction, 200)
    return (
        f"Here is a poem:\n\n{poem}\n\n"
        f"Revise it to: {instruction}.\n"
        f"Keep the same theme and general structure.\n"
        f"Output only the revised poem — no title, no preamble, no commentary."
    )


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.post("/generate")
async def generate(req: GenerateRequest):
    return StreamingResponse(
        stream_to_sse(build_poem_prompt(req)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/revise")
async def revise(req: ReviseRequest):
    return StreamingResponse(
        stream_to_sse(build_revise_prompt(req)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/title")
async def title(req: TitleRequest):
    poem = sanitize(req.poem, 2000)
    messages = [{
        "role": "user",
        "content": (
            "Read this poem and give it a short, evocative title (2–5 words).\n"
            "Output only the title — no punctuation, no quotes, no commentary.\n\n"
            f"Poem:\n{poem}"
        ),
    }]
    content, error, _ = await call_with_fallback(messages, max_tokens=20)
    if error:
        return {"error": error}
    return {"title": content}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    poem = sanitize(req.poem, 2000)
    messages = [{
        "role": "user",
        "content": (
            "Analyze the following poem. For each point give a concise answer:\n"
            "Mood:\nTheme:\nPoetic form:\nRhyme scheme:\nLine count:\n\n"
            f"Poem:\n{poem}"
        ),
    }]
    content, error, _ = await call_with_fallback(messages, max_tokens=400)
    if error:
        return {"error": error}
    return {"analysis": content}
