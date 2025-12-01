import React, { createContext, useContext, useState } from 'react';
import { initGame } from '../logic/setup.js';
import { canPlace } from '../logic/rules.js';

const GameContext = createContext(null);

export function GameProvider({ children }) {
    const initial = initGame();
    const [tableaus, setTableaus] = useState(initial.tableaus);
    const [foundations] = useState(initial.foundations);
    const [stock, setStock] = useState(initial.stock);
    const [waste, setWaste] = useState(initial.waste);

    function moveCards(fromColumn, fromIndex, toColumn) {
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

    function drawOne() {
        setStock((prevStock) => {
            if (!prevStock || prevStock.length === 0) {
                setWaste((prevWaste) => {
                    if (!prevWaste || prevWaste.length === 0) return [];
                    const newStock = prevWaste.map((c) => ({ ...c, faceUp: false }));
                    setStock(newStock);
                    return [];
                });
                return [];
            }

            const newStock = prevStock.slice(0, -1);
            const drawn = prevStock[prevStock.length - 1];
            const toWaste = { ...drawn, faceUp: true };
            setWaste((prev) => [...prev, toWaste]);
            return newStock;
        });
    }

    function moveWasteToTableau(toColumn) {
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

    return (
        <GameContext.Provider value={{ tableaus, foundations, stock, waste, moveCards, drawOne, moveWasteToTableau }}>
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
