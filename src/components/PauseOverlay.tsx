import { GameState } from '../game/types';

interface Props {
  state: GameState;
  onResume: () => void;
  onQuit: () => void;
  onShowControls: () => void;
}

export const PauseOverlay = ({ state, onResume, onQuit, onShowControls }: Props) => {
  const { phase, index, questions } = state;

  return (
    <div className="overlay pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="overlay-card pause">
        <h2 id="pause-title">Paused</h2>
        <p className="pause-where">
          {phase === 'loading' ? 'Getting questions…' : `Question ${index + 1} of ${questions.length} · clock stopped`}
        </p>

        <button className="big-button" onClick={onResume} autoFocus>
          Resume <kbd>esc</kbd>
        </button>

        <div className="pause-actions">
          <button className="link-button" onClick={onShowControls}>
            Controls
          </button>
          <button className="link-button danger" onClick={onQuit}>
            Quit to menu <kbd>Q</kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
