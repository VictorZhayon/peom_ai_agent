'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const history   = [];
const favorites = JSON.parse(localStorage.getItem('volta-favorites') || '[]');
let currentPoem  = '';
let currentTheme = '';
let currentTitle = '';
let currentMood  = '';
let isGenerating    = false;
let isFetchingTitle = false;
let isSpeaking      = false;
let undoPoem        = '';
let undoTitle       = '';
let respondPoem     = '';

// ── Font size ──────────────────────────────────────────────────────────────
const FONT_SIZES = [1.0, 1.15, 1.35, 1.5, 1.65, 1.85];
let fontSizeIdx  = Math.min(
  Math.max(parseInt(localStorage.getItem('volta-font-size') ?? '2', 10), 0),
  FONT_SIZES.length - 1,
);

// ── Occasion presets ───────────────────────────────────────────────────────
const OCCASIONS = {
  birthday: {
    theme: 'celebrating a birthday and the gift of another year',
    mood: 'Celebratory', length: 12, poetic_form: 'Lyric',
    keywords: 'joy, years, friendship, light, laughter',
    rhyme_scheme: 'Alternate Rhyme',
  },
  love: {
    theme: 'a letter to the person I love most',
    mood: 'Romantic', length: 16, poetic_form: 'Sonnet',
    keywords: 'heart, longing, tenderness, forever',
    rhyme_scheme: 'Alternate Rhyme',
  },
  eulogy: {
    theme: 'remembering someone who has passed too soon',
    mood: 'Mournful', length: 20, poetic_form: 'Elegy',
    keywords: 'memory, light, grace, forever, absence',
    rhyme_scheme: 'Free Verse',
  },
  wedding: {
    theme: 'two people beginning their life together',
    mood: 'Hopeful', length: 14, poetic_form: 'Lyric',
    keywords: 'vows, together, home, forever, intertwined',
    rhyme_scheme: 'Couplet Rhyme',
  },
  apology: {
    theme: 'seeking forgiveness from someone I have hurt',
    mood: 'Sorrowful', length: 12, poetic_form: 'Free Verse',
    keywords: 'sorry, broken, mend, time, words fail',
    rhyme_scheme: 'Free Verse',
  },
  lullaby: {
    theme: 'a gentle lullaby for a child drifting to sleep',
    mood: 'Peaceful', length: 10, poetic_form: 'Ballad',
    keywords: 'moonlight, sleep, dreams, soft, safe',
    rhyme_scheme: 'Alternate Rhyme',
  },
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const form          = document.getElementById('poem-form');
const generateBtn   = document.getElementById('generate-btn');
const randomBtn     = document.getElementById('random-btn');
const lengthInput   = document.getElementById('length');
const lengthDisplay = document.getElementById('length-display');

const poemCard         = document.getElementById('poem-card');
const emptyState       = document.getElementById('empty-state');
const loadingState     = document.getElementById('loading-state');
const poemTitleWrap    = document.getElementById('poem-title-wrap');
const poemTitleLoading = document.getElementById('poem-title-loading');
const poemTitleEl      = document.getElementById('poem-title');
const poemText         = document.getElementById('poem-text');
const poemMeta         = document.getElementById('poem-meta');
const poemStats        = document.getElementById('poem-stats');
const fontSizeDown     = document.getElementById('font-size-down');
const fontSizeUp       = document.getElementById('font-size-up');
const poemActions      = document.getElementById('poem-actions');
const regenerateBtn    = document.getElementById('regenerate-btn');
const continueBtn      = document.getElementById('continue-btn');
const respondBtn       = document.getElementById('respond-btn');
const undoBtn          = document.getElementById('undo-btn');
const diffBtn          = document.getElementById('diff-btn');
const starBtn          = document.getElementById('star-btn');
const readBtn          = document.getElementById('read-btn');
const copyBtn          = document.getElementById('copy-btn');
const downloadBtn      = document.getElementById('download-btn');
const shareBtn         = document.getElementById('share-btn');
const printBtn         = document.getElementById('print-btn');
const fullscreenBtn    = document.getElementById('fullscreen-btn');
const fullscreenHint   = document.getElementById('fullscreen-hint');
const revisionBar      = document.getElementById('revision-bar');
const revisionBtns     = document.querySelectorAll('.btn-revise[data-instruction]');
const revisionCustomInput = document.getElementById('revision-custom-input');
const revisionCustomBtn   = document.getElementById('revision-custom-btn');

// Response panel refs
const responseSection = document.getElementById('response-section');
const responseText    = document.getElementById('response-text');
const responseAdopt   = document.getElementById('response-adopt');
const responseDismiss = document.getElementById('response-dismiss');

// Diff modal refs
const diffModal   = document.getElementById('diff-modal');
const diffClose   = document.getElementById('diff-close');
const diffContent = document.getElementById('diff-content');

// Cloud history refs
const cloudHistoryBtn = document.getElementById('cloud-history-btn');
const cloudModal      = document.getElementById('cloud-modal');
const cloudClose      = document.getElementById('cloud-close');
const cloudList       = document.getElementById('cloud-list');

const analyzeToggle = document.getElementById('analyze-toggle');
const analyzePanel  = document.getElementById('analyze-panel');
const analyzeInput  = document.getElementById('analyze-input');
const fileUpload    = document.getElementById('file-upload');
const analyzeBtn    = document.getElementById('analyze-btn');
const analyzeResult = document.getElementById('analyze-result');
const analyzeRows   = document.getElementById('analyze-rows');
const analyzeError  = document.getElementById('analyze-error');

const historySection    = document.getElementById('history-section');
const historyList       = document.getElementById('history-list');
const clearHistoryBtn   = document.getElementById('clear-history-btn');
const favoritesSection  = document.getElementById('favorites-section');
const favoritesList     = document.getElementById('favorites-list');
const clearFavoritesBtn = document.getElementById('clear-favorites-btn');

const sidebar       = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobile-overlay');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');

const presetChips  = document.querySelectorAll('.preset-chip');
const styleInput   = document.getElementById('style');
const occasionBtns = document.querySelectorAll('.occasion-btn');

const shortcutsBtn   = document.getElementById('shortcuts-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');
const shortcutsClose = document.getElementById('shortcuts-close');

// ── Random inspiration data ────────────────────────────────────────────────
const RANDOM_THEMES = [
  'midnight rain', 'forgotten letters', 'childhood summers', 'the space between stars',
  'first snow', 'abandoned lighthouse', "a mother's hands", 'a city asleep',
  'the last train home', 'autumn leaves on water', 'maps of a lost country',
  'broken clocks', 'the smell of old books', 'an empty chair', 'tidal breath',
  'the weight of silence', 'crumbling walls', 'fireflies at dusk', 'a wound that healed',
  'the ocean at night',
];
const RANDOM_MOODS  = ['Melancholic','Wistful','Nostalgic','Haunting','Tranquil','Longing','Dreamy','Mystical','Hopeful','Pensive','Reverent','Stirring','Eerie','Peaceful','Sorrowful','Romantic'];
const RANDOM_FORMS  = ['Free Verse','Sonnet','Haiku','Elegy','Ode','Villanelle','Ghazal','Tanka','Lyric','Ballad','Pantoum','Sestina'];
const RANDOM_RHYMES = ['Free Verse','Slant Rhyme','Alternate Rhyme','Couplet Rhyme','Internal Rhyme','Half Rhyme','Free Verse','Free Verse'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Font size ──────────────────────────────────────────────────────────────
function applyFontSize() {
  poemText.style.fontSize = `${FONT_SIZES[fontSizeIdx]}rem`;
  fontSizeDown.disabled   = fontSizeIdx === 0;
  fontSizeUp.disabled     = fontSizeIdx === FONT_SIZES.length - 1;
}
fontSizeDown.addEventListener('click', () => {
  if (fontSizeIdx > 0) { fontSizeIdx--; applyFontSize(); localStorage.setItem('volta-font-size', fontSizeIdx); }
});
fontSizeUp.addEventListener('click', () => {
  if (fontSizeIdx < FONT_SIZES.length - 1) { fontSizeIdx++; applyFontSize(); localStorage.setItem('volta-font-size', fontSizeIdx); }
});
applyFontSize();

// ── Slider fill ────────────────────────────────────────────────────────────
function updateSliderFill() {
  const min = +lengthInput.min, max = +lengthInput.max, val = +lengthInput.value;
  lengthInput.style.setProperty('--track-fill', `${((val - min) / (max - min)) * 100}%`);
}
lengthInput.addEventListener('input', () => {
  lengthDisplay.textContent = lengthInput.value;
  updateSliderFill();
});
updateSliderFill();

// ── Random inspiration ─────────────────────────────────────────────────────
randomBtn.addEventListener('click', () => {
  document.getElementById('theme').value = pick(RANDOM_THEMES);
  setSelectValue('mood', pick(RANDOM_MOODS));
  setSelectValue('poetic_form', pick(RANDOM_FORMS));
  setSelectValue('rhyme_scheme', pick(RANDOM_RHYMES));
  lengthInput.value = Math.floor(Math.random() * 18) + 6;
  lengthDisplay.textContent = lengthInput.value;
  updateSliderFill();
  document.getElementById('keywords').value = '';
  styleInput.value = '';
  clearActiveChip();
  clearActiveOccasion();
});

function setSelectValue(id, value) {
  const sel = document.getElementById(id);
  for (const opt of sel.options) {
    if (opt.value === value || opt.text === value) { sel.value = opt.value; return; }
  }
}

// ── Occasion presets ───────────────────────────────────────────────────────
function clearActiveOccasion() {
  occasionBtns.forEach(b => b.classList.remove('active'));
}

occasionBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const occ = OCCASIONS[btn.dataset.occasion];
    if (!occ) return;
    document.getElementById('theme').value    = occ.theme;
    document.getElementById('keywords').value = occ.keywords;
    setSelectValue('mood', occ.mood);
    setSelectValue('poetic_form', occ.poetic_form);
    setSelectValue('rhyme_scheme', occ.rhyme_scheme);
    lengthInput.value = occ.length;
    lengthDisplay.textContent = occ.length;
    updateSliderFill();
    styleInput.value = '';
    clearActiveChip();
    clearActiveOccasion();
    btn.classList.add('active');
    document.getElementById('theme').focus();
  });
});

// ── Poet preset chips ──────────────────────────────────────────────────────
function clearActiveChip() {
  presetChips.forEach(c => c.classList.remove('active'));
}

presetChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    styleInput.value = chip.dataset.poet;
    clearActiveChip();
    chip.classList.add('active');
  });
});

styleInput.addEventListener('input', () => {
  const val = styleInput.value.trim().toLowerCase();
  presetChips.forEach(c => {
    c.classList.toggle('active', c.dataset.poet.toLowerCase() === val);
  });
});

// ── Keyboard shortcuts modal ───────────────────────────────────────────────
function openShortcuts()  { shortcutsModal.style.display = ''; }
function closeShortcuts() { shortcutsModal.style.display = 'none'; }

shortcutsBtn.addEventListener('click', openShortcuts);
shortcutsClose.addEventListener('click', closeShortcuts);
shortcutsModal.addEventListener('click', (e) => {
  if (e.target === shortcutsModal) closeShortcuts();
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!isGenerating) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }
  if (e.key === 'Escape') {
    if (poemCard.classList.contains('fullscreen')) exitFullscreen();
    else if (shortcutsModal.style.display !== 'none') closeShortcuts();
    else if (diffModal.style.display !== 'none') closeDiff();
    else if (cloudModal.style.display !== 'none') closeCloudModal();
  }
  if (e.key === '?' && !inField) {
    shortcutsModal.style.display === 'none' ? openShortcuts() : closeShortcuts();
  }
});

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const div = document.createElement('div');
  div.className   = 'toast';
  div.textContent = msg;
  document.body.appendChild(div);
  requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('visible')));
  setTimeout(() => {
    div.classList.remove('visible');
    setTimeout(() => div.remove(), 300);
  }, 2200);
}

// ── Auto-save ─────────────────────────────────────────────────────────────
function autosave() {
  if (!currentPoem) return;
  localStorage.setItem('volta-autosave', JSON.stringify({
    poem: currentPoem, title: currentTitle, theme: currentTheme, ts: Date.now(),
  }));
}

// ── Save to server ────────────────────────────────────────────────────────
async function saveToServer(poem, title, theme, mood) {
  try {
    await fetch('/poems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poem, title, theme, mood }),
    });
  } catch { /* silent — server history is best-effort */ }
}

// ── Response section ──────────────────────────────────────────────────────
function dismissResponse() {
  respondPoem = '';
  responseSection.style.display = 'none';
  responseText.innerHTML = '';
}

responseAdopt.addEventListener('click', () => {
  if (!respondPoem) return;
  currentPoem = respondPoem;
  dismissResponse();
  undoPoem = ''; undoTitle = '';
  undoBtn.style.display  = 'none';
  diffBtn.style.display  = 'none';
  showPoem(currentPoem);
  fetchTitle(currentPoem);
});

responseDismiss.addEventListener('click', dismissResponse);

// ── Display helpers ────────────────────────────────────────────────────────
function showEmpty() {
  poemCard.className = 'poem-card state-empty';
  emptyState.style.display    = '';
  loadingState.style.display  = 'none';
  poemTitleWrap.style.display = 'none';
  poemText.style.display      = 'none';
  poemMeta.style.display      = 'none';
  poemActions.style.display   = 'none';
  revisionBar.style.display   = 'none';
  currentTitle = '';
}

function showLoading() {
  poemCard.className = 'poem-card state-active';
  emptyState.style.display    = 'none';
  loadingState.style.display  = '';
  poemTitleWrap.style.display = 'none';
  poemText.style.display      = 'none';
  poemMeta.style.display      = 'none';
  poemActions.style.display   = 'none';
  revisionBar.style.display   = 'none';
}

function showPoem(text) {
  poemCard.className = 'poem-card state-active';
  emptyState.style.display   = 'none';
  loadingState.style.display = 'none';
  poemText.style.display     = '';
  poemText.innerHTML         = renderStanzas(text);
  poemText.classList.remove('streaming');
  applyFontSize();
  poemActions.style.display  = '';
  revisionBar.style.display  = '';
  renderStats(text);
  updateStarState();
  autosave();
}

function startStreaming() {
  poemCard.className = 'poem-card state-active';
  emptyState.style.display    = 'none';
  loadingState.style.display  = 'none';
  poemTitleWrap.style.display = 'none';
  poemText.style.display      = '';
  poemText.innerHTML          = '';
  poemText.classList.add('streaming');
  poemMeta.style.display      = 'none';
  poemActions.style.display   = 'none';
  revisionBar.style.display   = 'none';
}

function renderStanzas(text) {
  return text.split(/\n{2,}/)
    .map(s => `<p>${escHtml(s).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// ── Poem stats ─────────────────────────────────────────────────────────────
function renderStats(text) {
  if (!text) { poemMeta.style.display = 'none'; return; }
  const lines   = text.split('\n').filter(l => l.trim()).length;
  const words   = text.split(/\s+/).filter(Boolean).length;
  const stanzas = text.split(/\n{2,}/).filter(s => s.trim()).length;
  poemStats.textContent = `${words} words · ${lines} lines · ${stanzas} stanza${stanzas !== 1 ? 's' : ''}`;
  poemMeta.style.display = '';
}

// ── Title helpers ──────────────────────────────────────────────────────────
function cleanTitle(t) {
  return t.replace(/^["'"""'']+|["'"""'']+$/g, '').replace(/[.!?,;]+$/, '').trim();
}

function showTitleLoading() {
  poemTitleEl.textContent        = '';
  poemTitleEl.classList.remove('visible');
  poemTitleLoading.style.display = 'flex';
  poemTitleWrap.style.display    = '';
}

function showTitle(title) {
  poemTitleLoading.style.display = 'none';
  poemTitleEl.textContent        = title;
  requestAnimationFrame(() => poemTitleEl.classList.add('visible'));
}

async function fetchTitle(poem) {
  if (isFetchingTitle) return;
  isFetchingTitle = true;
  showTitleLoading();
  try {
    const res  = await fetch('/title', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poem }),
    });
    const data = await res.json();
    if (data.title) { currentTitle = cleanTitle(data.title); showTitle(currentTitle); }
    else poemTitleWrap.style.display = 'none';
  } catch {
    poemTitleWrap.style.display = 'none';
  } finally {
    isFetchingTitle = false;
  }
}

// ── SSE stream consumer ────────────────────────────────────────────────────
async function consumeStream(url, payload, onChunk, onDone, onError) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += done
      ? decoder.decode(new Uint8Array(), { stream: false })
      : decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = done ? '' : (lines.pop() ?? '');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') { onDone(); return; }
      let parsed;
      try { parsed = JSON.parse(raw); } catch { continue; }
      if (parsed.error) { onError(parsed.error); return; }
      if (parsed.text)  onChunk(parsed.text);
    }
    if (done) break;
  }
  onDone();
}

// ── Speech helpers ─────────────────────────────────────────────────────────
const READ_IDLE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M19.07,4.93a10,10,0,0,1,0,14.14"/><path d="M15.54,8.46a5,5,0,0,1,0,7.07"/></svg> Read`;
const READ_STOP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> Stop`;

function stopSpeech() {
  if (!isSpeaking) return;
  window.speechSynthesis.cancel();
  isSpeaking = false;
  readBtn.innerHTML = READ_IDLE;
  readBtn.classList.remove('speaking');
}

// ── Poem generation ────────────────────────────────────────────────────────
async function runGeneration(payload) {
  if (isGenerating) return;
  stopSpeech();
  dismissResponse();
  isGenerating = true;
  generateBtn.disabled = true;
  currentPoem  = '';
  undoPoem     = '';
  undoTitle    = '';
  undoBtn.style.display  = 'none';
  diffBtn.style.display  = 'none';

  showLoading();
  let firstChunk = true;

  try {
    await consumeStream(
      '/generate', payload,
      (text) => {
        if (firstChunk) { startStreaming(); firstChunk = false; }
        currentPoem += text.replace(/\*/g, '');
        poemText.innerHTML = renderStanzas(currentPoem);
      },
      () => {
        showPoem(currentPoem);
        addToHistory(currentPoem, payload.theme, payload.mood, payload.poetic_form);
        fetchTitle(currentPoem);
        saveToServer(currentPoem, '', payload.theme, payload.mood);
      },
      (err) => { showEmpty(); showError(err); },
    );
  } catch (err) {
    showEmpty(); showError(err.message);
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const theme = document.getElementById('theme').value.trim();
  if (!theme) return;
  currentTheme = theme;
  currentMood  = document.getElementById('mood').value;
  runGeneration({
    theme,
    mood:              currentMood,
    length:            parseInt(lengthInput.value, 10),
    poetic_form:       document.getElementById('poetic_form').value,
    keywords:          document.getElementById('keywords').value.trim(),
    rhyme_scheme:      document.getElementById('rhyme_scheme').value,
    style_inspiration: styleInput.value.trim(),
    language:          document.getElementById('language').value,
  });
});

// ── Regenerate ─────────────────────────────────────────────────────────────
regenerateBtn.addEventListener('click', () => {
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
});

// ── Continue poem ──────────────────────────────────────────────────────────
continueBtn.addEventListener('click', async () => {
  if (isGenerating || !currentPoem) return;
  stopSpeech();
  isGenerating = true;
  continueBtn.disabled = true;
  generateBtn.disabled = true;

  const prevPoem  = currentPoem;
  const prevTitle = currentTitle;
  let continuation = '';
  let firstChunk = true;

  poemTitleWrap.style.display = 'none';
  poemTitleEl.classList.remove('visible');

  try {
    await consumeStream(
      '/continue', { poem: prevPoem },
      (text) => {
        if (firstChunk) { poemText.classList.add('streaming'); firstChunk = false; }
        continuation += text.replace(/\*/g, '');
        poemText.innerHTML = renderStanzas(prevPoem + '\n\n' + continuation);
      },
      () => {
        undoPoem = prevPoem; undoTitle = prevTitle;
        undoBtn.style.display = '';
        diffBtn.style.display = '';
        currentPoem = prevPoem + '\n\n' + continuation;
        showPoem(currentPoem);
        fetchTitle(currentPoem);
      },
      (err) => { currentPoem = prevPoem; showPoem(prevPoem); showError(err); },
    );
  } catch (err) {
    currentPoem = prevPoem; showPoem(prevPoem); showError(err.message);
  } finally {
    isGenerating = false;
    continueBtn.disabled = false;
    generateBtn.disabled = false;
  }
});

// ── Respond to poem ────────────────────────────────────────────────────────
respondBtn.addEventListener('click', async () => {
  if (isGenerating || !currentPoem) return;
  stopSpeech();
  isGenerating = true;
  respondBtn.disabled  = true;
  generateBtn.disabled = true;
  respondPoem = '';
  responseText.innerHTML = '';
  responseSection.style.display = '';
  responseAdopt.disabled = true;

  try {
    await consumeStream(
      '/respond', { poem: currentPoem },
      (text) => {
        respondPoem += text.replace(/\*/g, '');
        responseText.innerHTML = renderStanzas(respondPoem);
      },
      () => {
        responseAdopt.disabled = false;
      },
      (err) => { responseSection.style.display = 'none'; showError(err); },
    );
  } catch (err) {
    responseSection.style.display = 'none';
    showError(err.message);
  } finally {
    isGenerating = false;
    respondBtn.disabled  = false;
    generateBtn.disabled = false;
  }
});

// ── Revision ──────────────────────────────────────────────────────────────
async function runRevision(instruction) {
  if (isGenerating || !currentPoem) return;
  stopSpeech();
  isGenerating = true;
  revisionBtns.forEach(b => b.disabled = true);
  revisionCustomBtn.disabled = true;
  generateBtn.disabled = true;

  const prevPoem  = currentPoem;
  const prevTitle = currentTitle;
  currentPoem = '';
  let firstChunk = true;

  poemTitleWrap.style.display = 'none';
  poemTitleEl.classList.remove('visible');

  try {
    await consumeStream(
      '/revise', { poem: prevPoem, instruction },
      (text) => {
        if (firstChunk) { startStreaming(); firstChunk = false; }
        currentPoem += text.replace(/\*/g, '');
        poemText.innerHTML = renderStanzas(currentPoem);
      },
      () => {
        undoPoem = prevPoem; undoTitle = prevTitle;
        undoBtn.style.display = '';
        diffBtn.style.display = '';
        showPoem(currentPoem);
        fetchTitle(currentPoem);
      },
      (err) => { currentPoem = prevPoem; showPoem(prevPoem); showError(err); },
    );
  } catch (err) {
    currentPoem = prevPoem; showPoem(prevPoem); showError(err.message);
  } finally {
    isGenerating = false;
    revisionBtns.forEach(b => b.disabled = false);
    revisionCustomBtn.disabled = false;
    generateBtn.disabled = false;
  }
}

revisionBtns.forEach((btn) => {
  btn.addEventListener('click', () => runRevision(btn.dataset.instruction));
});

function submitCustomRevision() {
  const instruction = revisionCustomInput.value.trim();
  if (!instruction) return;
  revisionCustomInput.value = '';
  runRevision(instruction);
}
revisionCustomBtn.addEventListener('click', submitCustomRevision);
revisionCustomInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitCustomRevision();
});

// ── Undo ───────────────────────────────────────────────────────────────────
undoBtn.addEventListener('click', () => {
  if (!undoPoem) return;
  currentPoem  = undoPoem;
  currentTitle = undoTitle;
  undoPoem     = '';
  undoTitle    = '';
  undoBtn.style.display = 'none';
  diffBtn.style.display = 'none';
  showPoem(currentPoem);
  if (currentTitle) showTitle(currentTitle);
  else poemTitleWrap.style.display = 'none';
});

// ── Compare (diff) ─────────────────────────────────────────────────────────
function diffLines(oldText, newText) {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const m = a.length, n = b.length;

  // LCS DP table
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);

  // Backtrack
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
      result.unshift({ type: 'same', text: a[i-1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'add', text: b[j-1] });
      j--;
    } else {
      result.unshift({ type: 'remove', text: a[i-1] });
      i--;
    }
  }
  return result;
}

function openDiff() {
  if (!undoPoem || !currentPoem) return;
  const lines = diffLines(undoPoem, currentPoem);
  const hasChanges = lines.some(l => l.type !== 'same');

  if (!hasChanges) {
    diffContent.innerHTML = `<div class="diff-empty">No changes detected.</div>`;
  } else {
    diffContent.innerHTML = lines.map(({ type, text }) => {
      const marker = type === 'add' ? '+' : type === 'remove' ? '−' : '·';
      const display = text.trim() === '' ? '&nbsp;' : escHtml(text);
      return `<div class="diff-line ${type}"><span class="diff-line-marker">${marker}</span><span>${display}</span></div>`;
    }).join('');
  }

  diffModal.style.display = '';
}

function closeDiff() { diffModal.style.display = 'none'; }

diffBtn.addEventListener('click', openDiff);
diffClose.addEventListener('click', closeDiff);
diffModal.addEventListener('click', (e) => { if (e.target === diffModal) closeDiff(); });

// ── Cloud history ──────────────────────────────────────────────────────────
async function openCloudHistory() {
  cloudList.innerHTML = `<div class="cloud-empty">Loading…</div>`;
  cloudModal.style.display = '';

  try {
    const res  = await fetch('/poems?limit=50');
    const data = await res.json();
    renderCloudItems(data.poems || []);
  } catch {
    cloudList.innerHTML = `<div class="cloud-empty">Could not load saved poems.</div>`;
  }
}

function renderCloudItems(poems) {
  if (poems.length === 0) {
    cloudList.innerHTML = `<div class="cloud-empty">No saved poems yet. Generate one to start.</div>`;
    return;
  }
  cloudList.innerHTML = '';
  poems.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'cloud-item';
    const label   = item.title || item.theme || 'Untitled';
    const excerpt = (item.poem || '').split('\n').find(l => l.trim()) || '';
    const date    = item.created_at ? new Date(item.created_at + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
    el.innerHTML = `
      <div class="cloud-item-title">${escHtml(label)}</div>
      <div class="cloud-item-excerpt">${escHtml(excerpt.slice(0, 60))}${excerpt.length > 60 ? '…' : ''}</div>
      <div class="cloud-item-meta">${item.mood ? escHtml(item.mood) + ' · ' : ''}${date}</div>
    `;
    el.addEventListener('click', () => {
      currentPoem  = item.poem;
      currentTitle = item.title || '';
      currentTheme = item.theme || '';
      showPoem(currentPoem);
      if (currentTitle) showTitle(currentTitle);
      closeCloudModal();
    });
    cloudList.appendChild(el);
  });
}

function closeCloudModal() { cloudModal.style.display = 'none'; }

cloudHistoryBtn.addEventListener('click', openCloudHistory);
cloudClose.addEventListener('click', closeCloudModal);
cloudModal.addEventListener('click', (e) => { if (e.target === cloudModal) closeCloudModal(); });

// ── Copy ───────────────────────────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  if (!currentPoem) return;
  await navigator.clipboard.writeText(currentPoem);
  copyBtn.classList.add('copied');
  copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> Copied`;
  setTimeout(() => {
    copyBtn.classList.remove('copied');
    copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
  }, 2000);
});

// ── Download ───────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!currentPoem) return;
  const base    = currentTitle || currentTheme;
  const slug    = base.replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 40).toLowerCase();
  const content = currentTitle ? `${currentTitle}\n\n${currentPoem}` : currentPoem;
  const blob    = new Blob([content], { type: 'text/plain' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href = url; a.download = `volta-${slug}.txt`; a.click();
  URL.revokeObjectURL(url);
});

// ── Share via URL ──────────────────────────────────────────────────────────
shareBtn.addEventListener('click', async () => {
  if (!currentPoem) return;
  try {
    const encoded = btoa(unescape(encodeURIComponent(currentPoem)));
    const url     = `${location.origin}${location.pathname}#${encoded}`;
    await navigator.clipboard.writeText(url);
    shareBtn.classList.add('copied');
    shareBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> Copied!`;
    setTimeout(() => {
      shareBtn.classList.remove('copied');
      shareBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share`;
    }, 2000);
  } catch { showError('Could not copy share link.'); }
});

// ── Print ──────────────────────────────────────────────────────────────────
printBtn.addEventListener('click', () => window.print());

// ── Fullscreen ────────────────────────────────────────────────────────────
fullscreenBtn.addEventListener('click', () => {
  poemCard.classList.add('fullscreen');
  fullscreenHint.style.display = '';
  setTimeout(() => { fullscreenHint.style.display = 'none'; }, 2500);
});

function exitFullscreen() {
  poemCard.classList.remove('fullscreen');
  fullscreenHint.style.display = 'none';
}
poemCard.addEventListener('dblclick', () => {
  if (poemCard.classList.contains('fullscreen')) exitFullscreen();
});

// ── Read aloud ─────────────────────────────────────────────────────────────
readBtn.innerHTML = READ_IDLE;
readBtn.addEventListener('click', () => {
  if (!currentPoem || !window.speechSynthesis) return;
  if (isSpeaking) { stopSpeech(); return; }

  const utterance  = new SpeechSynthesisUtterance(currentPoem);
  utterance.rate   = 0.85;
  utterance.pitch  = 1.0;
  utterance.onend  = () => { isSpeaking = false; readBtn.innerHTML = READ_IDLE; readBtn.classList.remove('speaking'); };
  utterance.onerror = () => { isSpeaking = false; readBtn.innerHTML = READ_IDLE; readBtn.classList.remove('speaking'); };
  window.speechSynthesis.speak(utterance);
  isSpeaking = true;
  readBtn.innerHTML = READ_STOP;
  readBtn.classList.add('speaking');
});

// ── Favorites ─────────────────────────────────────────────────────────────
function saveFavorites() {
  localStorage.setItem('volta-favorites', JSON.stringify(favorites));
}

const STAR_EMPTY  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg> Save`;
const STAR_FILLED = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg> Saved`;
starBtn.innerHTML = STAR_EMPTY;

starBtn.addEventListener('click', () => {
  if (!currentPoem) return;
  const idx = favorites.findIndex(f => f.poem === currentPoem);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    starBtn.innerHTML = STAR_EMPTY;
    starBtn.classList.remove('starred');
    showToast('Removed from favorites');
  } else {
    favorites.unshift({ poem: currentPoem, title: currentTitle, theme: currentTheme, ts: Date.now() });
    if (favorites.length > 20) favorites.pop();
    starBtn.innerHTML = STAR_FILLED;
    starBtn.classList.add('starred');
    showToast('Saved to favorites');
  }
  saveFavorites();
  renderFavorites();
});

function updateStarState() {
  const saved = currentPoem && favorites.some(f => f.poem === currentPoem);
  starBtn.innerHTML = saved ? STAR_FILLED : STAR_EMPTY;
  starBtn.classList.toggle('starred', !!saved);
}

function renderFavorites() {
  if (favorites.length === 0) { favoritesSection.style.display = 'none'; return; }
  favoritesSection.style.display = '';
  favoritesList.innerHTML = '';
  favorites.forEach((item) => {
    const card    = document.createElement('div');
    card.className = 'history-card';
    const label   = item.title || item.theme;
    const excerpt = item.poem.split('\n').find(l => l.trim()) || '';
    card.innerHTML = `
      <div class="favorites-card-title">${escHtml(label)}</div>
      <div class="history-card-excerpt">${escHtml(excerpt.slice(0, 52))}${excerpt.length > 52 ? '…' : ''}</div>
    `;
    card.addEventListener('click', () => {
      currentPoem  = item.poem;
      currentTheme = item.theme;
      currentTitle = item.title || '';
      showPoem(item.poem);
      if (item.title) showTitle(item.title);
    });
    favoritesList.appendChild(card);
  });
}

clearFavoritesBtn.addEventListener('click', () => {
  favorites.length = 0;
  saveFavorites();
  renderFavorites();
});

// ── Mobile drawer ─────────────────────────────────────────────────────────
function openSidebar()  {
  sidebar.classList.add('open');
  mobileOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('open');
  mobileOverlay.classList.remove('visible');
  document.body.style.overflow = '';
}
mobileMenuBtn.addEventListener('click', openSidebar);
mobileOverlay.addEventListener('click', closeSidebar);
form.addEventListener('submit', closeSidebar);

// ── History ───────────────────────────────────────────────────────────────
function addToHistory(poem, theme, mood, poeticForm) {
  const excerpt = poem.split('\n').find(l => l.trim()) || '';
  history.unshift({ poem, theme, mood, form: poeticForm, excerpt, ts: Date.now() });
  if (history.length > 8) history.pop();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) { historySection.style.display = 'none'; return; }
  historySection.style.display = '';
  historyList.innerHTML = '';
  history.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-theme">${escHtml(item.theme)}</div>
      <div class="history-card-excerpt">${escHtml(item.excerpt.slice(0, 52))}${item.excerpt.length > 52 ? '…' : ''}</div>
      <div class="history-card-meta">${escHtml(item.mood)} · ${escHtml(item.form)}</div>
    `;
    card.addEventListener('click', () => {
      currentPoem  = item.poem;
      currentTheme = item.theme;
      showPoem(item.poem);
    });
    historyList.appendChild(card);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  history.length = 0;
  renderHistory();
});

// ── Analyze ───────────────────────────────────────────────────────────────
analyzeToggle.addEventListener('click', () => {
  const open = analyzePanel.style.display === 'none';
  analyzePanel.style.display = open ? '' : 'none';
  analyzeToggle.classList.toggle('open', open);
});

fileUpload.addEventListener('change', () => {
  const file = fileUpload.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { analyzeInput.value = e.target.result; };
  reader.readAsText(file);
  fileUpload.value = '';
});

analyzeBtn.addEventListener('click', async () => {
  const poem = analyzeInput.value.trim();
  if (!poem) return;

  analyzeBtn.disabled = true;
  analyzeResult.style.display = 'none';
  analyzeError.style.display  = 'none';
  analyzeBtn.textContent = 'Analyzing…';

  try {
    const res  = await fetch('/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poem }),
    });
    const data = await res.json();
    if (data.error) {
      analyzeError.textContent = data.error; analyzeError.style.display = '';
    } else {
      analyzeRows.innerHTML = renderAnalysis(data.analysis);
      analyzeResult.style.display = '';
    }
  } catch (err) {
    analyzeError.textContent = err.message; analyzeError.style.display = '';
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Analyze`;
  }
});

function renderAnalysis(text) {
  return text.split('\n').filter(l => l.trim()).map(line => {
    const clean = line.replace(/^[-•]\s*/, '').replace(/\*+/g, '').trim();
    const colon = clean.indexOf(':');
    if (colon > 0 && colon < 30) {
      const key = clean.slice(0, colon).trim();
      const val = clean.slice(colon + 1).trim();
      if (!val) return '';
      return `<div class="analysis-row"><span class="analysis-key">${escHtml(key)}</span><span class="analysis-val">${escHtml(val)}</span></div>`;
    }
    return clean ? `<div class="analysis-plain">${escHtml(clean)}</div>` : '';
  }).join('');
}

// ── Error ─────────────────────────────────────────────────────────────────
const poemSection = document.querySelector('.poem-section');

function showError(msg) {
  const div = document.createElement('div');
  div.className = 'error-msg'; div.textContent = msg;
  poemSection.prepend(div);
  setTimeout(() => div.remove(), 6000);
}

// ── Utils ─────────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── PWA service worker ────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/static/sw.js', { scope: '/' }).catch(() => {});
}

// ── Init ───────────────────────────────────────────────────────────────────
renderFavorites();

// Load poem from URL hash (shared link)
if (location.hash.length > 1) {
  try {
    const poem = decodeURIComponent(escape(atob(location.hash.slice(1))));
    if (poem.trim()) {
      currentPoem = poem.trim();
      showPoem(currentPoem);
      fetchTitle(currentPoem);
    }
  } catch { /* invalid hash */ }
}
// Restore last poem from auto-save (only if no hash)
else {
  const saved = JSON.parse(localStorage.getItem('volta-autosave') || 'null');
  if (saved && saved.poem) {
    currentPoem  = saved.poem;
    currentTitle = saved.title || '';
    currentTheme = saved.theme || '';
    showPoem(currentPoem);
    if (currentTitle) showTitle(currentTitle);
    showToast('Restored your last poem');
  }
}
