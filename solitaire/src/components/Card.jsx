import { useDrag } from 'react-dnd';
import { ItemTypes } from "../dndTypes.js";

export default function Card({ card, colIndex, cardIndex, style, onClick }) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CARD,
        item: { card, fromColumn: colIndex, fromIndex: cardIndex },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [card, colIndex, cardIndex]);

    const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

    const rankPart = card && card.rank ? String(card.rank).toLowerCase().replace(/\s+/g, '_') : '';
    const suitPart = card && card.suit ? String(card.suit).toLowerCase().replace(/\s+/g, '_') : '';

    const frontImage = card && card.image
        ? card.image
        : `${base}/cards/${rankPart}_of_${suitPart}.svg`;
    const backImage = `${base}/cards/back.png`;

    const src = card && card.faceUp ? frontImage : backImage;

    return (
        <button
            type="button"
            ref={drag}
            onClick={onClick}
            style={style}
            className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : '' }`}>
            <img
                className="w-16 md:w-20 lg:w-24"
                src={src}
                alt={card ? `${card.rank} of ${card.suit}` : 'card'}
                onError={(e) => { e.currentTarget.src = backImage; }}
            />
        </button>
    )
}