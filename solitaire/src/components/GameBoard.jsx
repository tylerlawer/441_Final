// Board layout tying everything together. Keeps render simple.
import React from 'react';
import Tableau from './Tableau.jsx';
import { useGame } from '../hooks/useGame.js';
import StockAndWaste from './StockAndWaste.jsx';
import Foundations from './Foundations.jsx';
import ControlsBar from './ControlsBar.jsx';

export default function GameBoard() {
    const { tableaus } = useGame();
    return (
        <div>
            <div className="flex justify-between mb-4">
                <StockAndWaste />
                <Foundations />
            </div>
            <ControlsBar />
            <div className="flex gap-4">
                {tableaus.map((col, i) => (
                    <Tableau key={i} cards={col} colIndex={i} />
                ))}
            </div>
        </div>
    );
}
