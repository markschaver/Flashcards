(() => {
  'use strict';

  const SAMPLE_DECK = [
    'endulzar | to sweeten',
    'hablar | to speak',
    'comer | to eat',
    'beber | to drink',
    'leer | to read',
    'escribir | to write',
    'dormir | to sleep',
    'caminar | to walk',
    'correr | to run',
    'aprender | to learn',
    'ensenar | to teach',
    'casa | house',
    'perro | dog',
    'gato | cat',
    'libro | book',
    'agua | water',
    'manzana | apple',
    'feliz | happy',
    'triste | sad',
    'rojo | red',
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
  };

  const state = {
    allCards: [],
    deck: [],
    current: null,
    flipped: false,
    revealed: false,
    correct: 0,
    missed: 0,
    frontMode: 'spanish',
  };

  function parseDeck(text) {
    const cards = [];
    const lines = text.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('|');
      if (idx === -1) continue;
      const spanish = line.slice(0, idx).trim();
      const english = line.slice(idx + 1).trim();
      if (spanish && english) cards.push({ spanish, english });
    }
    return cards;
  }

  function setStatus(msg, kind = '') {
    els.loadStatus.textContent = msg;
    els.loadStatus.className = 'status' + (kind ? ' ' + kind : '');
  }

  function startSession(cards) {
    if (!cards.length) {
      setStatus('No valid cards found. Each line should be: spanish | english', 'error');
      return;
    }
    state.allCards = cards.slice();
    state.frontMode = els.frontSide.value;
    resetSession();
    els.setup.classList.add('hidden');
    els.done.classList.add('hidden');
    els.study.classList.remove('hidden');
  }

  function resetSession() {
    state.deck = state.allCards.slice();
    state.correct = 0;
    state.missed = 0;
    state.current = null;
    nextCard();
  }

  function pickRandomIndex(len, avoid) {
    if (len <= 1) return 0;
    let idx = Math.floor(Math.random() * len);
    if (idx === avoid) idx = (idx + 1) % len;
    return idx;
  }

  function nextCard() {
    if (state.deck.length === 0) {
      finishSession();
      return;
    }
    const prevIdx = state.current ? state.deck.indexOf(state.current) : -1;
    const idx = pickRandomIndex(state.deck.length, prevIdx);
    state.current = state.deck[idx];
    state.flipped = false;
    state.revealed = false;
    renderCard();
  }

  function currentSides() {
    const card = state.current;
    let showSpanishFirst;
    if (state.frontMode === 'spanish') showSpanishFirst = true;
    else if (state.frontMode === 'english') showSpanishFirst = false;
    else showSpanishFirst = Math.random() < 0.5;
    return showSpanishFirst
      ? { front: card.spanish, back: card.english }
      : { front: card.english, back: card.spanish };
  }

  function renderCard() {
    if (!state.current) return;
    const sides = currentSides();
    state.current._sides = sides;
    els.frontText.textContent = sides.front;
    els.backText.textContent = sides.back;
    els.card.classList.remove('flipped');
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
    nextCard();
  }

  function markWrong() {
    if (!state.current || !state.revealed) return;
    state.missed++;
    nextCard();
  }

  function finishSession() {
    state.current = null;
    els.study.classList.add('hidden');
    els.done.classList.remove('hidden');
    els.doneTotal.textContent = state.allCards.length;
    els.doneMissed.textContent = state.missed;
  }

  function backToSetup() {
    els.study.classList.add('hidden');
    els.done.classList.add('hidden');
    els.setup.classList.remove('hidden');
    setStatus('');
  }

  els.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const cards = parseDeck(text);
      setStatus(`Loaded ${cards.length} card${cards.length === 1 ? '' : 's'} from ${file.name}.`, 'success');
      startSession(cards);
    } catch (err) {
      setStatus('Could not read file: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  });

  els.loadSampleBtn.addEventListener('click', () => {
    const cards = parseDeck(SAMPLE_DECK.join('\n'));
    setStatus(`Loaded sample deck with ${cards.length} cards.`, 'success');
    startSession(cards);
  });

  els.loadPasteBtn.addEventListener('click', () => {
    const cards = parseDeck(els.pasteArea.value);
    if (!cards.length) {
      setStatus('No valid cards found in pasted text.', 'error');
      return;
    }
    setStatus(`Loaded ${cards.length} cards.`, 'success');
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
