// Board layout tying everything together. Keeps render simple.
import React, { useEffect, useState } from 'react';
import Tableau from './Tableau.jsx';
import { useGame } from '../hooks/useGame.js';
import StockAndWaste from './StockAndWaste.jsx';
import Foundations from './Foundations.jsx';
import ControlsBar from './ControlsBar.jsx';

export default function GameBoard() {
    const { tableaus, checkWin, foundations, resetGame } = useGame();
    const [showWinModal, setShowWinModal] = useState(false);

    useEffect(() => {
        if (checkWin()) {
            setShowWinModal(true);
        } else {
            setShowWinModal(false);
        }
    }, [foundations, checkWin]);

    return (
        <div className="w-full">
            <div className="flex flex-wrap gap-4 justify-center mb-4">
                <StockAndWaste />
                <Foundations />
            </div>
            <ControlsBar />
            <div className="flex flex-wrap gap-3 justify-center w-full">
                {tableaus.map((col, i) => (
                    <Tableau key={i} cards={col} colIndex={i} />
                ))}
            </div>
            
            {showWinModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
                        <h2 className="text-3xl font-bold text-green-600 mb-4">🎉 You Won! 🎉</h2>
                        <p className="text-lg text-slate-700 mb-6">
                            Congratulations! You've successfully completed the game by moving all cards to the foundation piles!
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    resetGame();
                                    setShowWinModal(false);
                                }}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                            >
                                New Game
                            </button>
                            <button
                                onClick={() => setShowWinModal(false)}
                                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
