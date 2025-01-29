import openai
import streamlit as st

# Initialize OpenAI client
openai.api_key = ""

# --- Poem Generation Function ---
def generate_poem(theme, mood, length, poetic_form, keywords, rhyme):
    prompt = f"""
    Write a {mood} poem about '{theme}' in the {poetic_form} form.
    Keywords to include: {keywords}.
    {'Use a rhyme scheme.' if rhyme else 'Use free verse.'}
    Poem length: {length} lines.
    Avoid clichés. Be creative and imaginative.
    """
    
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=500
    )
    return response.choices[0].message.content.strip()

# --- Streamlit UI ---
st.set_page_config(page_title="TiaraQuill", page_icon="🎀", layout="centered")

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
st.title("🎀 TiaraQuill")
st.markdown("*Dip into imagination. Write the extraordinary.*")


col1, col2 = st.columns(2)
with col1:
    theme = st.text_input("**Theme** (e.g., midnight rain, childhood):")
    poetic_form = st.selectbox("**Poetic Form**", ["Sonnet", "Haiku", "Free Verse", "Limerick", "Villanelle"])
    keywords = st.text_input("**Keywords** (comma-separated):")
with col2:
    mood = st.selectbox("**Mood**", ["Whimsical", "Melancholic", "Hopeful", "Mysterious", "Romantic"])
    length = st.slider("**Length (lines)**", 4, 20, 12)
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
            st.download_button("Download Poem", poem, file_name="tiaraquill_poem.txt")
            

st.markdown("*By Victor, for Tiara*")            