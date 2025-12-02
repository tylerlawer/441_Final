# Klondike Solitaire with AI

[![CI](https://img.shields.io/github/actions/workflow/status/robertbiv/Klondike-Solitaire-with-AI/ci.yml?branch=main&label=CI)](https://github.com/robertbiv/Klondike-Solitaire-with-AI/actions/workflows/ci.yml)
[![Pages](https://img.shields.io/github/deployments/robertbiv/Klondike-Solitaire-with-AI/github-pages?label=pages)](https://github.com/robertbiv/Klondike-Solitaire-with-AI/deployments/activity_log?environment=github-pages)

A Solitaire game that can actually teach you how to play better! Built with React and includes an AI that explains its thinking.

**🎮 [Play it live here!](https://robertb.me/Klondike-Solitaire-with-AI/)**

## What's Cool About This

- **The Classic Game** - Standard Klondike Solitaire that you know and love
- **Drag & Drop Cards** - Just grab and move them around (uses react-dnd)
- **AI That Explains Itself** - This is the fun part:
  - Highlights which card to move (purple) and where to put it (green/amber)
  - Tells you *why* in plain English
  - Can actually make the move for you if you want
  - Shows you its whole decision-making process in the debug console
- **Live Debug Console** - Watch what's happening under the hood in real-time
- **Works on Any Screen** - Automatically shrinks to fit your display
- **Victory Screen** - Pops up when you win!

## How to Play

### The Goal
Get all 52 cards into the four foundation piles, going from Ace up to King in each suit.

### The Rules
- **The 7 columns (tableau)**: Stack cards going down, alternating red and black
- **The 4 foundations**: Build up by suit (hearts with hearts, etc.) starting with Aces
- **The draw pile (stock)**: Click to flip over a new card; when empty, it recycles
- **Empty spots**: Only Kings can start a new column

### What You Can Do
- **Drag cards around** - Move them between columns or to foundations
- **Click the stock pile** - Draw a new card
- **"Suggest Move"** - Stuck? Ask the AI what it would do
- **"Do Suggested Move"** - Let the AI actually make the move
- **"Clear Highlight"** - Turn off the glowing hints
- **"New Game"** - Shuffle up and start over

## Running It

### First Time Setup

```bash
npm install
```

### Start Playing

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Make a Production Build

```bash
npm run build
```

This creates an optimized version in the `build/` folder that you can deploy anywhere.

## GitHub Actions (CI/CD)

This repo includes GitHub Actions for CI and deployment:

- **CI** (`.github/workflows/ci.yml`): Installs dependencies, runs tests, and builds on push/PR to `main`.
- **Deploy to Pages** (`.github/workflows/deploy.yml`): Builds and publishes the app to GitHub Pages on push to `main`.

### Enable GitHub Pages

1. In GitHub, go to `Settings` → `Pages`.
2. Set **Source** to "GitHub Actions".
3. After the next push to `main`, the site will deploy. The URL will appear in the Actions run summary.

Notes:
- Workflows build from the `solitaire/` folder and publish the `solitaire/build` output.
- Tests run via `react-scripts test` with `--watchAll=false --passWithNoTests` for CI.
- The project currently has no test files; CI passes with the `--passWithNoTests` flag.

## How It's Organized

```
src/
├── components/        # All the React components
│   ├── Card.jsx      # A single card (can drag it)
│   ├── Tableau.jsx   # One of the 7 main columns
│   ├── Foundations.jsx # The 4 foundation piles
│   ├── StockAndWaste.jsx # Draw pile area
│   ├── ControlsBar.jsx # Buttons and AI hints
│   ├── GameBoard.jsx # Puts everything together
│   └── DebugMenu.jsx # The debug panel
├── hooks/
│   ├── useGame.js    # Where all the game logic lives
│   └── useScaleToFit.js # Makes it fit your screen
├── logic/
│   ├── setup.js      # Shuffles and deals cards
│   ├── rules.js      # What moves are legal
│   └── ai.js         # The AI brain
└── utils/
    └── debug.js      # Logging system
```

## How the AI Works

It scores every possible move and picks the best one. Here's what it likes:

- **Moving to foundations** (50+ points) - This is literally the goal
- **Flipping face-down cards** (25-35 points) - Reveals more options
- **Clearing columns** (12-22 points) - Makes room for Kings
- **Moving card stacks** (10-25 points) - Organizes things better

Open the debug console (click the bug button) to see:
- Every move the AI considered
- How it scored each one and why
- A "decision tree" showing what could happen next
- Which move it picked and the reasoning

## Built With

- **React 18** - The UI framework
- **react-dnd** - Handles drag and drop
- **Tailwind CSS** - Makes it look nice
- **Create React App** - Gets everything set up