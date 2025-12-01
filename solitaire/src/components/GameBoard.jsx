import React from 'react';
import Tableau from './Tableau.jsx';
import { useGame } from '../hooks/useGame.js';
import StockAndWaste from './StockAndWaste.jsx';

export default function GameBoard() {
    const { tableaus } = useGame();

    return (
        <div>
            <StockAndWaste />
            <div className="flex gap-4">
                {tableaus.map((col, i) => (
                    <Tableau key={i} cards={col} colIndex={i} />
                ))}
            </div>
        </div>
    );
}
