// Tableau column: accepts legal drops. highlightClass pulses for suggested destination.
import { useCallback, useMemo } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "../dndTypes.js";
import Card from "./Card.jsx"; 
import { canPlace } from "../logic/rules.js";
import { useGame } from "../hooks/useGame.js";

export default function Tableau({ cards, colIndex }) {
    const { moveCards, moveWasteToTableau, currentSuggestion } = useGame();

    const canDropCard = useCallback((item) => canPlace(item.card, cards), [cards]); // basic rule check

    const handleDrop = useCallback((item, monitor) => {
        if (!monitor.canDrop()) return;
        
        if (item.fromWaste) {
            moveWasteToTableau(colIndex);
        } else if (item.fromColumn !== undefined && item.fromIndex !== undefined) {
            moveCards(item.fromColumn, item.fromIndex, colIndex);
        }
    }, [colIndex, moveCards, moveWasteToTableau]);

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.CARD,
        canDrop: canDropCard,
        drop: handleDrop,
        collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }), [canDropCard, handleDrop]);

    const isSuggestedDestination = useMemo(() => {
        if (!currentSuggestion) return false;
        if (currentSuggestion.type === 'tableau-to-tableau' && currentSuggestion.toColumn === colIndex) return true;
        if (currentSuggestion.type === 'tableau-stack-to-tableau' && currentSuggestion.toColumn === colIndex) return true;
        if (currentSuggestion.type === 'waste-to-tableau' && currentSuggestion.toColumn === colIndex) return true;
        return false;
    }, [currentSuggestion, colIndex]);

    const highlightClass = isSuggestedDestination ? 'ring-4 ring-emerald-400 animate-pulse' : ''; // green ring = AI target

    return (
        <div
            ref={drop}
            className={`relative w-20 md:w-24 lg:w-28 min-h-[6rem] rounded-md border-2 ${isOver && canDrop ? 'border-green-500' : 'border-transparent'} ${highlightClass}`}>
            {cards.map((c, i) => (
                <Card key={c.id} card={c} colIndex={colIndex} cardIndex={i} style={{ top: `${i * 20}px`, zIndex: i }} />
            ))}
        </div>
    );
}