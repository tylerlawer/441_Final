/**
 * SOLITAIRE GAME RULES (Centralized)
 * Config-driven: tweakable values (draw count, rank values, suits, pile rules) are in rules.json.
 * Helper functions read that config; logic is kept thin and data-driven.
 * If something seems hard-coded, check rules.json before changing code.
 */

import rulesConfigRaw from './rules.json';

// Defensive clone of JSON (avoid accidental mutation of import object)
// I once accidentally mutated an imported JSON and nothing updated, so cloning keeps things safe.
const RULES = JSON.parse(JSON.stringify(rulesConfigRaw));

// --- Utility lookups derived from JSON config ---
const rankValues = RULES.rankValues;
const rankAliases = RULES.rankAliases;
const suitColors = RULES.suitColors;

// Convert rank to numeric value using config (supports aliases like 'A','K').
const rankToNumber = (r) => {
    if (r == null) return NaN;
    if (typeof r === 'number') return r;
    const key = String(r).toLowerCase();
    const canonical = rankValues[key] != null ? key : rankAliases[key];
    if (canonical && rankValues[canonical] != null) return rankValues[canonical];
    const n = parseInt(key, 10);
    return Number.isNaN(n) ? NaN : n;
};

// Return 'red' or 'black' based on suit from config.
const colorOf = (suit) => {
    if (!suit) return null;
    const key = String(suit).toLowerCase();
    return suitColors[key] || null;
};

// TABLEAU RULES
// Rule: can we drop a (top) card / stack onto a tableau column?
export function canPlaceOnTableau(card, destinationCards) {
    if (!card) return false;
    const cfg = RULES.tableau;
    const cardRank = rankToNumber(card.rank);
    const destLen = Array.isArray(destinationCards) ? destinationCards.length : 0;

    // Empty column rule
    if (destLen === 0) {
        if (!cfg.allowOnEmpty) return false;
        if (typeof cfg.allowOnEmpty === 'string') {
            return cardRank === rankToNumber(cfg.allowOnEmpty);
        }
        if (cfg.allowOnEmpty === true) return true; // variant: allow any card
        return false;
    }

    const top = destinationCards[destLen - 1];
    if (!top) return false;
    const topRank = rankToNumber(top.rank);
    const topColor = colorOf(top.suit);
    const cardColor = colorOf(card.suit);

    // Color alternation
    if (cfg.alternateColors) {
        if (!topColor || !cardColor || topColor === cardColor) return false;
    }

    // Direction check
    if (cfg.buildDirection === 'descending') {
        return cardRank === topRank - 1;
    } else if (cfg.buildDirection === 'ascending') {
        return cardRank === topRank + 1;
    }
    return false;
}

// FOUNDATION RULES
// Rule: can we put this card on a foundation pile?
export function canPlaceOnFoundation(card, foundationCards) {
    if (!card) return false;
    const cfg = RULES.foundation;
    const cardRank = rankToNumber(card.rank);
    const destLen = Array.isArray(foundationCards) ? foundationCards.length : 0;

    if (destLen === 0) {
        return cardRank === rankToNumber(cfg.start);
    }

    const top = foundationCards[destLen - 1];
    if (!top) return false;
    const topRank = rankToNumber(top.rank);

    if (cfg.matchSuit && top.suit !== card.suit) return false;

    if (cfg.buildDirection === 'ascending') {
        return cardRank === topRank + 1;
    } else if (cfg.buildDirection === 'descending') {
        return cardRank === topRank - 1;
    }
    return false;
}

// GENERAL PLACEMENT RULE
// Generic placement wrapper that decides which rule set applies
export function canPlace(card, destinationCards) {
    if (!card) return false;

    const destIsFoundation = Boolean(destinationCards && destinationCards.isFoundation);

    if (destIsFoundation) {
        return canPlaceOnFoundation(card, destinationCards);
    }

    return canPlaceOnTableau(card, destinationCards);
}

// DRAGGING RULES
// Simple drag permission: only face-up cards can start a drag
export function canDragCard(card) {
    if (!card) return false;
    return card.faceUp === true;
}

// Validate dragging a stack starting at cardIndex from a tableau column
// Ensures alternating colors + descending order + all face-up
export function canDragFromTableau(tableau, columnIndex, cardIndex) {
    if (!tableau || !tableau[columnIndex]) return false;
    const column = tableau[columnIndex];
    if (cardIndex >= column.length) return false;
    
    const card = column[cardIndex];
    if (!card || !card.faceUp) return false;
    
    // All cards from this index onwards must be face up and follow valid stacking
    for (let i = cardIndex; i < column.length - 1; i++) {
        const current = column[i];
        const next = column[i + 1];
        if (!canPlaceOnTableau(next, [current])) {
            return false;
        }
    }
    
    return true;
}

export function canDragFromWaste(waste) {
    if (!waste || waste.length === 0) return false;
    const top = waste[waste.length - 1];
    return top && top.faceUp === true;
}

// MOVE TO FOUNDATION RULES
// Try each foundation; return index of first legal spot or -1
export function canMoveToFoundation(card, foundations) {
    if (!card || !card.faceUp) return false;
    
    for (let i = 0; i < foundations.length; i++) {
        if (canPlaceOnFoundation(card, foundations[i])) {
            return i;
        }
    }
    
    return -1;
}

// Convenience: check top card of a given tableau column
export function canMoveTableauToFoundation(tableau, columnIndex, foundations) {
    if (!tableau || !tableau[columnIndex]) return false;
    const column = tableau[columnIndex];
    if (column.length === 0) return false;
    
    const topCard = column[column.length - 1];
    return canMoveToFoundation(topCard, foundations);
}

// Convenience: check top waste card
export function canMoveWasteToFoundation(waste, foundations) {
    if (!waste || waste.length === 0) return false;
    const topCard = waste[waste.length - 1];
    return canMoveToFoundation(topCard, foundations);
}

// STOCK RULES
// Draw allowed if we have at least drawCount cards left
export function canDrawFromStock(stock) {
    const drawCount = RULES.stock.drawCount || 1;
    return stock && stock.length >= drawCount;
}

// Recycle when stock empty but waste has cards
export function canRecycleWaste(stock, waste) {
    return (!stock || stock.length === 0) && waste && waste.length > 0;
}

// WINNING CONDITION
// Win condition: every foundation has full length from config
export function isGameWon(foundations) {
    const pilesNeeded = RULES.winCondition.foundationPiles;
    const cardsPer = RULES.winCondition.cardsPerPile;
    if (!foundations || foundations.length !== pilesNeeded) return false;
    for (const foundation of foundations) {
        if (!foundation || foundation.length !== cardsPer) return false;
    }
    return true;
}

// CARD UPDATE HELPER
// Update in-flight card indices after a move (used by DnD logic)
export function onMoveCard(item, toColIndex) {
    if (!item || !item.card) return null;
    const card = item.card;

    card.columnIndex = toColIndex;

    if (typeof item.toIndex === 'number') {
        card.index = item.toIndex;
    } else if (typeof item.fromIndex === 'number' && item.fromColumn === toColIndex) {
        card.index = item.fromIndex;
    } else if (Array.isArray(item.destinationCards)) {
        card.index = item.destinationCards.length;
    } else {
        card.index = 0;
    }

    return card;
}

// Expose raw config (read‑only) for UI / debugging
// Export a read-only copy for UI display / debugging panels
export function getRulesConfig() {
    return RULES;
}