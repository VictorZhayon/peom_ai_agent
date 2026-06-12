import re
import json
import os
import sqlite3
import asyncio
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from openai import AsyncOpenAI
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

# ── Rate limiter ────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── SQLite helpers ──────────────────────────────────────────────────────────
DB_PATH = "/tmp/volta.db"
_db_executor = ThreadPoolExecutor(max_workers=1)


def _db_init():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS poems (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            poem       TEXT    NOT NULL,
            title      TEXT    DEFAULT '',
            theme      TEXT    DEFAULT '',
            mood       TEXT    DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


async def db_run(fn):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_db_executor, fn)


# ── App lifecycle ───────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.getenv("GOOGLE_AI_API_KEY"):
        raise RuntimeError(
            "GOOGLE_AI_API_KEY is not set. Copy .env.example to .env and add your key."
        )
    await db_run(_db_init)
    yield


app = FastAPI(title="Volta", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Cheapest first; gemini-2.0-flash-lite* were shut down 2026-06-01.
GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
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
    """Shared SSE streaming for all generation endpoints."""
    client = get_client()
    last_error = None
    for model in GEMINI_MODELS:
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                max_tokens=1024,
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


# ── Request models ──────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    theme: str
    mood: str
    length: int
    poetic_form: str
    keywords: str = ""
    rhyme_scheme: str = "Free Verse"
    style_inspiration: str = ""
    language: str = "English"


class ReviseRequest(BaseModel):
    poem: str
    instruction: str


class ContinueRequest(BaseModel):
    poem: str


class RespondRequest(BaseModel):
    poem: str


class AnalyzeRequest(BaseModel):
    poem: str


class TitleRequest(BaseModel):
    poem: str


class SavePoemRequest(BaseModel):
    poem: str
    title: str = ""
    theme: str = ""
    mood: str = ""


# ── Prompt builders ─────────────────────────────────────────────────────────
def build_poem_prompt(req: GenerateRequest) -> str:
    theme = sanitize(req.theme, 100)
    keywords = sanitize(req.keywords, 200)
    form = sanitize(req.poetic_form, 50)
    mood = sanitize(req.mood, 50)
    rhyme = sanitize(req.rhyme_scheme, 50)
    style = sanitize(req.style_inspiration, 100)
    language = sanitize(req.language, 30) or "English"
    rhyme_line = f"Use a {rhyme} rhyme scheme." if rhyme != "Free Verse" else "Use free verse."
    kw_line    = f"Keywords to weave in naturally: {keywords}." if keywords else ""
    style_line = f"Write in the style of {style}." if style else ""
    lang_line  = f"Compose the poem entirely in {language}." if language != "English" else ""
    return (
        f"Write a {mood} poem about '{theme}' in the {form} form.\n"
        f"{kw_line}\n"
        f"{style_line}\n"
        f"{lang_line}\n"
        f"{rhyme_line}\n"
        f"Poem length: {req.length} lines.\n"
        f"Avoid clichés. Be vivid, original, and surprising.\n"
        f"Output only the poem — no title, no preamble, no commentary."
    )


def build_continue_prompt(req: ContinueRequest) -> str:
    poem = sanitize(req.poem, 2000)
    return (
        f"Here is a poem:\n\n{poem}\n\n"
        f"Continue this poem with 2 to 3 additional stanzas.\n"
        f"Perfectly match the voice, rhythm, imagery, and tone already established.\n"
        f"Output only the new stanzas — do not repeat any existing lines, no title, no preamble."
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


def build_respond_prompt(req: RespondRequest) -> str:
    poem = sanitize(req.poem, 2000)
    return (
        f"Here is a poem:\n\n{poem}\n\n"
        f"Write a new poem that responds to it — as if in conversation, "
        f"offering a reply, contrast, or a new perspective from a different voice. "
        f"Match its emotional register but bring a distinct, surprising angle.\n"
        f"Output only the response poem — no title, no preamble, no commentary."
    )


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.post("/generate")
@limiter.limit("20/minute")
async def generate(request: Request, req: GenerateRequest):
    return StreamingResponse(
        stream_to_sse(build_poem_prompt(req)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/revise")
@limiter.limit("30/minute")
async def revise(request: Request, req: ReviseRequest):
    return StreamingResponse(
        stream_to_sse(build_revise_prompt(req)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/continue")
@limiter.limit("20/minute")
async def continue_poem(request: Request, req: ContinueRequest):
    return StreamingResponse(
        stream_to_sse(build_continue_prompt(req)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/respond")
@limiter.limit("20/minute")
async def respond_to_poem(request: Request, req: RespondRequest):
    return StreamingResponse(
        stream_to_sse(build_respond_prompt(req)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/title")
@limiter.limit("40/minute")
async def title(request: Request, req: TitleRequest):
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
@limiter.limit("20/minute")
async def analyze(request: Request, req: AnalyzeRequest):
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


@app.post("/poems")
async def save_poem(req: SavePoemRequest):
    def _save():
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO poems (poem, title, theme, mood) VALUES (?, ?, ?, ?)",
            (req.poem[:3000], req.title[:100], req.theme[:100], req.mood[:50]),
        )
        conn.commit()
        conn.close()
    try:
        await db_run(_save)
    except Exception:
        pass
    return {"ok": True}


@app.get("/poems")
async def get_poems(limit: int = 50):
    def _get():
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute(
            "SELECT id, title, theme, mood, poem, created_at "
            "FROM poems ORDER BY created_at DESC LIMIT ?",
            (min(limit, 100),),
        ).fetchall()
        conn.close()
        return [
            {
                "id": r[0], "title": r[1], "theme": r[2],
                "mood": r[3], "poem": r[4], "created_at": r[5],
            }
            for r in rows
        ]
    try:
        rows = await db_run(_get)
    except Exception:
        rows = []
    return {"poems": rows}
