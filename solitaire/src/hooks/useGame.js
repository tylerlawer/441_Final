// @ts-nocheck
/**
 * Main game state - everything happens here
 * 
 * How it's organized:
 * - GameProvider wraps the whole app and keeps track of all the cards
 * - Any component can call useGame() to get the current state and functions
 * - All the "move this card here" logic lives in this file
 * - When stuff happens, it logs to the debug console
 * 
 * Main functions you can call:
 * - moveCards: move card(s) between the tableau columns
 * - drawOne: draw from stock pile (or recycle if empty)
 * - moveWasteToTableau/moveToFoundation: move the waste card somewhere
 * - applySuggestedMove: let the AI make the move it suggested
 * - suggestMove: ask the AI what to do next
 */
import React, { createContext, useContext, useState } from 'react';
import { initGame } from '../logic/setup.js';
import { 
    canPlace, 
    canPlaceOnFoundation, 
    canDrawFromStock, 
    canRecycleWaste,
    isGameWon 
} from '../logic/rules.js';
import getSuggestion from '../logic/ai.js';
import { debugLog } from '../utils/debug.js';

const GameContext = createContext(null); // single context for all game bits

// debugLog is now centralized in utils/debug.js

export function GameProvider({ children }) {
    const [gameState, setGameState] = useState(() => initGame());
    const { tableaus, foundations, stock, waste } = gameState;
    const [currentSuggestion, setCurrentSuggestion] = useState(null);

    const setTableaus = (updater) => {
        setGameState((prev) => ({
            ...prev,
            tableaus: typeof updater === 'function' ? updater(prev.tableaus) : updater
        }));
    };

    // foundations/stock/waste updates are handled via unified setGameState in action functions

    /**
     * Start a completely new game.
     * Re-shuffles the deck and deals fresh tableau/stock/foundation.
     */
    const resetGame = () => {
        debugLog('🔄 New game started');
        setGameState(initGame());
        setCurrentSuggestion(null); // clear any old hint
    };

    /**
     * Move one or more cards from one tableau column to another.
     * - fromColumn: source tableau index
     * - fromIndex: starting position (moves this card + all below)
     * - toColumn: destination tableau index
     * - opts.silent: skip debug logging (used internally by AI)
     */
    function moveCards(fromColumn, fromIndex, toColumn, opts = {}) {
        const { silent = false } = opts;
        // Clear any existing suggestion highlight after a move attempt
        setCurrentSuggestion(null);
        if (fromColumn === toColumn) return;
        setTableaus((prev) => {
            const newTableaus = prev.map((col) => [...col]);
            const source = newTableaus[fromColumn];
            const dest = newTableaus[toColumn];
            if (!source || !dest) return prev;

            const moving = source.slice(fromIndex);
            if (moving.length === 0) return prev;

            if (!canPlace(moving[0], dest)) return prev;
            
            if (!silent) {
                debugLog(`📤 Move ${moving.length} card(s) from column ${fromColumn + 1} to column ${toColumn + 1}`, { cards: moving.map(c => `${c.rank} of ${c.suit}`) });
            }

            newTableaus[fromColumn] = source.slice(0, fromIndex);

            newTableaus[toColumn] = dest.concat(moving.map((c) => ({ ...c, columnIndex: toColumn })));

            newTableaus[fromColumn].forEach((c, i) => { c.index = i; });
            newTableaus[toColumn].forEach((c, i) => { c.index = i; });

            const srcCol = newTableaus[fromColumn];
            if (srcCol.length > 0) {
                const last = srcCol[srcCol.length - 1];
                if (last && !last.faceUp) {
                    last.faceUp = true;
                }
            }

            return newTableaus;
        });
    }

    /**
     * Draw the next card from stock to waste.
     * If stock is empty, recycles waste back to stock (face-down).
     * opts.silent: skip debug logging
     */
    function drawOne(opts = {}) {
        const { silent = false } = opts;
        // Clear suggestion highlight when user draws or recycles
        setCurrentSuggestion(null);
            setGameState((prev) => {
                // Recycle waste back to stock
                if (canRecycleWaste(prev.stock, prev.waste)) {
                    if (!silent) debugLog('♻️ Recycling waste back to stock');
                    const newStock = prev.waste.map((c) => ({ ...c, faceUp: false }));
                    return { ...prev, stock: newStock, waste: [] };
                }

                // Draw from stock
                if (!canDrawFromStock(prev.stock)) return prev;
                const newStock = prev.stock.slice(0, -1);
                const drawn = prev.stock[prev.stock.length - 1];
                if (!silent) debugLog('🎴 Drew card from stock', { card: `${drawn.rank} of ${drawn.suit}` });
                const toWaste = { ...drawn, faceUp: true };
                const newWaste = [...prev.waste, toWaste];
                return { ...prev, stock: newStock, waste: newWaste };
            });
    }

    // Move waste top card onto a tableau if legal
    function moveWasteToTableau(toColumn, opts = {}) {
        const { silent = false } = opts;
        setCurrentSuggestion(null);
        if (!waste || waste.length === 0) return;
        const top = waste[waste.length - 1];

        const dest = tableaus[toColumn] || [];
        if (!canPlace(top, dest)) return;
        
        if (!silent) {
            debugLog(`📥 Move waste card to column ${toColumn + 1}`, { card: `${top.rank} of ${top.suit}` });
        }

            setGameState((prev) => {
                if (!prev.waste || prev.waste.length === 0) return prev;
                const wasteCopy = prev.waste.slice(0, -1);
                const tableausCopy = prev.tableaus.map((col) => [...col]);
                const cardToMove = { ...top, columnIndex: toColumn, faceUp: true };
                const destCol = tableausCopy[toColumn] || [];
                tableausCopy[toColumn] = destCol.concat(cardToMove);
                tableausCopy[toColumn].forEach((c, i) => { c.index = i; });
                return { ...prev, waste: wasteCopy, tableaus: tableausCopy };
            });
    }

    // Move top tableau card to a foundation pile
    function moveToFoundation(fromColumn, fromIndex, foundationIndex, opts = {}) {
        const { silent = false } = opts;
        setCurrentSuggestion(null);
        // Use functional updates to avoid stale closures for foundations
        setGameState((prev) => {
            const tableausCopy = prev.tableaus.map(col => [...col]);
            const foundationsCopy = prev.foundations.map(f => [...f]);
            const source = tableausCopy[fromColumn];
            if (!source || fromIndex !== source.length - 1) return prev;
            const card = source[fromIndex];
            if (!canPlaceOnFoundation(card, foundationsCopy[foundationIndex])) return prev;
            
            if (!silent) debugLog(`⬆️ Move card to foundation pile ${foundationIndex + 1}`, { card: `${card.rank} of ${card.suit}` });
            
            // Push card to foundation
            foundationsCopy[foundationIndex] = [...foundationsCopy[foundationIndex], { ...card }];
            // Remove from tableau
            tableausCopy[fromColumn] = source.slice(0, fromIndex);
            tableausCopy[fromColumn].forEach((c, i) => { c.index = i; });
            const srcCol = tableausCopy[fromColumn];
            if (srcCol.length > 0) {
                const last = srcCol[srcCol.length - 1];
                if (last && !last.faceUp) last.faceUp = true;
            }
            return { ...prev, tableaus: tableausCopy, foundations: foundationsCopy };
        });
    }

    // Move waste top card to a foundation pile
    function moveWasteToFoundation(foundationIndex, opts = {}) {
        const { silent = false } = opts;
        setCurrentSuggestion(null);
        setGameState((prev) => {
            if (!prev.waste || prev.waste.length === 0) return prev;
            const top = prev.waste[prev.waste.length - 1];
            const foundationsCopy = prev.foundations.map(f => [...f]);
            if (!canPlaceOnFoundation(top, foundationsCopy[foundationIndex])) return prev;
            
            if (!silent) debugLog(`⬆️ Move waste card to foundation pile ${foundationIndex + 1}`, { card: `${top.rank} of ${top.suit}` });
            
            const wasteCopy = prev.waste.slice(0, -1);
            foundationsCopy[foundationIndex] = [...foundationsCopy[foundationIndex], { ...top }];
            return { ...prev, waste: wasteCopy, foundations: foundationsCopy };
        });
    }

    /**
     * Execute the AI's suggested move automatically.
     * Translates the suggestion object into the correct action call.
     * Used by the "Do Suggested Move" button.
     */
    function applySuggestedMove() {
        const m = currentSuggestion;
        if (!m) return false;
        switch (m.type) {
            case 'tableau-to-foundation':
                moveToFoundation(m.fromColumn, m.fromIndex, m.foundationIndex);
                break;
            case 'waste-to-foundation':
                moveWasteToFoundation(m.foundationIndex);
                break;
            case 'tableau-to-tableau':
            case 'tableau-stack-to-tableau':
                moveCards(m.fromColumn, m.fromIndex, m.toColumn);
                break;
            case 'waste-to-tableau':
                moveWasteToTableau(m.toColumn);
                break;
            case 'draw-stock':
            case 'recycle-waste':
                drawOne();
                break;
            default:
                return false;
        }
        setCurrentSuggestion(null);
        return true;
    }

    const checkWin = () => isGameWon(foundations); // tiny wrapper for clarity

    const suggestMove = () => {
        // Ask AI helper for best move then store for UI highlight
        const result = getSuggestion({ tableaus, foundations, stock, waste });
        debugLog('🤖 AI Suggestion generated', { type: result.move?.type, message: result.message });
        setCurrentSuggestion(result.move);
        return result;
    };

    const clearSuggestion = () => setCurrentSuggestion(null); // manual clear button

    return (
        <GameContext.Provider value={{
            tableaus,
            foundations,
            stock,
            waste,
            moveCards,
            drawOne,
            moveWasteToTableau,
            moveToFoundation,
            moveWasteToFoundation,
            applySuggestedMove,
            resetGame,
            checkWin,
            suggestMove,
            clearSuggestion,
            currentSuggestion
        }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const ctx = useContext(GameContext);
    if (!ctx) throw new Error('useGame must be used within GameProvider');
    return ctx;
}

export default useGame;
