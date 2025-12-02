// Stock (draw pile) and Waste (discard pile). Click stock to draw or recycle.
import React from 'react';
import { useGame } from '../hooks/useGame.js';
import Card from './Card.jsx';

export default function StockAndWaste() {
    const { stock, waste, drawOne, currentSuggestion } = useGame();
    const stockCount = stock ? stock.length : 0;
    const wasteTop = waste && waste.length ? waste[waste.length - 1] : null;

    const highlightStock = currentSuggestion && currentSuggestion.type === 'draw-stock';
    const highlightRecycle = currentSuggestion && currentSuggestion.type === 'recycle-waste';
    const stockHighlightClass = highlightStock ? 'ring-4 ring-emerald-400 animate-pulse' : '';
    const wasteHighlightClass = highlightRecycle ? 'ring-4 ring-emerald-400 animate-pulse' : '';

    return (
        <div className="flex items-start gap-4 mb-4">
            <div>
                <div className="mb-1 text-sm text-slate-600">Stock</div>
                <div onClick={drawOne} style={{ cursor: 'pointer' }} className={`transition ${stockHighlightClass}`}>
                    {stockCount > 0 ? (
                        <div className="w-20 h-28 rounded-md border">
                            <img src={`${process.env.PUBLIC_URL || ''}/cards/back.png`} alt="stock" className="w-20 h-28" />
                        </div>
                    ) : (
                        <div className="w-20 h-28 rounded-md border bg-slate-100 flex items-center justify-center">Empty</div>
                    )}
                </div>
            </div>
            <div className={`transition ${wasteHighlightClass}`}>
                <div className="mb-1 text-sm text-slate-600">Waste</div>
                <div>
                    {wasteTop ? (
                        <Card card={wasteTop} colIndex={'waste'} cardIndex={waste.length - 1} />
                    ) : (
                        <div className="w-20 h-28 rounded-md border bg-slate-100 flex items-center justify-center">Empty</div>
                    )}
                </div>
            </div>
        </div>
    );
}
