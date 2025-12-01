function makeDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['ace','2','3','4','5','6','7','8','9','10','jack','queen','king'];
    const deck = [];
    let id = 1;
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ id: id++, suit, rank, faceUp: false, index: null, columnIndex: null });
        }
    }
    return deck;
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function initGame() {
    const deck = shuffle(makeDeck());

    const tableaus = Array.from({ length: 7 }, () => []);
    let offset = 0;
    for (let col = 0; col < 7; col++) {
        for (let i = 0; i <= col; i++) {
            const card = deck[offset++];
            card.columnIndex = col;
            card.index = i;
            card.faceUp = (i === col);
            tableaus[col].push(card);
        }
    }

    const stock = deck.slice(offset).map((c) => ({ ...c }));
    const waste = [];

    const foundations = Array.from({ length: 4 }, () => []);

    return { tableaus, foundations, stock, waste };
}

export default initGame;
