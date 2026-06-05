# Volta — AI Poetry

An AI-powered poetry generation and analysis app built with FastAPI and Vanilla JS.

## Features

- **Poem generation** — choose theme, mood, poetic form, rhyme scheme, and length
- **Streaming output** — poem streams in live as it's written
- **Auto-title** — a title is suggested for every generated poem
- **Poem analysis** — paste or upload a poem to get mood, theme, form, and rhyme breakdown
- **Session history** — last 8 poems saved for the session
- **Random inspiration** — randomize all parameters with one click
- **Copy & Download** — copy to clipboard or save as `.txt`

## Stack

- **Backend** — FastAPI + Python
- **Frontend** — Vanilla JS + CSS (no frameworks)
- **Models** — Google Gemini 2.0 Flash → 1.5 Flash → 1.5 Pro
- **Streaming** — Server-Sent Events via `fetch` ReadableStream

## Setup

**1. Clone and create a virtual environment**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**2. Configure API keys**
```bash
cp .env.example .env
```
Edit `.env` and add your key:
- `GOOGLE_AI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey) (free tier available)

**3. Run**
```bash
uvicorn main:app --reload
```
Open [http://localhost:8000](http://localhost:8000).

## Project Structure

```
main.py              # FastAPI app — generation, title, analysis endpoints
templates/
  index.html         # Single-page UI
static/
  style.css          # Dark theme, gold accents
  app.js             # Streaming, history, copy/download, random
.env.example         # API key template
requirements.txt
```
