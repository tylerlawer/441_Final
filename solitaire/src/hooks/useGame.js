// @ts-nocheck
// Main game state hook/provider. Components call useGame() for shared state.
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

    // foundations updates are now handled via unified setGameState in moveToFoundation/moveWasteToFoundation

    const setStock = (updater) => {
        setGameState((prev) => ({
            ...prev,
            stock: typeof updater === 'function' ? updater(prev.stock) : updater
        }));
    };

    const setWaste = (updater) => {
        setGameState((prev) => ({
            ...prev,
            waste: typeof updater === 'function' ? updater(prev.waste) : updater
        }));
    };

    const resetGame = () => {
        // Re-shuffle and rebuild everything
        debugLog('🔄 New game started');
        setGameState(initGame());
        setCurrentSuggestion(null); // clear any old hint
    };

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

    // Draw a card from stock OR recycle waste if stock empty
    function drawOne(opts = {}) {
        const { silent = false } = opts;
        // Clear suggestion highlight when user draws or recycles
        setCurrentSuggestion(null);
        setStock((prevStock) => {
            // Try to recycle waste if stock is empty
            if (canRecycleWaste(prevStock, waste)) {
                if (!silent) debugLog('♻️ Recycling waste back to stock');
                setWaste((prevWaste) => {
                    if (!prevWaste || prevWaste.length === 0) return [];
                    const newStock = prevWaste.map((c) => ({ ...c, faceUp: false }));
                    setStock(newStock);
                    return [];
                });
                return [];
            }

            // Draw from stock if available
            if (!canDrawFromStock(prevStock)) return prevStock;

            const newStock = prevStock.slice(0, -1);
            const drawn = prevStock[prevStock.length - 1];
            if (!silent) debugLog(`🎴 Drew card from stock`, { card: `${drawn.rank} of ${drawn.suit}` });
            const toWaste = { ...drawn, faceUp: true };
            setWaste((prev) => [...prev, toWaste]);
            return newStock;
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

        setWaste((prevWaste) => prevWaste.slice(0, -1));

        setTableaus((prev) => {
            const newTableaus = prev.map((col) => [...col]);
            const destCol = newTableaus[toColumn] || [];
            const cardToMove = { ...top, columnIndex: toColumn, faceUp: true };
            newTableaus[toColumn] = destCol.concat(cardToMove);
            newTableaus[toColumn].forEach((c, i) => { c.index = i; });
            return newTableaus;
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

    // Apply the currently suggested move programmatically
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
