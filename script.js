const boardEl = document.getElementById("board");
const mineCounterEl = document.getElementById("mineCounter");
const timerEl = document.getElementById("timer");
const stateEl = document.getElementById("state");
const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");
const minesInput = document.getElementById("mines");
const resetBtn = document.getElementById("resetBtn");
const presetButtons = document.querySelectorAll("[data-preset]");
const peekBtn = document.getElementById("peekBtn");

let grid = [];
let rows = 9;
let cols = 9;
let mines = 10;
let flagsPlaced = 0;
let firstClick = true;
let timerId = null;
let elapsed = 0;
let gameOver = false;

function pad(value) {
  return value.toString().padStart(3, "0");
}

function resetTimer() {
  clearInterval(timerId);
  timerId = null;
  elapsed = 0;
  timerEl.textContent = pad(0);
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    elapsed += 1;
    timerEl.textContent = pad(elapsed);
  }, 1000);
}

function setState(message) {
  stateEl.textContent = message;
}

function clampInputs() {
  rows = Math.max(4, Math.min(20, Number(rowsInput.value) || 9));
  cols = Math.max(4, Math.min(20, Number(colsInput.value) || 9));
  const maxMines = rows * cols - 1;
  mines = Math.max(1, Math.min(maxMines, Number(minesInput.value) || 10));
  rowsInput.value = rows;
  colsInput.value = cols;
  minesInput.value = mines;
}

function buildEmptyGrid() {
  grid = [];
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;

  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      const cell = {
        row: r,
        col: c,
        mine: false,
        revealed: false,
        flagged: false,
        adjacent: 0,
        el: document.createElement("button"),
      };
      cell.el.className = "cell";
      cell.el.setAttribute("role", "gridcell");
      cell.el.setAttribute("aria-label", "Hidden cell");
      cell.el.addEventListener("click", () => onReveal(cell));
      cell.el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        onFlag(cell);
      });
      boardEl.appendChild(cell.el);
      row.push(cell);
    }
    grid.push(row);
  }
}

function adjustCellSize() {
  const shell = boardEl.parentElement;
  if (!shell) return;

  // Fit tiles to the available shell while respecting min/max sizes.
  const shellStyles = getComputedStyle(shell);
  const boardStyles = getComputedStyle(boardEl);
  const shellPaddingX =
    parseFloat(shellStyles.paddingLeft) + parseFloat(shellStyles.paddingRight);
  const shellPaddingY =
    parseFloat(shellStyles.paddingTop) + parseFloat(shellStyles.paddingBottom);
  const boardPaddingX =
    parseFloat(boardStyles.paddingLeft) + parseFloat(boardStyles.paddingRight);
  const boardPaddingY =
    parseFloat(boardStyles.paddingTop) + parseFloat(boardStyles.paddingBottom);
  const gap = parseFloat(boardStyles.gap) || 0;

  const minSize = 26;
  const maxSize = 60;
  const usableWidth =
    shell.clientWidth - shellPaddingX - boardPaddingX - gap * (cols - 1);
  const widthSize = Math.floor(usableWidth / cols);

  const usableHeight = shell.clientHeight
    ? shell.clientHeight - shellPaddingY - boardPaddingY - gap * (rows - 1)
    : Infinity;
  const heightSize = Number.isFinite(usableHeight)
    ? Math.floor(usableHeight / rows)
    : widthSize;

  const candidate = Math.min(widthSize, heightSize);
  const finalSize = Math.max(minSize, Math.min(maxSize, candidate));

  document.documentElement.style.setProperty("--cell-size", `${finalSize}px`);
}

function neighbors(cell) {
  const result = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = cell.row + dr;
      const nc = cell.col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        result.push(grid[nr][nc]);
      }
    }
  }
  return result;
}

function seedMines(excludeRow, excludeCol) {
  const positions = new Set();
  const limit = rows * cols;
  const excludeIndex = excludeRow * cols + excludeCol;
  while (positions.size < mines) {
    const idx = Math.floor(Math.random() * limit);
    if (idx === excludeIndex) continue;
    positions.add(idx);
  }
  positions.forEach((idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    grid[r][c].mine = true;
  });

  grid.flat().forEach((cell) => {
    cell.adjacent = neighbors(cell).filter((n) => n.mine).length;
  });
}

function onReveal(cell) {
  if (gameOver || cell.flagged || cell.revealed) return;

  if (firstClick) {
    seedMines(cell.row, cell.col);
    startTimer();
    firstClick = false;
  }

  revealCell(cell);
}

function revealCell(cell) {
  if (cell.revealed || cell.flagged) return;

  cell.revealed = true;
  cell.el.classList.add("cell--open");
  cell.el.setAttribute("aria-label", "Revealed");

  if (cell.mine) {
    cell.el.textContent = "*";
    cell.el.classList.add("cell--mine");
    endGame(false);
    return;
  }

  if (cell.adjacent > 0) {
    cell.el.textContent = cell.adjacent;
    cell.el.classList.add(`number-${cell.adjacent}`);
  } else {
    cell.el.textContent = "";
    expandZeros(cell);
  }

  checkWin();
}

function expandZeros(start) {
  const queue = [start];
  const seen = new Set();

  while (queue.length) {
    const current = queue.shift();
    const key = `${current.row}-${current.col}`;
    if (seen.has(key)) continue;
    seen.add(key);

    neighbors(current).forEach((neighbor) => {
      if (neighbor.flagged || neighbor.revealed) return;
      neighbor.revealed = true;
      neighbor.el.classList.add("cell--open");
      neighbor.el.setAttribute("aria-label", "Revealed");
      if (neighbor.mine) return;

      if (neighbor.adjacent > 0) {
        neighbor.el.textContent = neighbor.adjacent;
        neighbor.el.classList.add(`number-${neighbor.adjacent}`);
      } else {
        neighbor.el.textContent = "";
        queue.push(neighbor);
      }
    });
  }
}

function onFlag(cell) {
  if (gameOver || cell.revealed) return;
  if (firstClick) startTimer();

  cell.flagged = !cell.flagged;
  cell.el.classList.toggle("cell--flagged", cell.flagged);
  cell.el.setAttribute("aria-label", cell.flagged ? "Flagged" : "Hidden cell");
  flagsPlaced += cell.flagged ? 1 : -1;
  updateMineCounter();
}

function revealAllMines() {
  grid.flat().forEach((cell) => {
    if (cell.mine) {
      cell.el.textContent = "*";
      cell.el.classList.add("cell--mine", "cell--open");
    }
  });
}

function endGame(won) {
  gameOver = true;
  clearInterval(timerId);
  timerId = null;
  if (!won) {
    revealAllMines();
    setState("Boom!");
  } else {
    setState("Cleared!");
  }
}

function checkWin() {
  const total = rows * cols;
  const revealed = grid.flat().filter((c) => c.revealed && !c.mine).length;
  if (revealed === total - mines) {
    endGame(true);
  }
}

function updateMineCounter() {
  mineCounterEl.textContent = mines - flagsPlaced;
}

let hintTimeout = null;

function clearHints() {
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
  grid.flat().forEach((cell) =>
    cell.el.classList.remove("cell--hint-safe", "cell--hint-mine")
  );
}

function findHints() {
  const safe = new Map();
  const minesFound = new Map();

  grid
    .flat()
    .filter((cell) => cell.revealed && cell.adjacent > 0)
    .forEach((cell) => {
      const neigh = neighbors(cell);
      const hidden = neigh.filter((n) => !n.revealed && !n.flagged);
      if (!hidden.length) return;
      const flagged = neigh.filter((n) => n.flagged).length;

      if (flagged === cell.adjacent) {
        hidden.forEach((h) => safe.set(`${h.row}-${h.col}`, h));
      } else if (flagged + hidden.length === cell.adjacent) {
        hidden.forEach((h) => minesFound.set(`${h.row}-${h.col}`, h));
      }
    });

  return { safe: [...safe.values()], mines: [...minesFound.values()] };
}

function newGame() {
  clampInputs();
  firstClick = true;
  flagsPlaced = 0;
  gameOver = false;
  resetTimer();
  updateMineCounter();
  setState("Ready");
  peekBtn.disabled = false;
  boardEl.classList.remove("board--peeking");
  clearHints();
  buildEmptyGrid();
  adjustCellSize();
}

function applyPreset(preset) {
  const [r, c, m] = preset.split("x").map(Number);
  rowsInput.value = r;
  colsInput.value = c;
  minesInput.value = m;
  newGame();
}

function setupEvents() {
  rowsInput.addEventListener("change", newGame);
  colsInput.addEventListener("change", newGame);
  minesInput.addEventListener("change", newGame);
  resetBtn.addEventListener("click", newGame);
  presetButtons.forEach((btn) =>
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset))
  );
  peekBtn.addEventListener("click", () => {
    if (firstClick || gameOver) return;
    peekBtn.disabled = true;
    boardEl.classList.add("board--peeking");
    const minesCells = grid.flat().filter((c) => c.mine && !c.revealed);
    minesCells.forEach((cell) => cell.el.classList.add("cell--peek"));
    setTimeout(() => {
      minesCells.forEach((cell) => cell.el.classList.remove("cell--peek"));
      boardEl.classList.remove("board--peeking");
      peekBtn.disabled = false;
    }, 900);
  });
  const hintBtn = document.getElementById("hintBtn");
  hintBtn.addEventListener("click", () => {
    if (gameOver) return;
    clearHints();
    if (firstClick) {
      setState("Reveal one cell to start hints");
      return;
    }
    const { safe, mines: minesLikely } = findHints();
    if (!safe.length && !minesLikely.length) {
      setState("No deterministic hint found");
      return;
    }
    safe.forEach((cell) => cell.el.classList.add("cell--hint-safe"));
    minesLikely.forEach((cell) => cell.el.classList.add("cell--hint-mine"));
    setState(
      safe.length
        ? "Safe tiles highlighted"
        : "Probable mines highlighted"
    );
    hintTimeout = setTimeout(() => {
      clearHints();
      setState("Ready");
    }, 1500);
  });
  window.addEventListener("resize", adjustCellSize);
}

setupEvents();
newGame();
