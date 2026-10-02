import { statsFor } from '../game/engine';
import { GameState } from '../game/types';

interface Props {
  state: GameState;
  onRematch: () => void;
  onNewGame: () => void;
}

const secs = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(2)}s`);

export const FinalScreen = ({ state, onRematch, onNewGame }: Props) => {
  const { settings, questions } = state;
  const stats = Array.from({ length: settings.playerCount }, (_, p) => statsFor(state, p));
  const top = Math.max(...stats.map(s => s.score));
  const winners = stats.filter(s => s.score === top);

  let headline: string;
  if (settings.playerCount === 1) headline = 'Final score';
  else if (winners.length > 1) headline = "It's a tie!";
  else headline = `${winners[0].name} wins!`;

  return (
    <div className="final screen">
      <h2 className="headline">{headline}</h2>

      <div className={`final-cards players-${settings.playerCount}`}>
        {stats.map((s, p) => (
          <div className={`final-card p${p + 1} ${settings.playerCount > 1 && s.score === top ? 'winner' : ''}`} key={p}>
            <div className="name">{s.name}</div>
            <div className="score">{s.score.toLocaleString()}</div>
            <dl>
              <dt>Correct</dt>
              <dd>
                {s.correct} / {questions.length}
              </dd>
              <dt>Fastest correct</dt>
              <dd>{secs(s.fastestMs)}</dd>
              <dt>Avg. correct</dt>
              <dd>{secs(s.averageCorrectMs)}</dd>
            </dl>
          </div>
        ))}
      </div>

      <div className="final-actions">
        <button className="big-button" onClick={onRematch}>
          {settings.playerCount > 1 ? 'Rematch' : 'Play again'} <kbd>enter</kbd>
        </button>
        <button className="link-button" onClick={onNewGame}>
          Change players / settings
        </button>
      </div>
    </div>
  );
};
