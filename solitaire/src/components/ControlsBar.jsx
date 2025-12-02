// Controls: suggest move, apply suggested move, clear highlight, new game. Hint stored locally.
import React, { useState, useEffect } from 'react';
import { useGame } from '../hooks/useGame.js';

export default function ControlsBar() {
    const { applySuggestedMove, resetGame, suggestMove, clearSuggestion, currentSuggestion } = useGame();
    const [hint, setHint] = useState(null); // message from AI explainMove

    // Auto-clear hint text when suggestion is cleared
    useEffect(() => {
        if (!currentSuggestion) {
            setHint(null);
        }
    }, [currentSuggestion]);

    function handleSuggest() {
        // Ask AI for best move, store message so user sees explanation
        const result = suggestMove();
        setHint(result.message);
    }

    function handleClearHint() {
        clearSuggestion();
        // hint will be cleared by useEffect automatically
    }

    function handleApplySuggested() {
        applySuggestedMove();
        // hint will be cleared by useEffect automatically
    }

    return (
        <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
                <button
                    onClick={handleSuggest}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Suggest Move
                </button>
                <button
                    onClick={handleApplySuggested}
                    disabled={!currentSuggestion}
                    className={`px-4 py-2 rounded text-white transition ${currentSuggestion ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-300 cursor-not-allowed'}`}
                >
                    Do Suggested Move
                </button>
                {currentSuggestion && (
                    <button
                        onClick={handleClearHint}
                        className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition"
                    >
                        Clear Highlight
                    </button>
                )}
                <button
                    onClick={resetGame}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                    New Game
                </button>
            </div>
            {hint && (
                <div className="text-sm text-slate-700 bg-slate-100 rounded px-3 py-2" role="status">
                    {hint}
                </div>
            )}
        </div>
    );
}
