import streamlit as st
from openai import OpenAI

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=st.secrets["openrouter"]["api_key"],
)

# --- Poem Generation Function ---
def generate_poem(theme, mood, length, poetic_form, keywords, rhyme):
    prompt = f"""
    Write a {mood} poem about '{theme}' in the {poetic_form} form.
    Keywords to include: {keywords}.
    {'Use a rhyme scheme.' if rhyme else 'Use free verse.'}
    Poem length: {length} lines.
    Avoid clichés. Be creative and imaginative.
    Don't show your <think> process
    """
    
    completion = client.chat.completions.create(
        extra_headers={
                "X-Title": "PristineQuill",  # Your app name
            },
        model="deepseek/deepseek-r1-distill-llama-70b:free",
        messages=[{"role": "user", "content": prompt}],
    )
    return completion.choices[0].message.content.strip()


# --- Streamlit UI ---
st.set_page_config(page_title="PristineQuill", page_icon="🎀", layout="centered")

# Custom CSS for clean design
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

# --- User Inputs ---
st.title("🎀PristineQuill")
st.markdown("*For Pristine, for poetry—crafted one stanza at a time*")


col1, col2 = st.columns(2)
with col1:
    theme = st.text_input("**Theme** (e.g., midnight rain, childhood, sunset, etc)")
                                # 44 poetic forms
    poetic_form = st.selectbox("**Poetic Form**", 
                               [
                                   "Acrostic", "Ballad", "Blank Verse", "Burlesque", "Canzone", "Carpe Diem", "Cinquain", "Concrete Poem",
                                   "Couplets", "Diamante", "Double Dactyl", "Eclogue", "Elegy", "Endechas", "Epigram", "Epitaph", "Free Verse",
                                   "Ghazal", "Haiku", "Heroic Couplet", "Horation Ode", "Idyll", "Kimo", "Limerick", "Lyric", "Madrigal",
                                   "Masque", "Monorhyme", "Narrative Poem", "Ode", "Pantoum", "Pastoral", "Pindaric Ode", "Quatrain", "Rondeau",
                                   "Sapphic", "Senryu", "Sestina", "Sonnet", "Tanka", "Terzanelle", "Triolet", "Villanelle", "Virelay"
                               ])
    keywords = st.text_input("**Keywords** (comma-separated)")
with col2:
    mood = st.selectbox("**Mood**", 
                        ["Joyful/Celebratory",
                         "Sorrowful/Melancholic", 
                         "Reflective/Contemplative", 
                         "Romantic/Passionate", 
                         "Mysterious/Eerie",
                         "Peaceful/Serene",
                         "Angry/Outraged",
                         "Hopeful/Optimistic",
                         "Nostalgic/Longing",
                         "Playful/Whimsical",
                        ])
    length = st.slider("**Length (lines)**", 4, 12, 6)
    # tiara_style = st.toggle("Write with Tiara's Signature Style (metaphors, nostalgia)")
    rhyme = st.toggle("**Enable Rhyme**", value=True)

# --- Generate Poem ---
if st.button("🖋️ Generate Poem"):
    if not theme:
        st.error("Please enter a theme!")
    else:
        with st.spinner("Crafting your poem..."):
            poem = generate_poem(theme, mood, length, poetic_form, keywords, rhyme)
            
            # Display poem
            st.markdown("<div class='poem-box'>" + poem.replace('\n', '<br>') + "</div>", 
                        unsafe_allow_html=True)
            
            # Download button
            st.download_button("Download Poem", poem, file_name="pristinequill_poem.txt")
            

st.markdown("Happy Birthday, Abasifreke 👑🎂")
st.markdown("❤ & 💡: Victor Zion") 