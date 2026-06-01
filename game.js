/* ===== GAME STATE ===== */
const WORD_LISTS = { 2: WORDS_2, 3: WORDS_3, 4: WORDS_4, 5: WORDS_5 };
const MAX_GUESSES = 6;

let wordLength = 5;
let targetWord  = '';
let currentGuess = [];
let guesses = [];
let gameOver = false;
let revealInProgress = false;

/* ===== INIT ===== */
function pickWord(len) {
  const list = WORD_LISTS[len];
  return list[Math.floor(Math.random() * list.length)].toLowerCase();
}

function startGame(len = wordLength) {
  wordLength   = len;
  targetWord   = pickWord(len);
  currentGuess = [];
  guesses      = [];
  gameOver     = false;
  revealInProgress = false;
  buildBoard();
  resetKeyboard();
  document.querySelectorAll('.mode-tab').forEach(t =>
    t.classList.toggle('active', parseInt(t.dataset.len) === len)
  );
}

/* ===== BOARD ===== */
function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  // Adjust tile size dynamically for 2-letter words (tiles will be wide)
  document.documentElement.style.setProperty(
    '--tile-size',
    wordLength <= 2 ? 'clamp(54px, 14vw, 80px)' :
    wordLength <= 3 ? 'clamp(52px, 12vw, 72px)' :
    wordLength === 4 ? 'clamp(48px, 11vw, 66px)' :
                      'clamp(44px, 10vw, 62px)'
  );

  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.classList.add('row');
    row.id = `row-${r}`;
    for (let c = 0; c < wordLength; c++) {
      const tile = document.createElement('div');
      tile.classList.add('tile');
      tile.id = `tile-${r}-${c}`;
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function getTile(r, c) {
  return document.getElementById(`tile-${r}-${c}`);
}

function getRow(r) {
  return document.getElementById(`row-${r}`);
}

/* ===== KEYBOARD HANDLING ===== */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  handleKey(e.key);
});

document.getElementById('keyboard').addEventListener('click', (e) => {
  const key = e.target.closest('.key');
  if (key) handleKey(key.dataset.key);
});

function handleKey(key) {
  if (gameOver || revealInProgress) return;

  if (key === 'Enter') {
    submitGuess();
  } else if (key === 'Backspace' || key === 'Delete') {
    deleteLetter();
  } else if (/^[a-zA-Z]$/.test(key)) {
    addLetter(key.toLowerCase());
  }
}

function addLetter(letter) {
  if (currentGuess.length >= wordLength) return;
  const row = guesses.length;
  const col = currentGuess.length;
  currentGuess.push(letter);
  const tile = getTile(row, col);
  tile.textContent = letter.toUpperCase();
  tile.classList.add('filled');
}

function deleteLetter() {
  if (currentGuess.length === 0) return;
  const row = guesses.length;
  const col = currentGuess.length - 1;
  currentGuess.pop();
  const tile = getTile(row, col);
  tile.textContent = '';
  tile.classList.remove('filled');
}

/* ===== SUBMIT GUESS ===== */
function submitGuess() {
  if (currentGuess.length !== wordLength) {
    showToast('Not enough letters');
    shakeRow(guesses.length);
    return;
  }

  const guess = currentGuess.join('');

  // Validate against word list (relaxed: accept any alphabetic string if list is small)
  const list = WORD_LISTS[wordLength];
  if (!list.includes(guess)) {
    showToast('Not in word list');
    shakeRow(guesses.length);
    return;
  }

  const row = guesses.length;
  guesses.push(guess);
  const result = scoreGuess(guess, targetWord);
  revealRow(row, guess, result, () => {
    updateKeyboard(guess, result);
    if (guess === targetWord) {
      showWin(row);
    } else if (guesses.length === MAX_GUESSES) {
      showLose();
    }
  });
  currentGuess = [];
}

/* ===== SCORING ===== */
function scoreGuess(guess, target) {
  const result = Array(wordLength).fill('absent');
  const targetArr = target.split('');
  const guessArr  = guess.split('');

  // First pass: mark correct
  for (let i = 0; i < wordLength; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      targetArr[i] = null;
      guessArr[i]  = null;
    }
  }
  // Second pass: mark present
  for (let i = 0; i < wordLength; i++) {
    if (guessArr[i] === null) continue;
    const idx = targetArr.indexOf(guessArr[i]);
    if (idx !== -1) {
      result[i] = 'present';
      targetArr[idx] = null;
    }
  }
  return result;
}

/* ===== REVEAL ANIMATION ===== */
function revealRow(row, guess, result, onDone) {
  revealInProgress = true;
  const delay = 300; // ms between tiles

  for (let c = 0; c < wordLength; c++) {
    const tile = getTile(row, c);
    setTimeout(() => {
      tile.classList.add('flip');
      setTimeout(() => {
        tile.dataset.color = result[c];
        tile.classList.remove('flip');
      }, 250);
    }, c * delay);
  }

  setTimeout(() => {
    revealInProgress = false;
    onDone();
  }, wordLength * delay + 300);
}

/* ===== KEYBOARD UPDATE ===== */
function resetKeyboard() {
  document.querySelectorAll('.key[data-key]').forEach(btn => {
    delete btn.dataset.state;
  });
}

const STATE_PRIORITY = { correct: 3, present: 2, absent: 1 };

function updateKeyboard(guess, result) {
  for (let i = 0; i < wordLength; i++) {
    const letter = guess[i];
    const btn = document.querySelector(`.key[data-key="${letter}"]`);
    if (!btn) continue;
    const current = btn.dataset.state || '';
    const newPriority = STATE_PRIORITY[result[i]] || 0;
    const curPriority = STATE_PRIORITY[current] || 0;
    if (newPriority > curPriority) {
      btn.dataset.state = result[i];
    }
  }
}

/* ===== SHAKE ===== */
function shakeRow(row) {
  const el = getRow(row);
  el.classList.remove('shake');
  void el.offsetWidth; // reflow
  el.classList.add('shake');
  el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
}

/* ===== WIN / LOSE ===== */
const WIN_MESSAGES = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
const WIN_EMOJIS   = ['🧠', '🏆', '🎯', '✨', '👏', '😅'];

function showWin(row) {
  gameOver = true;
  const rowEl = getRow(row);
  setTimeout(() => rowEl.classList.add('win'), 100);
  setTimeout(() => {
    showResultModal(
      WIN_EMOJIS[row],
      WIN_MESSAGES[row] || 'Amazing!',
      `You got it in ${row + 1} ${row === 0 ? 'try' : 'tries'}!`
    );
  }, wordLength * 300 + 800);
}

function showLose() {
  gameOver = true;
  setTimeout(() => {
    showResultModal(
      '😔',
      'Better luck next time!',
      ''
    );
  }, 600);
}

/* ===== TOAST ===== */
let toastTimer = null;
function showToast(msg, duration = 1800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ===== MODALS ===== */
function showResultModal(emoji, title, message) {
  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultMessage').textContent = message;
  document.getElementById('resultWord').textContent = targetWord.toUpperCase();
  openModal('resultModal');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.getElementById('helpBtn').addEventListener('click', () => openModal('helpModal'));
document.getElementById('closeHelp').addEventListener('click', () => closeModal('helpModal'));
document.getElementById('startPlay').addEventListener('click', () => closeModal('helpModal'));

document.getElementById('playAgainBtn').addEventListener('click', () => {
  closeModal('resultModal');
  startGame(wordLength);
});

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

/* ===== MODE TABS ===== */
document.getElementById('modeTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.mode-tab');
  if (!tab) return;
  const len = parseInt(tab.dataset.len);
  if (len !== wordLength) startGame(len);
});

/* ===== BOOT ===== */
// Show help on very first visit (sessionStorage so it won't repeat in same session)
if (!sessionStorage.getItem('wordle_played')) {
  sessionStorage.setItem('wordle_played', '1');
  setTimeout(() => openModal('helpModal'), 300);
}

startGame(5);
