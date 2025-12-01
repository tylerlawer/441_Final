import { GameProvider } from './hooks/useGame.js';
import GameBoard from './components/GameBoard.jsx';

export default function App() {
    return (
        <GameProvider>
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
              <div className="p-6 rounded-xl bg-white shadow-xl">
                <p className="mb-4 text-xl font-bold text-slate-800">Solitaire</p>
                <GameBoard />
              </div>
            </div>
        </GameProvider>
    );
}
