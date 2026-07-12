(() => {
  'use strict';

  const MAX_SIDE_LENGTH = 300;

  const SAMPLE_DECK = [
    'What is the capital of France? | Paris',
    'H2O | Water',
    'Largest planet in our solar system | Jupiter',
    'Author of "Hamlet" | William Shakespeare',
    'Speed of light (m/s, approx) | 299,792,458',
    'Square root of 144 | 12',
    'Year humans first landed on the Moon | 1969',
    'Currency of Japan | Yen',
    'Chemical symbol for gold | Au',
    'Smallest prime number | 2',
  ];

  const els = {
    setup: document.getElementById('setup'),
    study: document.getElementById('study'),
    done: document.getElementById('done'),
    fileInput: document.getElementById('fileInput'),
    loadSampleBtn: document.getElementById('loadSampleBtn'),
    pasteArea: document.getElementById('pasteArea'),
    loadPasteBtn: document.getElementById('loadPasteBtn'),
    frontSide: document.getElementById('frontSide'),
    loadStatus: document.getElementById('loadStatus'),
    card: document.getElementById('card'),
    frontText: document.getElementById('frontText'),
    backText: document.getElementById('backText'),
    cardHint: document.getElementById('cardHint'),
    correctBtn: document.getElementById('correctBtn'),
    wrongBtn: document.getElementById('wrongBtn'),
    restartBtn: document.getElementById('restartBtn'),
    newDeckBtn: document.getElementById('newDeckBtn'),
    remainingCount: document.getElementById('remainingCount'),
    correctCount: document.getElementById('correctCount'),
    missedCount: document.getElementById('missedCount'),
    doneTotal: document.getElementById('doneTotal'),
    doneMissed: document.getElementById('doneMissed'),
    doneRestartBtn: document.getElementById('doneRestartBtn'),
    doneNewDeckBtn: document.getElementById('doneNewDeckBtn'),
    themePicker: document.getElementById('themePicker'),
  };

  const THEME_KEY = 'flashcards.theme';

  function applyTheme(choice) {
    if (choice === 'light' || choice === 'dark') {
      document.documentElement.setAttribute('data-theme', choice);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function initTheme() {
    let saved = 'system';
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') saved = v;
    } catch (_) {}
    els.themePicker.value = saved;
    applyTheme(saved);
    els.themePicker.addEventListener('change', () => {
      const v = els.themePicker.value;
      applyTheme(v);
      try { localStorage.setItem(THEME_KEY, v); } catch (_) {}
    });
  }

  initTheme();

  const STORAGE_KEY = 'flashcards.session.v2';

  const state = {
    allCards: [],
    deck: [],
    current: null,
    flipped: false,
    revealed: false,
    correct: 0,
    missed: 0,
    frontMode: 'front',
  };

  function saveState() {
    if (!state.allCards.length) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        allCards: state.allCards,
        deck: state.deck,
        correct: state.correct,
        missed: state.missed,
        frontMode: state.frontMode,
      }));
    } catch (_) { /* storage may be unavailable */ }
  }

  function clearSavedState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function loadSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.allCards) || !data.allCards.length) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function splitCsvRow(line) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = false;
        } else cur += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { fields.push(cur); cur = ''; }
        else cur += c;
      }
    }
    fields.push(cur);
    return fields;
  }

  function splitLine(line) {
    if (line.includes('\t')) {
      const idx = line.indexOf('\t');
      return [line.slice(0, idx), line.slice(idx + 1)];
    }
    if (line.includes('|')) {
      const idx = line.indexOf('|');
      return [line.slice(0, idx), line.slice(idx + 1)];
    }
    if (line.includes(',')) {
      const fields = splitCsvRow(line);
      if (fields.length < 2) return null;
      return [fields[0], fields.slice(1).join(',')];
    }
    return null;
  }

  function parseDeck(text) {
    const cards = [];
    const skipped = { tooLong: 0, malformed: 0 };
    const lines = text.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = splitLine(line);
      if (!parts) { skipped.malformed++; continue; }
      const front = parts[0].trim();
      const back = parts[1].trim();
      if (!front || !back) { skipped.malformed++; continue; }
      if (front.length > MAX_SIDE_LENGTH || back.length > MAX_SIDE_LENGTH) {
        skipped.tooLong++; continue;
      }
      cards.push({ front, back });
    }
    return { cards, skipped };
  }

  function setStatus(msg, kind = '') {
    els.loadStatus.textContent = msg;
    els.loadStatus.className = 'status' + (kind ? ' ' + kind : '');
  }

  function startSession(cards) {
    if (!cards.length) {
      setStatus(`No valid cards found. Each line should be: front | back (max ${MAX_SIDE_LENGTH} chars per side).`, 'error');
      return;
    }
    state.allCards = cards.slice();
    state.frontMode = els.frontSide.value;
    resetSession();
    els.setup.classList.add('hidden');
    els.done.classList.add('hidden');
    els.study.classList.remove('hidden');
  }

  function resumeSession(saved) {
    state.allCards = saved.allCards.slice();
    state.deck = shuffle(saved.deck.slice());
    state.correct = saved.correct || 0;
    state.missed = saved.missed || 0;
    state.frontMode = saved.frontMode || 'front';
    if (els.frontSide.querySelector(`option[value="${state.frontMode}"]`)) {
      els.frontSide.value = state.frontMode;
    }
    state.current = null;
    els.setup.classList.add('hidden');
    if (state.deck.length === 0) {
      finishSession();
    } else {
      els.done.classList.add('hidden');
      els.study.classList.remove('hidden');
      nextCard();
    }
  }

  function resetSession() {
    state.deck = shuffle(state.allCards.slice());
    state.correct = 0;
    state.missed = 0;
    state.current = null;
    saveState();
    nextCard();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Move the current card to a random spot in the back half of the queue,
  // so a missed card returns later in the session but never immediately.
  function requeueCurrent() {
    const idx = state.deck.indexOf(state.current);
    if (idx !== -1) state.deck.splice(idx, 1);
    const len = state.deck.length;
    const minPos = Math.ceil(len / 2);
    const pos = minPos + Math.floor(Math.random() * (len - minPos + 1));
    state.deck.splice(pos, 0, state.current);
  }

  function nextCard() {
    if (state.deck.length === 0) {
      finishSession();
      return;
    }
    state.current = state.deck[0];
    state.flipped = false;
    state.revealed = false;
    renderCard();
  }

  function currentSides() {
    const card = state.current;
    let showFrontFirst;
    if (state.frontMode === 'front') showFrontFirst = true;
    else if (state.frontMode === 'back') showFrontFirst = false;
    else showFrontFirst = Math.random() < 0.5;
    return showFrontFirst
      ? { front: card.front, back: card.back }
      : { front: card.back, back: card.front };
  }

  function renderCard() {
    if (!state.current) return;
    const sides = currentSides();
    state.current._sides = sides;
    const cardInner = els.card.querySelector('.card-inner');
    const wasFlipped = els.card.classList.contains('flipped');
    if (wasFlipped && cardInner) {
      cardInner.style.transition = 'none';
      els.card.classList.remove('flipped');
      void cardInner.offsetWidth;
      cardInner.style.transition = '';
    } else {
      els.card.classList.remove('flipped');
    }
    els.frontText.textContent = sides.front;
    els.backText.textContent = sides.back;
    els.frontText.parentElement.classList.toggle('long', sides.front.length > 80);
    els.backText.parentElement.classList.toggle('long', sides.back.length > 80);
    els.cardHint.textContent = 'Click card to flip';
    els.correctBtn.disabled = true;
    els.wrongBtn.disabled = true;
    updateStats();
  }

  function updateStats() {
    els.remainingCount.textContent = state.deck.length;
    els.correctCount.textContent = state.correct;
    els.missedCount.textContent = state.missed;
  }

  function flipCard() {
    if (!state.current) return;
    state.flipped = !state.flipped;
    if (state.flipped) state.revealed = true;
    els.card.classList.toggle('flipped', state.flipped);
    if (state.revealed) {
      els.cardHint.textContent = state.flipped
        ? 'Did you get it right? (Click to flip back)'
        : 'Click to flip again';
      els.correctBtn.disabled = false;
      els.wrongBtn.disabled = false;
    } else {
      els.cardHint.textContent = 'Click card to flip';
    }
  }

  function markCorrect() {
    if (!state.current || !state.revealed) return;
    const idx = state.deck.indexOf(state.current);
    if (idx !== -1) state.deck.splice(idx, 1);
    state.correct++;
    saveState();
    nextCard();
  }

  function markWrong() {
    if (!state.current || !state.revealed) return;
    requeueCurrent();
    state.missed++;
    saveState();
    nextCard();
  }

  function finishSession() {
    state.current = null;
    els.study.classList.add('hidden');
    els.done.classList.remove('hidden');
    els.doneTotal.textContent = state.allCards.length;
    els.doneMissed.textContent = state.missed;
    saveState();
  }

  function backToSetup() {
    els.study.classList.add('hidden');
    els.done.classList.add('hidden');
    els.setup.classList.remove('hidden');
    setStatus('');
    clearSavedState();
    state.allCards = [];
    state.deck = [];
    state.current = null;
  }

  function describeSkipped(skipped) {
    const parts = [];
    if (skipped.tooLong) parts.push(`${skipped.tooLong} skipped (over ${MAX_SIDE_LENGTH} chars)`);
    if (skipped.malformed) parts.push(`${skipped.malformed} skipped (malformed)`);
    return parts.length ? ' — ' + parts.join(', ') : '';
  }

  els.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { cards, skipped } = parseDeck(text);
      setStatus(`Loaded ${cards.length} card${cards.length === 1 ? '' : 's'} from ${file.name}${describeSkipped(skipped)}.`, cards.length ? 'success' : 'error');
      if (cards.length) startSession(cards);
    } catch (err) {
      setStatus('Could not read file: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  });

  els.loadSampleBtn.addEventListener('click', () => {
    const { cards } = parseDeck(SAMPLE_DECK.join('\n'));
    setStatus(`Loaded sample deck with ${cards.length} cards.`, 'success');
    startSession(cards);
  });

  els.loadPasteBtn.addEventListener('click', () => {
    const { cards, skipped } = parseDeck(els.pasteArea.value);
    if (!cards.length) {
      setStatus('No valid cards found in pasted text.', 'error');
      return;
    }
    setStatus(`Loaded ${cards.length} cards${describeSkipped(skipped)}.`, 'success');
    startSession(cards);
  });

  els.card.addEventListener('click', flipCard);
  els.card.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flipCard();
    }
  });

  els.correctBtn.addEventListener('click', markCorrect);
  els.wrongBtn.addEventListener('click', markWrong);
  els.restartBtn.addEventListener('click', () => {
    if (state.allCards.length) resetSession();
  });
  els.newDeckBtn.addEventListener('click', backToSetup);
  els.doneRestartBtn.addEventListener('click', () => {
    if (state.allCards.length) {
      els.done.classList.add('hidden');
      els.study.classList.remove('hidden');
      resetSession();
    }
  });
  els.doneNewDeckBtn.addEventListener('click', backToSetup);

  const saved = loadSavedState();
  if (saved) {
    resumeSession(saved);
    setStatus(`Resumed previous session (${saved.deck.length} cards remaining).`, 'success');
  }

  document.addEventListener('keydown', (e) => {
    if (els.study.classList.contains('hidden')) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flipCard();
    } else if (state.revealed) {
      if (e.key === '1' || e.key.toLowerCase() === 'y') markCorrect();
      else if (e.key === '2' || e.key.toLowerCase() === 'n') markWrong();
    }
  });
})();
