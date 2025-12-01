import { useCallback } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "../dndTypes.js";
import Card from "./Card.jsx"; 
import { canPlace } from "../logic/rules.js";
import { useGame } from "../hooks/useGame.js";

export default function Tableau({ cards, colIndex }) {
    const { moveCards, moveWasteToTableau } = useGame();

    const canDropCard = useCallback((item) => canPlace(item.card, cards), [cards]);

    const handleDrop = useCallback((item, monitor) => {
        if (!monitor.canDrop()) return;
        
        if (item.fromColumn === 'waste') {
            moveWasteToTableau(colIndex);
        } else {
            moveCards(item.fromColumn, item.fromIndex, colIndex);
        }
    }, [colIndex, moveCards, moveWasteToTableau]);

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.CARD,
        canDrop: canDropCard,
        drop: handleDrop,
        collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }), [canDropCard, handleDrop]);

    return (
        <div
            ref={drop}
            className={`w-20 md:w-24 lg:w-28 min-h-[6rem] rounded-md border-2 ${isOver && canDrop ? 'border-green-500' : 'border-transparent' }`}>
            {cards.map((c, i) => (
                <Card key={c.id} card={c} colIndex={colIndex} cardIndex={i} style={{ top: `${i * 20}px`, zIndex: i }} />
            ))}
        </div>
    );
}