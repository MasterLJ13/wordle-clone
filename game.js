/* ===== WORD LIST SOURCES =====
 *
 * Answers pool  — cfreshman's original Wordle answer list (2,315 common words)
 *   https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b
 *
 * Valid guesses — tabatkins' full Wordle dictionary (~14,800 words, taken
 *   directly from the NYT game source)
 *   https://github.com/tabatkins/wordle-list
 *
 * Both lists are fetched at startup; if either fetch fails the game falls back
 * to the bundled WORDS_5_FALLBACK list defined in words.js.
 */

const ANSWERS_URL = 'https://gist.githubusercontent.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b/raw/wordle-answers-alphabetical.txt';
const VALID_URL   = 'https://raw.githubusercontent.com/tabatkins/wordle-list/main/words';

/* ===== GAME STATE ===== */
const WORD_LISTS = { 2: WORDS_2, 3: WORDS_3, 4: WORDS_4, 5: null };
let validGuesses5  = null;  // full set for guess validation
let answerPool5    = null;  // curated pool for random picks

const MAX_GUESSES = 6;

let wordLength  = 5;
let targetWord  = '';
let currentGuess = [];
let guesses     = [];
let gameOver    = false;
let revealInProgress = false;

/* ===== LOADING SCREEN ===== */
function setLoading(on) {
  document.getElementById('board').classList.toggle('loading', on);
}

/* ===== FETCH WORD LISTS ===== */
async function loadWordLists() {
  setLoading(true);
  try {
    const [answersRes, validRes] = await Promise.all([
      fetch(ANSWERS_URL),
      fetch(VALID_URL),
    ]);

    if (!answersRes.ok || !validRes.ok) throw new Error('Fetch failed');

    const answersText = await answersRes.text();
    const validText   = await validRes.text();

    answerPool5   = answersText.trim().toLowerCase().split(/\s+/).filter(w => w.length === 5);
    validGuesses5 = new Set(validText.trim().toLowerCase().split(/\s+/).filter(w => w.length === 5));

    // Make answers also valid guesses
    answerPool5.forEach(w => validGuesses5.add(w));

    console.log(`Loaded ${answerPool5.length} answer words and ${validGuesses5.size} valid guesses.`);
  } catch (err) {
    console.warn('Could not fetch word lists, using fallback.', err);
    answerPool5   = WORDS_5_FALLBACK;
    validGuesses5 = new Set(WORDS_5_FALLBACK);
  }
  WORD_LISTS[5] = answerPool5;
  setLoading(false);
}

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

function getTile(r, c) { return document.getElementById(`tile-${r}-${c}`); }
function getRow(r)     { return document.getElementById(`row-${r}`); }

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
  if (key === 'Enter')                       submitGuess();
  else if (key === 'Backspace' || key === 'Delete') deleteLetter();
  else if (/^[a-zA-Z]$/.test(key))          addLetter(key.toLowerCase());
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
function isValidGuess(word) {
  if (wordLength === 5) return validGuesses5 && validGuesses5.has(word);
  return WORD_LISTS[wordLength].includes(word);
}

function submitGuess() {
  if (currentGuess.length !== wordLength) {
    showToast('Not enough letters');
    shakeRow(guesses.length);
    return;
  }
  const guess = currentGuess.join('');
  if (!isValidGuess(guess)) {
    showToast('Not in word list');
    shakeRow(guesses.length);
    return;
  }
  const row = guesses.length;
  guesses.push(guess);
  const result = scoreGuess(guess, targetWord);
  revealRow(row, guess, result, () => {
    updateKeyboard(guess, result);
    if (guess === targetWord)         showWin(row);
    else if (guesses.length === MAX_GUESSES) showLose();
  });
  currentGuess = [];
}

/* ===== SCORING ===== */
function scoreGuess(guess, target) {
  const result    = Array(wordLength).fill('absent');
  const targetArr = target.split('');
  const guessArr  = guess.split('');
  for (let i = 0; i < wordLength; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      targetArr[i] = null;
      guessArr[i]  = null;
    }
  }
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
  const delay = 300;
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
  document.querySelectorAll('.key[data-key]').forEach(btn => delete btn.dataset.state);
}

const STATE_PRIORITY = { correct: 3, present: 2, absent: 1 };

function updateKeyboard(guess, result) {
  for (let i = 0; i < wordLength; i++) {
    const btn = document.querySelector(`.key[data-key="${guess[i]}"]`);
    if (!btn) continue;
    const newP = STATE_PRIORITY[result[i]] || 0;
    const curP = STATE_PRIORITY[btn.dataset.state] || 0;
    if (newP > curP) btn.dataset.state = result[i];
  }
}

/* ===== SHAKE ===== */
function shakeRow(row) {
  const el = getRow(row);
  el.classList.remove('shake');
  void el.offsetWidth;
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
    showResultModal(WIN_EMOJIS[row], WIN_MESSAGES[row] || 'Amazing!',
      `You got it in ${row + 1} ${row === 0 ? 'try' : 'tries'}!`);
  }, wordLength * 300 + 800);
}

function showLose() {
  gameOver = true;
  setTimeout(() => showResultModal('😔', 'Better luck next time!', ''), 600);
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

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.getElementById('helpBtn').addEventListener('click', () => openModal('helpModal'));
document.getElementById('closeHelp').addEventListener('click', () => closeModal('helpModal'));
document.getElementById('startPlay').addEventListener('click', () => closeModal('helpModal'));
document.getElementById('playAgainBtn').addEventListener('click', () => {
  closeModal('resultModal');
  startGame(wordLength);
});
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
(async () => {
  await loadWordLists();

  if (!sessionStorage.getItem('wordle_played')) {
    sessionStorage.setItem('wordle_played', '1');
    setTimeout(() => openModal('helpModal'), 300);
  }

  startGame(5);
})();
