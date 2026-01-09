import streamlit as st
from openai import OpenAI
import re

client = OpenAI(
    base_url=st.secrets["openrouter_url"]['base_url'],
    api_key=st.secrets["openrouter"]["api_key"],
)

# Sanitize and validate user input
def sanitize_input(text, max_length=500):
    sanitized_text = text.strip()[:max_length]
    sanitized_text = re.sub(r'[^\w\s.,!?\'"-]', '', sanitized_text)
    return sanitized_text

# --- Poem Generation Function ---
def generate_poem(theme, mood, length, poetic_form, keywords, rhyme_scheme):
    # Sanitize inputs
    theme = sanitize_input(theme, max_length=100)
    keywords = sanitize_input(keywords, max_length=200)
    poetic_form = sanitize_input(poetic_form, max_length=50)
    mood = sanitize_input(mood, max_length=50)
    rhyme_scheme = sanitize_input(rhyme_scheme, max_length=50)

    prompt = f"""
    Write a {mood} poem about '{theme}' in the {poetic_form} form.
    Keywords to include: {keywords}.
    {'Use a rhyme scheme: ' + rhyme_scheme if rhyme_scheme != 'Free Verse' else 'Use free verse.'}
    Poem length: {length} lines.
    Avoid clichés. Be creative and imaginative.
    Don't show your <think> process
    """
    
    try:
        completion = client.chat.completions.create(
            extra_headers={"X-Title": "PristineQuill"},  # App name
            model="meta-llama/llama-3.2-3b-instruct:free",
            messages=[{"role": "user", "content": prompt}],
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return "⚠️ PristineQuill is temporarily unavailable. Please try again later."

# --- Poem Analysis Function ---
def analyze_poem(poem_text):
    poem_text = sanitize_input(poem_text, max_length=2000)

    prompt = f"""
    Analyze the following poem and provide the following details:
    - Mood
    - Theme
    - Poetic form
    - Rhyme scheme
    - Length (number of lines)
    
    Poem:
    {poem_text}
    """
    
    try:
        completion = client.chat.completions.create(
            extra_headers={"X-Title": "PristineQuillAnalysis"},
            model="deepseek/deepseek-r1-distill-llama-70b:free",
            messages=[{"role": "user", "content": prompt}],
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return "⚠️ Analysis service is temporarily unavailable. Please try again later."

# --- Streamlit UI ---
st.set_page_config(page_title="PristineQuill", page_icon="🎀", layout="centered")

st.markdown("""
    <style>
    .stTextInput input, .stSelectbox, .stSlider { border-radius: 10px !important; }
    .poem-box { 
        padding: 1.5rem; 
        border-radius: 10px; 
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-family: 'Georgia', serif;
    }
    </style>
""", unsafe_allow_html=True)

st.title("🎀 PristineQuill")
st.markdown("*For poetry—crafted one stanza at a time*")

# --- Poem Generation Section ---
st.header("Generate a Poem")
col1, col2 = st.columns(2)
with col1:
    theme = st.text_input("**Theme** (e.g., midnight rain, childhood, sunset, etc)")
    poetic_form = st.selectbox("**Poetic Form**", ["Acrostic", "Ballad", "Blank Verse", "Burlesque", "Free Verse", "Haiku", "Sonnet", "Villanelle"])
    keywords = st.text_input("**Keywords** (comma-separated)")
with col2:
    mood = st.selectbox("**Mood**", ["Joyful", "Melancholic", "Reflective", "Romantic", "Mysterious", "Peaceful"])
    length = st.slider("**Length (lines)**", 4, 50, 6)
    rhyme_scheme = st.selectbox("**Rhyme Scheme**", ["Free Verse", "Alternate Rhyme", "Couplet Rhyme", "Perfect Rhyme"])
    file_name_input = st.text_input("**Download file name** (without extension)", value="pristinequill")

if st.button("🖋️ Generate Poem"):
    if not theme:
        st.error("Please enter a theme!")
    else:
        with st.spinner("Crafting your poem..."):
            poem = generate_poem(theme, mood, length, poetic_form, keywords, rhyme_scheme)
            st.markdown("<div class='poem-box'>" + poem.replace('\n', '<br>') + "</div>", unsafe_allow_html=True)
            download_name = file_name_input.strip() + ".txt"
            st.download_button("Download Poem", poem, file_name=download_name)

# --- Poem Analysis Section ---
st.header("Analyze an Uploaded Poem")
uploaded_file = st.file_uploader("Upload a poem (text file)", type=["txt"])
if uploaded_file is not None:
    poem_text = uploaded_file.read().decode("utf-8")
    with st.spinner("Analyzing your poem..."):
        analysis = analyze_poem(poem_text)
        st.markdown("### Analysis Results")
        st.text(analysis)
