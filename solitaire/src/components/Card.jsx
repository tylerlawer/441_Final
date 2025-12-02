// Card component using react-dnd. Drag item encodes origin for rule checks.
import { useDrag } from 'react-dnd';
import { ItemTypes } from "../dndTypes.js";
import { canDragCard } from "../logic/rules.js";
import { useGame } from '../hooks/useGame.js';

export default function Card({ card, colIndex, cardIndex, style, onClick, isDraggable = true }) {
    const { currentSuggestion, waste } = useGame();
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CARD,
        item: () => {
            if (colIndex === 'waste') return { card, fromWaste: true }; // waste card
            return { card, fromColumn: colIndex, fromIndex: cardIndex }; // tableau card
        },
        canDrag: () => isDraggable && canDragCard(card), // only face up cards etc
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }), [card, colIndex, cardIndex, isDraggable]);

    const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    const rankPart = card && card.rank ? String(card.rank).toLowerCase().replace(/\s+/g, '_') : '';
    const suitPart = card && card.suit ? String(card.suit).toLowerCase().replace(/\s+/g, '_') : '';

    const frontImage = card && card.image ? card.image : `${base}/cards/${rankPart}_of_${suitPart}.svg`;
    const backImage = `${base}/cards/back.png`;
    const src = card && card.faceUp ? frontImage : backImage;

    // Determine if this card is part of the suggested source (single card or entire stack)
    let isSuggestedSource = false;
    if (currentSuggestion) {
        const t = currentSuggestion.type;
        if (t === 'tableau-to-tableau' || t === 'tableau-to-foundation') {
            if (colIndex === currentSuggestion.fromColumn && cardIndex === currentSuggestion.fromIndex) {
                isSuggestedSource = true;
            }
        } else if (t === 'tableau-stack-to-tableau') {
            if (colIndex === currentSuggestion.fromColumn && cardIndex >= currentSuggestion.fromIndex) {
                isSuggestedSource = true; // highlight whole movable stack
            }
        } else if (t === 'waste-to-foundation' || t === 'waste-to-tableau') {
            if (colIndex === 'waste' && waste && waste.length - 1 === cardIndex) {
                isSuggestedSource = true;
            }
        }
    }

    const sourceHighlight = isSuggestedSource ? 'ring-4 ring-purple-500 animate-pulse' : '';

    return (
        <button
            type="button"
            ref={drag}
            onClick={onClick}
            style={style}
            className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : '' } ${sourceHighlight}`}>
            <img
                className="w-16 md:w-20 lg:w-24"
                src={src}
                alt={card ? `${card.rank} of ${card.suit}` : 'card'}
                onError={(e) => { e.currentTarget.src = backImage; }}
            />
        </button>
    );
}