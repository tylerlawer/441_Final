export default function Card({ rank, suit, faceUp }) {
    return (
            <button type="button">
                <img class="w-16 md:w-20 lg:w-24"
                src={faceUp ? `/cards/${rank}_of_${suit}.svg` : '/cards/back.png'}
                alt={`${rank} of ${suit}`} />
            </button>
    )
}