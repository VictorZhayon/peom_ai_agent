﻿# PristineQuill

PristineQuill is am AI-powered poetry generation app created by Victor, designed to craft beautiful poems one stanza at a time.

## Poem Generation Function

The `generate_poem` function takes in various parameters such as theme, mood, length, poetic form, keywords, and rhyme to generate a unique poem using the OpenAI API. It constructs a prompt based on the input parameters and then uses the GPT-4 language model to generate a poem based on that prompt. The generated poem is returned as the output.

## Streamlit UI

The Streamlit User Interface allows users to interact with PristineQuill and generate custom poems. Users can input the theme, mood, length, poetic form, keywords, and choose whether to enable rhyme within the poem. The UI is designed for ease of use and aesthetic appeal.

### Custom CSS Styling

The UI elements are customized using CSS to provide a clean and elegant design. Input fields, select boxes, and sliders have a border-radius of 10px for a rounded look. The poem box has padding, a border-radius, a box shadow, and a specific font style to enhance the reading experience.

### User Inputs

1. **Theme**: Users can input a theme for the poem (e.g., midnight rain, childhood, sunset, etc).
2. **Poetic Form**: Users can select a poetic form for the poem, such as Sonnet, Haiku, Limerick, Ballad, Free Verse, Villanelle, Ode, Elegy, Ghazal, or Sestina.
3. **Keywords**: Users can input keywords separated by commas to be included in the poem.
4. **Mood**: Users can select the mood of the poem from options like Joyful/Celebratory, Sorrowful/Melancholic, Reflective/Contemplative, Romantic/Passionate, Mysterious/Eerie, Peaceful/Serene, Angry/Outraged, Hopeful/Optimistic, Nostalgic/Longing, and Playful/Whimsical.
5. **Length (lines)**: Users can adjust the length of the poem by selecting the number of lines desired.
6. **Enable Rhyme**: Users can toggle this option to enable or disable rhyme within the poem.

### Generate Poem

When the "Generate Poem" button is clicked, the input parameters are validated, and if the theme is provided, the poem generation process begins. A loading spinner indicates that the poem is being crafted, and once generated, the poem is displayed in a styled box on the UI. Users can also download the generated poem as a text file using the "Download Poem" button.
