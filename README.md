# Volta

A full-stack poetry generation app. Write, refine, and explore poems with live streaming output, revision tools, and a clean dark-themed UI.

**[Live demo →](https://volta-poetry.vercel.app)**

---

## Features

**Generate**
- 43 poetic forms — Sonnet, Ghazal, Villanelle, Haiku, Elegy, and more
- 100+ moods
- Poet style presets — Neruda, Dickinson, Whitman, Rumi, Plath, Keats, Hafiz, Lorca
- Occasion presets — Birthday, Wedding, Eulogy, Love Letter, Lullaby, Apology
- 15 languages — Spanish, French, Japanese, Arabic, and more
- Random inspiration randomizes all parameters instantly

**Refine**
- Live streaming — poem writes out token-by-token via Server-Sent Events
- Revision presets — Shorten / Darker / More imagery / Add rhyme / Expand
- Custom revision — freeform text instruction field
- Continue — append 2–3 stanzas that match the existing voice exactly
- Respond — generate a poetic reply from a distinct, contrasting voice
- Undo — single-level undo after any revision or continuation
- Compare — line-by-line diff of original vs revised poem

**Read & Export**
- Auto-title — AI-generated title after every poem
- Read aloud — Web Speech API with natural pacing
- Font size — 6 reading sizes, persisted to localStorage
- Poem stats — word, line, and stanza counts
- Fullscreen — distraction-free reading mode
- Copy, Download (.txt), Print

**Save & Share**
- Favorites — star any poem, stored in localStorage
- Auto-save — last poem restored on page reload
- Share link — URL hash encodes the full poem for zero-backend sharing
- Server history — all generated poems auto-saved to SQLite, browsable in-app

**Analyze**
- Paste or upload any .txt to analyze mood, theme, form, rhyme scheme, and line count

**Technical**
- PWA — installable, app shell cached by service worker for offline reading
- Rate limiting — per-IP limits on all generation endpoints via slowapi
- Model fallback — Gemini 2.5 Flash Lite → 2.0 Flash Lite → 2.0 Flash Lite 001

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Python 3.12 |
| Frontend | Vanilla JS (no framework) |
| AI | Google Gemini via OpenAI-compatible API |
| Streaming | Server-Sent Events (SSE) |
| Persistence | SQLite (stdlib) + localStorage |
| Rate limiting | slowapi |
| Deployment | Vercel |

---

## Architecture notes

**Why SSE instead of WebSockets?** SSE is unidirectional server→client, stateless, and works over plain HTTP. No upgrade handshake, no extra infrastructure — trivially deployable serverlessly.

**Why `AsyncOpenAI`?** The sync `OpenAI` client blocks the event loop. With streaming, each `next()` call waits for the next token — running that synchronously in FastAPI's async runtime causes the event loop to stall, resulting in poem truncation mid-way. `async for chunk in stream` yields control between tokens.

**Why lite models?** Gemini 2.5 Flash (non-lite) allocates a "thinking token" budget before output begins. With a 2048 `max_tokens` cap, thinking tokens can exhaust the budget before the poem finishes. The lite variants skip thinking entirely, producing faster and complete output.

**Model fallback:** If the primary model returns 429 (quota) or 503 (unavailable), the chain retries automatically. Users never see a failure unless all three models are down simultaneously.

**Frontend state:** No framework. All state is module-level `let`/`const` variables. SSE is consumed via `fetch` + `ReadableStream` with a line-buffer parser that correctly handles partial `data:` frames across chunk boundaries.

**Revision diff:** A Longest Common Subsequence (LCS) algorithm computes a line-by-line diff between the original and revised poem. Added lines are highlighted green, removed lines are struck through in red.

---

## Setup

**1. Clone and install**

```bash
git clone https://github.com/yourname/volta
cd volta
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

**2. Configure**

```bash
cp .env.example .env
# Edit .env — add your GOOGLE_AI_API_KEY
# Get one free at: https://aistudio.google.com/app/apikey
```

**3. Run**

```bash
uvicorn main:app --reload
# → http://localhost:8000
```

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add `GOOGLE_AI_API_KEY` in the Vercel dashboard under **Settings → Environment Variables**, then redeploy.

> **SQLite on Vercel:** Writes to `/tmp/volta.db`. Vercel's `/tmp` is ephemeral per-instance, so history won't persist across cold starts. For durable persistence, swap in a hosted database (Turso, Neon). Only the `DB_PATH` / `db_run` section in `main.py` needs updating.

> **Rate limiting on Vercel:** `slowapi` uses in-process counters. On serverless deployments each instance has separate counters. For true cross-instance rate limiting, back it with Redis.

---

## Project structure

```
main.py              # FastAPI: all API endpoints + SQLite helpers
requirements.txt
vercel.json
.python-version      # 3.12

templates/
  index.html         # Single-page app shell

static/
  app.js             # All client-side logic (~1100 LOC)
  style.css          # Dark theme, gold accents, responsive (~1320 LOC)
  manifest.json      # PWA manifest
  sw.js              # Service worker: app-shell caching
  icon.svg           # App icon (SVG, maskable)

.env.example
```

---

## API endpoints

| Method | Path | Rate limit | Description |
|---|---|---|---|
| GET | `/` | — | App shell |
| POST | `/generate` | 20/min | Stream a new poem |
| POST | `/revise` | 30/min | Stream a revised poem |
| POST | `/continue` | 20/min | Stream continuation stanzas |
| POST | `/respond` | 20/min | Stream a poetic reply |
| POST | `/title` | 40/min | Generate a title (non-streaming) |
| POST | `/analyze` | 20/min | Analyze a poem (non-streaming) |
| POST | `/poems` | — | Save poem to SQLite |
| GET | `/poems` | — | Retrieve saved poems |
