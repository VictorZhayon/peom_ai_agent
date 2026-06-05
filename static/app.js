'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const history = [];
let currentPoem = '';
let currentTheme = '';
let currentTitle = '';

// ── DOM refs ───────────────────────────────────────────────────────────────
const form         = document.getElementById('poem-form');
const generateBtn  = document.getElementById('generate-btn');
const randomBtn    = document.getElementById('random-btn');
const lengthInput  = document.getElementById('length');
const lengthDisplay= document.getElementById('length-display');

const poemCard        = document.getElementById('poem-card');
const emptyState      = document.getElementById('empty-state');
const loadingState    = document.getElementById('loading-state');
const poemTitleWrap   = document.getElementById('poem-title-wrap');
const poemTitleLoading= document.getElementById('poem-title-loading');
const poemTitleEl     = document.getElementById('poem-title');
const poemText        = document.getElementById('poem-text');
const poemActions     = document.getElementById('poem-actions');
const modelBadge      = document.getElementById('model-badge');
const copyBtn         = document.getElementById('copy-btn');
const downloadBtn     = document.getElementById('download-btn');

const analyzeToggle= document.getElementById('analyze-toggle');
const analyzePanel = document.getElementById('analyze-panel');
const analyzeInput = document.getElementById('analyze-input');
const fileUpload   = document.getElementById('file-upload');
const analyzeBtn   = document.getElementById('analyze-btn');
const analyzeResult= document.getElementById('analyze-result');
const analyzeModel = document.getElementById('analyze-model-badge');
const analyzeText  = document.getElementById('analyze-text');
const analyzeError = document.getElementById('analyze-error');

const historySection  = document.getElementById('history-section');
const historyList     = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// ── Random inspiration data ────────────────────────────────────────────────
const RANDOM_THEMES = [
  'midnight rain', 'forgotten letters', 'childhood summers', 'the space between stars',
  'first snow', 'abandoned lighthouse', "a mother's hands", 'a city asleep',
  'the last train home', 'autumn leaves on water', 'maps of a lost country',
  'broken clocks', 'the smell of old books', 'an empty chair', 'tidal breath',
  'the weight of silence', 'crumbling walls', 'fireflies at dusk', 'a wound that healed',
  'the ocean at night',
];
const RANDOM_MOODS = [
  'Melancholic', 'Wistful', 'Nostalgic', 'Haunting', 'Tranquil', 'Longing',
  'Dreamy', 'Mystical', 'Hopeful', 'Pensive', 'Reverent', 'Stirring',
  'Eerie', 'Peaceful', 'Sorrowful', 'Romantic',
];
const RANDOM_FORMS = [
  'Free Verse', 'Sonnet', 'Haiku', 'Elegy', 'Ode', 'Villanelle',
  'Ghazal', 'Tanka', 'Lyric', 'Ballad', 'Pantoum', 'Sestina',
];
const RANDOM_RHYMES = [
  'Free Verse', 'Slant Rhyme', 'Alternate Rhyme', 'Couplet Rhyme',
  'Internal Rhyme', 'Half Rhyme', 'Free Verse', 'Free Verse',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Length slider ──────────────────────────────────────────────────────────
lengthInput.addEventListener('input', () => {
  lengthDisplay.textContent = lengthInput.value;
});

// ── Random inspiration ─────────────────────────────────────────────────────
randomBtn.addEventListener('click', () => {
  document.getElementById('theme').value = pick(RANDOM_THEMES);
  setSelectValue('mood', pick(RANDOM_MOODS));
  setSelectValue('poetic_form', pick(RANDOM_FORMS));
  setSelectValue('rhyme_scheme', pick(RANDOM_RHYMES));
  lengthInput.value = Math.floor(Math.random() * 18) + 6;
  lengthDisplay.textContent = lengthInput.value;
  document.getElementById('keywords').value = '';
});

function setSelectValue(id, value) {
  const sel = document.getElementById(id);
  for (const opt of sel.options) {
    if (opt.value === value || opt.text === value) {
      sel.value = opt.value;
      return;
    }
  }
}

// ── Poem display helpers ───────────────────────────────────────────────────
function showEmpty() {
  poemCard.className = 'poem-card state-empty';
  emptyState.style.display = '';
  loadingState.style.display = 'none';
  poemTitleWrap.style.display = 'none';
  poemText.style.display = 'none';
  poemActions.style.display = 'none';
  currentTitle = '';
}

function showLoading() {
  poemCard.className = 'poem-card state-active';
  emptyState.style.display = 'none';
  loadingState.style.display = '';
  poemTitleWrap.style.display = 'none';
  poemText.style.display = 'none';
  poemActions.style.display = 'none';
}

function showPoem(text, model) {
  poemCard.className = 'poem-card state-active';
  emptyState.style.display = 'none';
  loadingState.style.display = 'none';
  poemText.style.display = '';
  poemText.textContent = text;
  poemText.classList.remove('streaming');
  poemActions.style.display = '';
  modelBadge.textContent = model || '';
}

function startStreaming() {
  poemCard.className = 'poem-card state-active';
  emptyState.style.display = 'none';
  loadingState.style.display = 'none';
  poemTitleWrap.style.display = 'none';
  poemText.style.display = '';
  poemText.textContent = '';
  poemText.classList.add('streaming');
  poemActions.style.display = 'none';
}

function showTitleLoading() {
  poemTitleEl.textContent = '';
  poemTitleEl.classList.remove('visible');
  poemTitleLoading.style.display = 'flex';
  poemTitleWrap.style.display = '';
}

function showTitle(title) {
  poemTitleLoading.style.display = 'none';
  poemTitleEl.textContent = title;
  // Trigger transition on next frame
  requestAnimationFrame(() => poemTitleEl.classList.add('visible'));
}

async function fetchTitle(poem) {
  showTitleLoading();
  try {
    const res = await fetch('/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poem }),
    });
    const data = await res.json();
    if (data.title) {
      currentTitle = data.title;
      showTitle(data.title);
    } else {
      poemTitleWrap.style.display = 'none';
    }
  } catch {
    poemTitleWrap.style.display = 'none';
  }
}

// ── Poem generation ────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const theme = document.getElementById('theme').value.trim();
  if (!theme) return;

  const payload = {
    theme,
    mood:         document.getElementById('mood').value,
    length:       parseInt(lengthInput.value, 10),
    poetic_form:  document.getElementById('poetic_form').value,
    keywords:     document.getElementById('keywords').value.trim(),
    rhyme_scheme: document.getElementById('rhyme_scheme').value,
  };

  generateBtn.disabled = true;
  currentPoem = '';
  currentTheme = theme;

  // Show spinner first, transition to streaming once model responds
  showLoading();

  let usedModel = '';
  let firstChunk = true;

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') {
          showPoem(currentPoem, usedModel);
          addToHistory(currentPoem, currentTheme, payload.mood, payload.poetic_form);
          fetchTitle(currentPoem);
          return;
        }
        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }

        if (parsed.error) {
          showEmpty();
          showError(parsed.error);
          return;
        }
        if (parsed.model) {
          usedModel = parsed.model;
        }
        if (parsed.text) {
          if (firstChunk) {
            startStreaming();
            firstChunk = false;
          }
          currentPoem += parsed.text;
          poemText.textContent = currentPoem;
        }
      }
    }
    // Stream ended without [DONE]
    if (currentPoem) showPoem(currentPoem, usedModel);

  } catch (err) {
    showEmpty();
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
});

function showError(msg) {
  const div = document.createElement('div');
  div.className = 'error-msg';
  div.textContent = msg;
  poemSection.prepend(div);
  setTimeout(() => div.remove(), 6000);
}

// Grab poem section for error insertion
const poemSection = document.querySelector('.poem-section');

// ── Copy & Download ────────────────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  if (!currentPoem) return;
  await navigator.clipboard.writeText(currentPoem);
  copyBtn.textContent = '';
  copyBtn.classList.add('copied');
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> Copied`;
  setTimeout(() => {
    copyBtn.classList.remove('copied');
    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
  }, 2000);
});

downloadBtn.addEventListener('click', () => {
  if (!currentPoem) return;
  const base = currentTitle || currentTheme;
  const slug = base.replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 40).toLowerCase();
  const content = currentTitle ? `${currentTitle}\n\n${currentPoem}` : currentPoem;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `volta-${slug}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── History ────────────────────────────────────────────────────────────────
function addToHistory(poem, theme, mood, form) {
  history.unshift({ poem, theme, mood, form, ts: Date.now() });
  if (history.length > 8) history.pop();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historySection.style.display = 'none';
    return;
  }
  historySection.style.display = '';
  historyList.innerHTML = '';
  history.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-theme">${escHtml(item.theme)}</div>
      <div class="history-card-meta">${escHtml(item.mood)} · ${escHtml(item.form)}</div>
    `;
    card.addEventListener('click', () => {
      currentPoem = item.poem;
      currentTheme = item.theme;
      showPoem(item.poem, '');
    });
    historyList.appendChild(card);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  history.length = 0;
  renderHistory();
});

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Analyze toggle ─────────────────────────────────────────────────────────
analyzeToggle.addEventListener('click', () => {
  const open = analyzePanel.style.display === 'none';
  analyzePanel.style.display = open ? '' : 'none';
  analyzeToggle.classList.toggle('open', open);
});

// ── File upload → textarea ─────────────────────────────────────────────────
fileUpload.addEventListener('change', () => {
  const file = fileUpload.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { analyzeInput.value = e.target.result; };
  reader.readAsText(file);
  fileUpload.value = '';
});

// ── Analyze ────────────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  const poem = analyzeInput.value.trim();
  if (!poem) return;

  analyzeBtn.disabled = true;
  analyzeResult.style.display = 'none';
  analyzeError.style.display = 'none';
  analyzeBtn.textContent = 'Analyzing…';

  try {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poem }),
    });
    const data = await res.json();
    if (data.error) {
      analyzeError.textContent = data.error;
      analyzeError.style.display = '';
    } else {
      analyzeModel.textContent = data.model || '';
      analyzeText.textContent = data.analysis;
      analyzeResult.style.display = '';
    }
  } catch (err) {
    analyzeError.textContent = err.message;
    analyzeError.style.display = '';
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Analyze`;
  }
});
