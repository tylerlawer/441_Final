export function canPlace(card, destinationCards) {
    if (!card) return false;

    const rankToNumber = (r) => {
        if (typeof r === 'number') return r;
        if (!r) return NaN;
        const s = String(r).toLowerCase();
        if (s === 'ace' || s === 'a') return 1;
        if (s === 'jack' || s === 'j') return 11;
        if (s === 'queen' || s === 'q') return 12;
        if (s === 'king' || s === 'k') return 13;
        const n = parseInt(s, 10);
        return Number.isNaN(n) ? NaN : n;
    };

    const cardRank = rankToNumber(card.rank);

    const colorOf = (suit) => {
        if (!suit) return null;
        const su = String(suit).toLowerCase();
        if (su === 'hearts' || su === 'diamonds') return 'red';
        if (su === 'clubs' || su === 'spades') return 'black';
        return null;
    };

    const destIsFoundation = Boolean(destinationCards && destinationCards.isFoundation);
    const destLen = Array.isArray(destinationCards) ? destinationCards.length : 0;

    if (destIsFoundation) {
        if (destLen === 0) return cardRank === 1;
        const top = destinationCards[destLen - 1];
        if (!top) return false;
        const topRank = rankToNumber(top.rank);

        return top.suit === card.suit && cardRank === topRank + 1;
    }

    if (destLen === 0) {
        return cardRank === 13;
    }

    const top = destinationCards[destLen - 1];
    if (!top) return false;
    const topRank = rankToNumber(top.rank);
    const topColor = colorOf(top.suit);
    const cardColor = colorOf(card.suit);

    return topColor && cardColor && topColor !== cardColor && cardRank === topRank - 1;
}

export function onMoveCard(item, toColIndex) {
    if (!item || !item.card) return null;
    const card = item.card;

    card.columnIndex = toColIndex;

    if (typeof item.toIndex === 'number') {
        card.index = item.toIndex;
    } else if (typeof item.fromIndex === 'number' && item.fromColumn === toColIndex) {
        card.index = item.fromIndex;
    } else if (Array.isArray(item.destinationCards)) {
        card.index = item.destinationCards.length;
    } else {
        card.index = 0;
    }

    return card;
}