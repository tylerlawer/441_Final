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

const GameContext = createContext(null); // single context for all game bits

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

    const setFoundations = (updater) => {
        setGameState((prev) => ({
            ...prev,
            foundations: typeof updater === 'function' ? updater(prev.foundations) : updater
        }));
    };

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
        setGameState(initGame());
        setCurrentSuggestion(null); // clear any old hint
    };

    function moveCards(fromColumn, fromIndex, toColumn) {
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
    function drawOne() {
        // Clear suggestion highlight when user draws or recycles
        setCurrentSuggestion(null);
        setStock((prevStock) => {
            // Try to recycle waste if stock is empty
            if (canRecycleWaste(prevStock, waste)) {
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
            const toWaste = { ...drawn, faceUp: true };
            setWaste((prev) => [...prev, toWaste]);
            return newStock;
        });
    }

    // Move waste top card onto a tableau if legal
    function moveWasteToTableau(toColumn) {
        setCurrentSuggestion(null);
        if (!waste || waste.length === 0) return;
        const top = waste[waste.length - 1];

        const dest = tableaus[toColumn] || [];
        if (!canPlace(top, dest)) return;

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
    function moveToFoundation(fromColumn, fromIndex, foundationIndex) {
        setCurrentSuggestion(null);
        setTableaus((prevTableaus) => {
            const newTableaus = prevTableaus.map((col) => [...col]);
            const source = newTableaus[fromColumn];
            if (!source || fromIndex !== source.length - 1) return prevTableaus;

            const card = source[fromIndex];

            if (!canPlaceOnFoundation(card, foundations[foundationIndex])) return prevTableaus;

            setFoundations((prevFoundations) => {
                const newFoundations = prevFoundations.map((f) => [...f]);
                newFoundations[foundationIndex] = [...newFoundations[foundationIndex], { ...card }];
                return newFoundations;
            });

            newTableaus[fromColumn] = source.slice(0, fromIndex);
            newTableaus[fromColumn].forEach((c, i) => { c.index = i; });

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

    // Move waste top card to a foundation pile
    function moveWasteToFoundation(foundationIndex) {
        setCurrentSuggestion(null);
        if (!waste || waste.length === 0) return;
        const top = waste[waste.length - 1];

        if (!canPlaceOnFoundation(top, foundations[foundationIndex])) return;

        setWaste((prevWaste) => prevWaste.slice(0, -1));
        setFoundations((prevFoundations) => {
            const newFoundations = prevFoundations.map((f) => [...f]);
            newFoundations[foundationIndex] = [...newFoundations[foundationIndex], { ...top }];
            return newFoundations;
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
