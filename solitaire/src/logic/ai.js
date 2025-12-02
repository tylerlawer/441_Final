/**
 * AI MOVE SUGGESTION LOGIC
 *
 * Overview:
 * 1. enumerateMoves(state): produce legal atomic moves (foundation, tableau, waste, draw).
 * 2. Extended enumeration now includes multi-card stack moves (tableau-stack-to-tableau).
 * 3. scoreMove(): heuristic scoring favouring foundation progress, uncovering face-down cards,
 *    freeing columns, and moving longer valid sequences.
 * 4. suggestBestMove(): choose highest-score candidate.
 * 5. explainMove(): user readable feedback for UI hints.
 * 6. getSuggestion(): convenience wrapper returning { move, message }.
 *
 * Stack Move Enumeration:
 * - For each column and start index we call canDragFromTableau to ensure the run
 *   from startIdx is a valid descending alternating sequence (all face-up).
 * - Only the top card of that run is tested for destination legality (Klondike rule).
 * - We record length so scoring can reward repositioning longer sequences.
 * - Uncovering a face-down card below the moved stack yields a strong bonus.
 */
// Heuristic-based move suggestion: fast, readable, no deep search.
import { 
  canPlaceOnFoundation,
  canPlaceOnTableau,
  canDrawFromStock,
  canRecycleWaste,
  isGameWon,
  canDragFromTableau
} from './rules.js';
import { debugLog } from '../utils/debug.js';

// Move object shape:
// { type: 'tableau-to-foundation'|'waste-to-foundation'|'tableau-to-tableau'|'waste-to-tableau'|'draw-stock'|'recycle-waste',
//   fromColumn, fromIndex, toColumn, foundationIndex, score, reason }

export function enumerateMoves(state) {
  const moves = [];
  const { tableaus, foundations, waste, stock } = state;

  // Tableau -> Foundation
  tableaus.forEach((col, colIndex) => {
    if (col.length === 0) return;
    const top = col[col.length - 1];
    if (!top.faceUp) return;
    for (let f = 0; f < foundations.length; f++) {
      if (canPlaceOnFoundation(top, foundations[f])) {
        moves.push({
          type: 'tableau-to-foundation',
          fromColumn: colIndex,
          fromIndex: col.length - 1,
          foundationIndex: f
        });
      }
    }
  });

  // Waste -> Foundation
  if (waste.length) {
    const topWaste = waste[waste.length - 1];
    for (let f = 0; f < foundations.length; f++) {
      if (canPlaceOnFoundation(topWaste, foundations[f])) {
        moves.push({
          type: 'waste-to-foundation',
          foundationIndex: f
        });
      }
    }
  }

  // Tableau -> Tableau (single top card)
  tableaus.forEach((source, fromCol) => {
    if (source.length === 0) return;
    const top = source[source.length - 1];
    if (!top.faceUp) return;
    tableaus.forEach((dest, toCol) => {
      if (fromCol === toCol) return;
      if (canPlaceOnTableau(top, dest)) {
        moves.push({
          type: 'tableau-to-tableau',
          fromColumn: fromCol,
          fromIndex: source.length - 1,
          toColumn: toCol
        });
      }
    });
  });

  // Tableau stack moves (multi-card). Use canDragFromTableau to validate starting index.
  tableaus.forEach((source, fromCol) => {
    if (source.length === 0) return;
    for (let startIdx = 0; startIdx < source.length; startIdx++) {
      if (!canDragFromTableau(tableaus, fromCol, startIdx)) continue;
      const stackTop = source[startIdx];
      if (!stackTop.faceUp) continue;
      tableaus.forEach((dest, toCol) => {
        if (fromCol === toCol) return;
        if (canPlaceOnTableau(stackTop, dest)) {
          moves.push({
            type: 'tableau-stack-to-tableau',
            fromColumn: fromCol,
            fromIndex: startIdx,
            toColumn: toCol,
            length: source.length - startIdx
          });
        }
      });
    }
  });

  // Waste -> Tableau
  if (waste.length) {
    const topWaste = waste[waste.length - 1];
    tableaus.forEach((dest, toCol) => {
      if (canPlaceOnTableau(topWaste, dest)) {
        moves.push({
          type: 'waste-to-tableau',
          toColumn: toCol
        });
      }
    });
  }

  // Draw stock
  if (canDrawFromStock(stock)) {
    moves.push({ type: 'draw-stock' });
  } else if (canRecycleWaste(stock, waste)) {
    moves.push({ type: 'recycle-waste' });
  }

  return moves;
}

// Heuristic scoring for prioritization
// Higher is better
// Give a move a numeric score + reasons list (simple heuristic)
export function scoreMove(move, state) {
  const { tableaus, waste, foundations } = state;
  let score = 0;
  let reasonParts = [];

  const add = (pts, text) => { score += pts; reasonParts.push(text); };

  switch (move.type) {
    case 'tableau-to-foundation': {
      const card = tableaus[move.fromColumn][move.fromIndex];
      add(50, 'Progress foundation');
      // Earlier ranks accelerate future uncovering
      if (card && (card.rank === 'ace' || card.rank === '2')) add(10, 'Low rank foundation build');
      // Uncover face-down card benefit
      const src = tableaus[move.fromColumn];
      if (src.length === 1) add(12, 'Free column');
      if (src.length > 1) {
        const under = src[src.length - 2];
        if (under && !under.faceUp) add(25, 'Uncovers face-down card');
      }
      break;
    }
    case 'waste-to-foundation': {
      add(45, 'Waste to foundation');
      const topWaste = waste[waste.length - 1];
      if (topWaste && topWaste.rank === 'ace') add(15, 'Ace advancement');
      break;
    }
    case 'tableau-to-tableau': {
      const src = tableaus[move.fromColumn];
      if (src.length > 1) {
        const under = src[src.length - 2];
        if (under && !under.faceUp) add(30, 'Uncovers face-down card');
      }
      // Creating empty column by moving last card
      if (src.length === 1) add(18, 'Creates empty column (King slot)');
      add(8, 'Reposition for future sequence');
      break;
    }
    case 'tableau-stack-to-tableau': {
      const src = tableaus[move.fromColumn];
      const movingLen = move.length || 1;
      // Uncovering if the card above startIdx becomes exposed
      if (move.fromIndex > 0) {
        const under = src[move.fromIndex - 1];
        if (under && !under.faceUp) add(35, 'Uncovers face-down card beneath stack');
      }
      if (move.fromIndex === 0) add(22, 'Frees entire column');
      // Larger stacks receive incremental bonus
      add(Math.min(25, movingLen * 3), 'Moves multi-card sequence');
      add(10, 'Improves sequencing potential');
      break;
    }
    case 'waste-to-tableau': {
      add(12, 'Deploy waste card');
      break;
    }
    case 'draw-stock': {
      add(5, 'Reveal new card');
      break;
    }
    case 'recycle-waste': {
      add(4, 'Recycle waste to restock');
      break;
    }
    default:
      break;
  }

  // Bonus if move leads closer to win (simple: more foundation cards)
  const foundationCount = foundations.reduce((sum, f) => sum + f.length, 0);
  add(foundationCount * 0.2, 'Foundation progress weight');

  return { score, reason: reasonParts.join('; ') };
}

export function suggestBestMove(state) {
  if (isGameWon(state.foundations)) {
    return { type: 'game-won', reason: 'All foundation piles complete', score: Infinity };
  }
  const moves = enumerateMoves(state);
  // Log enumeration summary
  try {
    const brief = moves.slice(0, 25).map((m) => ({
      type: m.type,
      from: m.fromColumn !== undefined ? `${m.fromColumn}:${m.fromIndex ?? ''}` : undefined,
      to: m.toColumn !== undefined ? m.toColumn : undefined,
      f: m.foundationIndex !== undefined ? m.foundationIndex : undefined,
      len: m.length
    }));
    debugLog('🤖 AI: Enumerated moves', { count: moves.length, examples: brief });
  } catch {}
  if (moves.length === 0) {
    return { type: 'no-move', reason: 'No legal moves available', score: 0 };
  }
  // Score all moves
  const scoredMoves = moves.map((m) => {
    const s = scoreMove(m, state);
    return { ...m, score: s.score, reason: s.reason };
  });
  // Sort desc by score for logging visibility
  scoredMoves.sort((a, b) => b.score - a.score);
  const topPreview = scoredMoves.slice(0, 5).map((m) => ({
    type: m.type,
    score: Math.round(m.score * 100) / 100,
    reason: m.reason,
    from: m.fromColumn !== undefined ? `${m.fromColumn}:${m.fromIndex ?? ''}` : undefined,
    to: m.toColumn !== undefined ? m.toColumn : undefined,
    f: m.foundationIndex !== undefined ? m.foundationIndex : undefined,
    len: m.length
  }));
  debugLog('🤖 AI: Scored moves (top)', { total: scoredMoves.length, top: topPreview });
  const best = scoredMoves[0];
  debugLog('🤖 AI: Selected best move', { type: best.type, score: best.score, reason: best.reason, details: topPreview[0] });
  return best;
}

export function explainMove(move, state) {
  if (!move) return 'No move suggested.';
  
  // Helper to get card description with color hint
  const describeCard = (card) => {
    if (!card) return 'card';
    const color = ['hearts', 'diamonds'].includes(card.suit?.toLowerCase()) ? 'red' : 'black';
    return `${color} ${card.rank}`;
  };

  const { tableaus, waste } = state || {};
  
  switch (move.type) {
    case 'tableau-to-foundation': {
      const card = tableaus?.[move.fromColumn]?.[move.fromIndex];
      return `Move ${describeCard(card)} (purple highlight) from column ${move.fromColumn + 1} to foundation pile (amber highlight) - building Ace to King by suit.`;
    }
    case 'waste-to-foundation': {
      const card = waste?.[waste.length - 1];
      return `Move ${describeCard(card)} (purple highlight) from waste pile to foundation (amber highlight) - building Ace to King by suit.`;
    }
    case 'tableau-to-tableau': {
      const card = tableaus?.[move.fromColumn]?.[tableaus[move.fromColumn].length - 1];
      return `Move ${describeCard(card)} (purple highlight) from column ${move.fromColumn + 1} to column ${move.toColumn + 1} (green highlight) - alternate red/black, descending.`;
    }
    case 'tableau-stack-to-tableau': {
      const startCard = tableaus?.[move.fromColumn]?.[move.fromIndex];
      return `Move ${move.length}-card stack (purple highlight, starting with ${describeCard(startCard)}) from column ${move.fromColumn + 1} to column ${move.toColumn + 1} (green highlight) - alternate colors.`;
    }
    case 'waste-to-tableau': {
      const card = waste?.[waste.length - 1];
      return `Move ${describeCard(card)} (purple highlight) from waste to column ${move.toColumn + 1} (green highlight) - alternate red/black, descending.`;
    }
    case 'draw-stock':
      return `Click the stock pile (green highlight) to draw a new card.`;
    case 'recycle-waste':
      return `Click the stock pile (green highlight) to recycle waste cards back to stock.`;
    case 'game-won':
      return `Congratulations! All cards are in the foundation piles!`;
    case 'no-move':
      return `No legal moves available. Try drawing from stock or starting a new game.`;
    default:
      return `Unknown move type.`;
  }
}

export default function getSuggestion(state) {
  const move = suggestBestMove(state);
  try {
    const message = explainMove(move, state);
    debugLog('🤖 AI: Explanation', { message });
  } catch {}
  return { move, message: explainMove(move, state) };
}