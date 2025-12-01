import React from 'react';
import { useGame } from '../hooks/useGame.js';
import Card from './Card.jsx';

export default function StockAndWaste() {
    const { stock, waste, drawOne } = useGame();

    const stockCount = stock ? stock.length : 0;
    const wasteTop = waste && waste.length ? waste[waste.length - 1] : null;

    return (
        <div className="flex items-start gap-4 mb-4">
            <div>
                <div className="mb-1 text-sm text-slate-600">Stock</div>
                <div onClick={drawOne} style={{ cursor: 'pointer' }}>
                    {stockCount > 0 ? (
                        <div className="w-20 h-28 rounded-md border">
                            <img src={`${process.env.PUBLIC_URL || ''}/cards/back.png`} alt="stock" className="w-20 h-28" />
                        </div>
                    ) : (
                        <div className="w-20 h-28 rounded-md border bg-slate-100 flex items-center justify-center">Empty</div>
                    )}
                </div>
            </div>

            <div>
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
