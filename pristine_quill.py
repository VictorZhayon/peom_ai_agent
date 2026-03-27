import streamlit as st
from openai import OpenAI
import re

# --- Client Setup (cached so it's only created once per session) ---
@st.cache_resource
def get_client():
    return OpenAI(
        base_url=st.secrets["openrouter_url"]["base_url"],
        api_key=st.secrets["openrouter"]["api_key"],
    )

client = get_client()

# --- Input Sanitization ---
def sanitize_input(text, max_length=500):
    sanitized = text.strip()[:max_length]
    sanitized = re.sub(r'[^\w\s.,!?\'"-]', '', sanitized)
    return sanitized

# --- Model Fallback Lists ---
# openrouter/free auto-picks any available free model — best first choice.
GENERATION_MODELS = [
    "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v3-base:free",
    "google/gemma-3-12b-it:free",
    "qwen/qwen3-8b:free",
]

ANALYSIS_MODELS = [
    "openrouter/free",
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-12b-it:free",
    "qwen/qwen3-8b:free",
]

# Error codes that mean "this model is unavailable, try the next one"
RETRYABLE_CODES = ("429", "404", "503", "529")

# --- Streaming Poem Generation ---
def stream_poem(prompt, models):
    """
    Try each model with streaming. Yields text chunks as they arrive.
    Yields a special dict on error: {"error": "..."}.
    Yields {"model": "..."} as the first item on success so the caller
    knows which model responded.
    """
    last_error = None
    for model in models:
        try:
            stream = client.chat.completions.create(
                extra_headers={"X-Title": "PristineQuill"},
                model=model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                max_tokens=600,  # Poems don't need more — caps latency
            )
            yield {"model": model}
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    yield delta.content
            return  # Success — stop here
        except Exception as e:
            last_error = str(e)
            if any(code in str(e) for code in RETRYABLE_CODES):
                continue  # Try next model
            else:
                break
    yield {"error": last_error or "All models failed."}

# --- Non-streaming Analysis (analysis is read once, streaming less useful) ---
def call_with_fallback(prompt, models, extra_header_title):
    last_error = None
    for model in models:
        try:
            completion = client.chat.completions.create(
                extra_headers={"X-Title": extra_header_title},
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
            )
            if (
                completion is None
                or not completion.choices
                or completion.choices[0].message is None
                or completion.choices[0].message.content is None
            ):
                last_error = f"Model '{model}' returned an empty response."
                continue
            return completion.choices[0].message.content.strip(), None, model
        except Exception as e:
            last_error = str(e)
            if any(code in str(e) for code in RETRYABLE_CODES):
                continue
            else:
                break
    return None, last_error, None

# --- Poem Generation prompt builder ---
def build_poem_prompt(theme, mood, length, poetic_form, keywords, rhyme_scheme):
    theme = sanitize_input(theme, max_length=100)
    keywords = sanitize_input(keywords, max_length=200)
    poetic_form = sanitize_input(poetic_form, max_length=50)
    mood = sanitize_input(mood, max_length=50)
    rhyme_scheme = sanitize_input(rhyme_scheme, max_length=50)

    rhyme_instruction = (
        f"Use a rhyme scheme: {rhyme_scheme}."
        if rhyme_scheme != "Free Verse"
        else "Use free verse."
    )

    return f"""Write a {mood} poem about '{theme}' in the {poetic_form} form.
Keywords to include: {keywords}.
{rhyme_instruction}
Poem length: {length} lines.
Avoid clichés. Be creative and imaginative.
Output only the poem — no title, no preamble, no commentary."""

# --- Poem Analysis ---
def analyze_poem(poem_text):
    poem_text = sanitize_input(poem_text, max_length=2000)
    prompt = f"""Analyze the following poem and provide:
- Mood
- Theme
- Poetic form
- Rhyme scheme
- Length (number of lines)

Poem:
{poem_text}"""
    return call_with_fallback(prompt, ANALYSIS_MODELS, "PristineQuillAnalysis")

# --- Page Config ---
st.set_page_config(page_title="PristineQuill", page_icon="🎀", layout="centered")

# --- Custom CSS ---
st.markdown("""
    <style>
    .stTextInput input, .stSelectbox, .stSlider { border-radius: 10px !important; }
    .poem-box {
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-family: 'Georgia', serif;
        line-height: 1.8;
        white-space: pre-wrap;
    }
    </style>
""", unsafe_allow_html=True)

# --- Header ---
st.title("🎀 PristineQuill")
st.markdown("*For poetry — crafted one stanza at a time*")

# --- Poem Generation Section ---
st.header("Generate a Poem")

col1, col2 = st.columns(2)

with col1:
    theme = st.text_input("**Theme** (e.g., midnight rain, childhood, sunset)")
    poetic_form = st.selectbox("**Poetic Form**", [
        "Acrostic", "Ballad", "Blank Verse", "Burlesque", "Canzone", "Carpe Diem",
        "Cinquain", "Concrete Poem", "Couplets", "Diamante", "Double Dactyl", "Eclogue",
        "Elegy", "Endechas", "Epigram", "Epitaph", "Free Verse", "Ghazal", "Haiku",
        "Heroic Couplet", "Horation Ode", "Idyll", "Kimo", "Limerick", "Lyric", "Madrigal",
        "Masque", "Monorhyme", "Narrative Poem", "Ode", "Pantoum", "Pastoral",
        "Pindaric Ode", "Quatrain", "Rondeau", "Sapphic", "Senryu", "Sestina", "Sonnet",
        "Tanka", "Terzanelle", "Triolet", "Villanelle", "Virelay",
    ])
    keywords = st.text_input("**Keywords** (comma-separated)")

with col2:
    mood = st.selectbox("**Mood**", [
        "Adventurous", "Amused", "Angry", "Anxious", "Appreciative", "Ashamed", "Bitter",
        "Blissful", "Bold", "Calm", "Celebratory", "Contemplative", "Critical", "Curious",
        "Cynical", "Defiant", "Depressed", "Despairing", "Desperate", "Determined",
        "Disillusioned", "Dreamy", "Eerie", "Elated", "Embarrassed", "Empathetic",
        "Enthusiastic", "Envious", "Exuberant", "Fearful", "Flippant", "Frivolous",
        "Gloomy", "Grateful", "Guilty", "Happy", "Haunting", "Hopeful", "Humble",
        "Humorous", "Hurt", "Hypnotic", "Imaginative", "Inquisitive", "Insistent",
        "Inspiring", "Ironic", "Joyful", "Jubilant", "Lonely", "Longing", "Lyrical",
        "Melancholic", "Melodramatic", "Mellow", "Moody", "Morose", "Mournful", "Mystical",
        "Nostalgic", "Optimistic", "Outrageous", "Overwhelming", "Passionate", "Peaceful",
        "Pensive", "Playful", "Pleading", "Poignant", "Proud", "Provocative", "Puzzled",
        "Quirky", "Rebellious", "Reflective", "Regretful", "Relaxed", "Relentless",
        "Reminiscent", "Repentant", "Resigned", "Resolute", "Reverent", "Rhapsodic",
        "Romantic", "Sad", "Sarcastic", "Satirical", "Scornful", "Sensitive", "Sentimental",
        "Serious", "Sighing", "Silly", "Sincere", "Skeptical", "Sorrowful", "Soulful",
        "Somber", "Sophisticated", "Spiritual", "Stirring", "Stormy", "Strange", "Stubborn",
        "Subdued", "Sudden", "Sugary", "Sulky", "Suspenseful", "Sympathetic", "Tense",
        "Tentative", "Terse", "Thankful", "Thoughtful", "Threatening", "Timid", "Tranquil",
        "Triumphant", "Troubled", "Trusting", "Unafraid", "Uncertain", "Unconventional",
        "Unhappy", "Unnerving", "Unsettling", "Unwavering", "Uplifting", "Vehement",
        "Vigilant", "Violent", "Vivid", "Wary", "Wistful", "Witty", "Woeful", "Yearning",
        "Youthful", "Zealous",
    ])
    length = st.slider("**Length (lines)**", 4, 50, 6)
    rhyme_scheme = st.selectbox("**Rhyme Scheme**", [
        "Free Verse", "Alliterative Rhyme", "Alternate Rhyme", "Assonance", "Consonance",
        "Couplet Rhyme", "Enclosed Rhyme", "End Rhyme", "Eye Rhyme", "Feminine Rhyme",
        "Half Rhyme", "Internal Rhyme", "Monorhyme", "Perfect Rhyme", "Slant Rhyme",
        "Triplet Rhyme", "Wrenched Rhyme", "Rhyme Royal",
    ])

if st.button("🖋️ Generate Poem"):
    if not theme:
        st.error("Please enter a theme!")
    else:
        prompt = build_poem_prompt(theme, mood, length, poetic_form, keywords, rhyme_scheme)
        poem_chunks = []
        used_model = None
        poem_placeholder = st.empty()

        for chunk in stream_poem(prompt, GENERATION_MODELS):
            if isinstance(chunk, dict):
                if "error" in chunk:
                    st.error(f"All models failed. Last error: {chunk['error']}")
                    break
                elif "model" in chunk:
                    used_model = chunk["model"]
            else:
                poem_chunks.append(chunk)
                # Re-render the poem box with each new chunk
                current_text = "".join(poem_chunks)
                poem_placeholder.markdown(
                    "<div class='poem-box'>" + current_text.replace("\n", "<br>") + "</div>",
                    unsafe_allow_html=True,
                )

        if poem_chunks:
            full_poem = "".join(poem_chunks)
            if used_model:
            st.download_button("📥 Download Poem", full_poem, file_name="pristinequill.txt")

# --- Poem Analysis Section ---
st.header("Analyze an Uploaded Poem")

uploaded_file = st.file_uploader("Upload a poem (text file)", type=["txt"])

if uploaded_file is not None:
    poem_text = uploaded_file.read().decode("utf-8")
    with st.spinner("Analyzing your poem..."):
        analysis, error, used_model = analyze_poem(poem_text)
        if error:
            st.error(f"All models failed. Last error: {error}")
        elif analysis:
            st.caption(f"Analyzed by: `{used_model}`")
            st.markdown("### Analysis Results")
            st.text(analysis)
