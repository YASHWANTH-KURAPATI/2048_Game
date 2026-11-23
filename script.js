/* A small, readable implementation of the 2048 puzzle game. */
const SIZE = 4;
const TARGET = 2048;
const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const movesEl = document.getElementById('moves');
const statusEl = document.getElementById('status');
const highestEl = document.getElementById('highest-tile');
const progressEl = document.getElementById('progress-fill');
const progressTrack = document.getElementById('progress-track');
const overlay = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const overlayIcon = document.getElementById('overlay-icon');
const keepGoing = document.getElementById('keep-going');

let grid = [];
let score = 0;
let best = readBest();
let moves = 0;
let won = false;
let gameOver = false;
let cells = [];

function readBest() {
  try { return Number(localStorage.getItem('2048-neon-best')) || 0; }
  catch { return 0; } // Works even when localStorage is unavailable.
}
function saveBest() {
  try { localStorage.setItem('2048-neon-best', String(best)); }
  catch { /* Private browsing may disable storage. */ }
}

// Create 16 tiles once; later we only update their numbers and colors.
for (let r = 0; r < SIZE; r++) {
  cells[r] = [];
  for (let c = 0; c < SIZE; c++) {
    const cell = document.createElement('div');
    cell.className = 'tile tile-0';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', 'Empty');
    boardEl.appendChild(cell);
    cells[r][c] = cell;
  }
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (!empty.length) return null;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return [r, c];
}

function newGame() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  moves = 0;
  won = false;
  gameOver = false;
  overlay.hidden = true;
  addRandomTile();
  addRandomTile();
  statusEl.textContent = 'Your turn — make a move!';
  render();
}

// For instance: [2, 0, 2, 4] becomes [4, 4, 0, 0].
function mergeLine(line) {
  const numbers = line.filter(value => value !== 0);
  const result = [];
  const mergedPositions = [];
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] === numbers[i + 1]) {
      const merged = numbers[i] * 2;
      score += merged;
      mergedPositions.push(result.length);
      result.push(merged);
      i++;
    } else {
      result.push(numbers[i]);
    }
  }
  while (result.length < SIZE) result.push(0);
  return { result, mergedPositions };
}

function move(direction) {
  if (gameOver || !overlay.hidden) return;
  const before = JSON.stringify(grid);
  const mergedCells = [];

  for (let i = 0; i < SIZE; i++) {
    const coords = [];
    for (let j = 0; j < SIZE; j++) {
      if (direction === 'left') coords.push([i, j]);
      if (direction === 'right') coords.push([i, SIZE - 1 - j]);
      if (direction === 'up') coords.push([j, i]);
      if (direction === 'down') coords.push([SIZE - 1 - j, i]);
    }
    const values = coords.map(([r, c]) => grid[r][c]);
    const { result, mergedPositions } = mergeLine(values);
    coords.forEach(([r, c], j) => { grid[r][c] = result[j]; });
    mergedPositions.forEach(j => mergedCells.push(coords[j].join(',')));
  }

  if (JSON.stringify(grid) === before) return; // Don't spawn a tile on an invalid move.
  moves++;
  const addedCell = addRandomTile();
  statusEl.textContent = 'Nice move — keep going!';
  render(addedCell, new Set(mergedCells));

  const reached2048 = grid.some(row => row.some(value => value >= TARGET));
  if (reached2048 && !won) {
    won = true;
    showOverlay('Amazing, you won!', 'You made a 2048 tile. Want to keep going?', '✦', true);
  } else if (!canMove()) {
    gameOver = true;
    statusEl.textContent = 'No moves left — try again!';
    showOverlay('Game over', 'No more possible moves. Ready for another round?', '↻', false);
  }
}

function canMove() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r][c];
      if (value === 0) return true;
      if (r < SIZE - 1 && value === grid[r + 1][c]) return true;
      if (c < SIZE - 1 && value === grid[r][c + 1]) return true;
    }
  }
  return false;
}

function render(spawned = null, merged = new Set()) {
  if (score > best) { best = score; saveBest(); }
  scoreEl.textContent = score.toLocaleString();
  bestEl.textContent = best.toLocaleString();
  movesEl.textContent = moves;

  let highest = 2;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const value = grid[r][c];
      if (value > highest) highest = value;
      const cell = cells[r][c];
      const category = value > TARGET ? 'super' : value;
      const animation = spawned && spawned[0] === r && spawned[1] === c
        ? ' tile-pop' : merged.has(`${r},${c}`) ? ' tile-merged' : '';
      cell.className = `tile tile-${category}${animation}`;
      cell.textContent = value === 0 ? '' : value;
      cell.setAttribute('aria-label', value === 0 ? 'Empty' : String(value));
    }
  }
  highestEl.textContent = `${highest} / ${TARGET}`;
  const percentage = Math.min(100, Math.round(Math.log2(highest) / Math.log2(TARGET) * 100));
  progressEl.style.width = percentage + '%';
  progressTrack.setAttribute('aria-valuenow', String(percentage));
}

function showOverlay(title, message, icon, canContinue) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayIcon.textContent = icon;
  keepGoing.hidden = !canContinue;
  overlay.hidden = false;
}

const keyMap = {
  arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right'
};
document.addEventListener('keydown', event => {
  const direction = keyMap[event.key.toLowerCase()];
  if (direction) { event.preventDefault(); move(direction); }
});
document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('click', () => move(button.dataset.direction));
});
document.getElementById('restart').addEventListener('click', newGame);
document.getElementById('play-again').addEventListener('click', newGame);
keepGoing.addEventListener('click', () => { overlay.hidden = true; });

// Swipe support for phones and tablets.
let startTouch = null;
boardEl.addEventListener('touchstart', event => {
  const touch = event.changedTouches[0];
  startTouch = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
boardEl.addEventListener('touchend', event => {
  if (!startTouch) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - startTouch.x;
  const dy = touch.clientY - startTouch.y;
  startTouch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
  move(Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up'));
}, { passive: true });

newGame();
