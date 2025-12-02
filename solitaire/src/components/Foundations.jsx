// Foundation piles (build up A->K by suit). Shows amber ring when suggested.
import React from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../dndTypes.js';
import Card from './Card.jsx';
import { useGame } from '../hooks/useGame.js';
import { canPlaceOnFoundation } from '../logic/rules.js';

function FoundationPile({ cards, foundationIndex }) {
    const { moveToFoundation, moveWasteToFoundation, tableaus, currentSuggestion } = useGame();

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.CARD,
        canDrop: (item) => {
            if (!item || !item.card) return false;
            if (item.fromWaste) return canPlaceOnFoundation(item.card, cards);
            if (item.fromColumn !== undefined && item.fromIndex !== undefined) {
                const column = tableaus[item.fromColumn];
                if (!column || item.fromIndex !== column.length - 1) return false; // must be top card
                return canPlaceOnFoundation(item.card, cards);
            }
            return false;
        },
        drop: (item) => {
            if (item.fromWaste) {
                moveWasteToFoundation(foundationIndex);
            } else if (item.fromColumn !== undefined && item.fromIndex !== undefined) {
                moveToFoundation(item.fromColumn, item.fromIndex, foundationIndex);
            }
        },
        collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }), [foundationIndex, moveToFoundation, moveWasteToFoundation, tableaus, cards]);

    const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
    const backgroundColor = isOver && canDrop ? 'bg-green-200' : isOver ? 'bg-red-200' : 'bg-slate-100';

    const isSuggestedFoundation = currentSuggestion && (
        (currentSuggestion.type === 'tableau-to-foundation' && currentSuggestion.foundationIndex === foundationIndex) ||
        (currentSuggestion.type === 'waste-to-foundation' && currentSuggestion.foundationIndex === foundationIndex)
    );
    const highlightClass = isSuggestedFoundation ? 'ring-4 ring-amber-400 animate-pulse' : '';

    return (
        <div
            ref={drop}
            className={`relative w-20 h-28 rounded border-2 border-dashed border-slate-300 flex items-center justify-center ${backgroundColor} ${highlightClass}`}
        >
            {topCard ? <Card card={topCard} isDraggable={false} /> : <span className="text-slate-400 text-xs">A</span>}
        </div>
    );
}

export default function Foundations() {
    const { foundations } = useGame();
    return (
        <div className="flex gap-2">
            {foundations.map((pile, i) => (
                <FoundationPile key={i} cards={pile} foundationIndex={i} />
            ))}
        </div>
    );
}
