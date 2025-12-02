# Minesweeper

Clean, dependency-free Minesweeper built with vanilla HTML, CSS, and JS.

## Features
- Safe first click with lazy mine seeding.
- Flood-fill zero expansion and win/lose detection.
- Flagging with live mine counter and timer.
- Responsive board that auto-sizes tile dimensions and scrolls if needed.
- Presets (Easy/Medium/Hard) plus custom rows/cols/mines.
- Peek (temporary mine outlines) and deterministic Hint (safe tiles in green, probable mines in red).

## Run locally
1) Open `index.html` directly in a browser, **or**
2) Serve the folder: `python3 -m http.server 8000` and visit `http://localhost:8000`.

## How to play
- Left click: reveal; right click (or long-press on touch): flag/unflag.
- **New Game** reshuffles using the current settings; timer starts on your first action.
- **Peek** briefly outlines unrevealed mines.
- **Hint** applies basic Minesweeper logic to mark guaranteed safe tiles (green) or certain mines (red); highlights fade automatically.

## Notes
- Zero regions expand until numbered boundaries.
- Mine counter shows `mines - flags`.
- Works on mobile; board shrinks cells and sits in a scrollable shell for large grids.
