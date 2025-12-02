/**
 * Debug panel - shows you what's happening under the hood
 * 
 * What you can do:
 * - Watch live logs of everything (card moves, draws, AI thinking)
 * - Test the win screen without actually finishing a game
 * - Clear the logs when they get too messy
 * - See exactly how the AI picks its moves
 * 
 * Pops out from the right side when you click the bug button
 * (button is in the bottom-left so it doesn't cover the cards)
 */
import React, { useState, useEffect } from 'react';
import { setDebugLogger } from '../utils/debug.js';

export default function DebugMenu({ onOpenChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [showTestWinModal, setShowTestWinModal] = useState(false);

    const log = (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, data };
        setLogs(prev => [...prev, logEntry]);
        console.log(`[DEBUG ${timestamp}] ${message}`, data || '');
    };

    // Subscribe to game events
    useEffect(() => {
        setDebugLogger(log);
        return () => setDebugLogger(null);
    }, []);
    
    // Notify parent of open state changes
    useEffect(() => {
        if (onOpenChange) onOpenChange(isOpen);
    }, [isOpen, onOpenChange]);

    const clearLogs = () => setLogs([]);

    // Test win screen
    const testWinScreen = () => {
        log('=== TESTING WIN SCREEN ===');
        log('Opening test win modal...');
        setShowTestWinModal(true);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 left-4 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition z-50"
            >
                🐛 Debug
            </button>
        );
    }

    return (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl flex flex-col z-40 border-l-4 border-purple-600">
            {/* Header */}
            <div className="bg-purple-600 text-white px-4 py-3 flex justify-between items-center">
                <h2 className="text-lg font-bold">🐛 Debug Console</h2>
                <button
                    onClick={() => setIsOpen(false)}
                    className="px-2 py-1 bg-purple-700 rounded hover:bg-purple-800 transition text-sm"
                >
                    Hide
                </button>
            </div>

            {/* Controls */}
            <div className="px-4 py-3 border-b bg-gray-50">
                <button 
                    onClick={testWinScreen} 
                    className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold mb-2 text-sm"
                >
                    🎉 Test Win Screen
                </button>
                <button 
                    onClick={clearLogs} 
                    className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold text-sm"
                >
                    🗑️ Clear Logs
                </button>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-900 font-mono text-xs">
                {logs.length === 0 ? (
                    <div className="text-gray-500 text-center py-8 text-xs">
                        No logs yet. Click a button above to test functions.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {logs.map((entry, idx) => (
                            <div key={idx} className="border-b border-gray-700 pb-2">
                                <div className="text-gray-400 mb-1">
                                    [{entry.timestamp}] {entry.message}
                                </div>
                                {entry.data && (
                                    <pre className="text-green-400 ml-2 overflow-x-auto text-xs">
                                        {JSON.stringify(entry.data, null, 2)}
                                    </pre>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Test Win Modal */}
            {showTestWinModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
                    <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
                        <h2 className="text-3xl font-bold text-green-600 mb-4">🎉 You Won! 🎉</h2>
                        <p className="text-lg text-slate-700 mb-4">
                            Congratulations! You've successfully completed the game by moving all cards to the foundation piles!
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            (This is a test modal from the debug menu)
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    log('Test: New Game button clicked');
                                    setShowTestWinModal(false);
                                }}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                            >
                                New Game
                            </button>
                            <button
                                onClick={() => {
                                    log('Test: Close button clicked');
                                    setShowTestWinModal(false);
                                }}
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
