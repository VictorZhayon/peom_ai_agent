import openai
import streamlit

from openai import OpenAI
import streamlit as st

client = OpenAI(api_key="YOUR_API_KEY")

def tiaraquill_generate(theme, mood, style="tiara", rhyme=True):
    # Customize the prompt based on Tiara's style
    prompt = f"""
    Write a {mood} poem about {theme}.
    { "Use vivid metaphors and a nostalgic tone." if style == "tiara" else "" }
    { "Include a rhyme scheme." if rhyme else "Use free verse." }
    Avoid clichés. Be imaginative.
    """
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8 if style == "tiara" else 0.5  # Higher temp = more creative
    )
    return response.choices[0].message.content

# Streamlit UI
st.title("🎀 TiaraQuill: Poetry Crafted by Tiara")
theme = st.text_input("Theme (e.g., 'midnight rain', 'childhood memories'):")
mood = st.selectbox("Mood", ["whimsical", "melancholic", "hopeful", "mysterious"])
tiara_style = st.checkbox("Tiara’s Signature Style (metaphors, nostalgia)")
rhyme = st.checkbox("Add Rhyme", value=True)

if st.button("Write with the Quill"):
    poem = tiaraquill_generate(theme, mood, "tiara" if tiara_style else "generic", rhyme)
    st.subheader("Your Poem")
    st.markdown(f"<div style='font-family: cursive; color: #4B0082;'>{poem}</div>", unsafe_allow_html=True)