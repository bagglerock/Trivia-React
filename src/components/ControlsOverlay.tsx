import { useState } from 'react';
import { ANSWER_LETTERS, PLAYER_KEYS } from '../game/keys';

const HOME_ROW = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'];

interface Props {
  initialPlayers: 1 | 2;
  names: [string, string];
  onClose: () => void;
}

export const ControlsOverlay = ({ initialPlayers, names, onClose }: Props) => {
  const [players, setPlayers] = useState<1 | 2>(initialPlayers);
  const owner = (key: string) => PLAYER_KEYS.findIndex(p => p.labels.includes(key));

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="controls-title">
      <div className="overlay-card controls" onClick={e => e.stopPropagation()}>
        <h2 id="controls-title">Controls</h2>

        <div className="segmented">
          {([1, 2] as const).map(n => (
            <button type="button" key={n} className={players === n ? 'active' : ''} onClick={() => setPlayers(n)}>
              {n === 1 ? 'Solo' : 'Head to head'}
            </button>
          ))}
        </div>

        <div className={`keyboard players-${players}`} aria-hidden="true">
          {HOME_ROW.map(k => {
            const p = owner(k);
            const active = p !== -1;
            return (
              <kbd key={k} className={active ? (players === 1 ? 'p1' : `p${p + 1}`) : 'idle'}>
                {k}
                {active && <small>{ANSWER_LETTERS[PLAYER_KEYS[p].labels.indexOf(k)]}</small>}
              </kbd>
            );
          })}
        </div>

        {players === 1 ? (
          <div className="control-columns">
            <div className="control-block p1">
              <h3>Answer A · B · C · D</h3>
              <p>
                Left hand <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd>, right hand <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> <kbd>;</kbd>,
                or <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> — or just click / tap an answer.
              </p>
            </div>
          </div>
        ) : (
          <div className="control-columns two">
            {[0, 1].map(p => (
              <div className={`control-block p${p + 1}`} key={p}>
                <h3>
                  {names[p]} <span>· {p === 0 ? 'left hand' : 'right hand'}</span>
                </h3>
                <ul>
                  {PLAYER_KEYS[p].labels.map((k, i) => (
                    <li key={k}>
                      <kbd>{k}</kbd> answer {ANSWER_LETTERS[i]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <ul className="control-general">
          <li>First answer locks in — no take-backs</li>
          <li>
            <kbd>space</kbd> next question
          </li>
          <li>
            <kbd>enter</kbd> rematch
          </li>
          <li>
            <kbd>M</kbd> sound on / off
          </li>
          <li>
            <kbd>esc</kbd> pause
          </li>
          <li>
            <kbd>?</kbd> show / hide this
          </li>
        </ul>

        <button className="big-button" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
};
