import { AnimatedNumber } from './AnimatedNumber';
import { visibleScores } from '../game/engine';
import { PLAYER_KEYS } from '../game/keys';
import { GameState } from '../game/types';

/** Player panels: name, score, and what they're up to on the current question. */
export const Scoreboard = ({ state }: { state: GameState }) => {
  const { phase, settings, results, index } = state;
  const scores = visibleScores(state);
  const best = Math.max(...scores);
  const current = results[index] ?? [];

  return (
    <div className={`scoreboard players-${settings.playerCount}`}>
      {scores.map((score, p) => {
        const answer = current[p];
        const leading = settings.playerCount > 1 && score > 0 && score === best && scores.filter(s => s === best).length === 1;

        let status: string;
        let statusClass = '';
        let panelClass = '';
        if (phase === 'intro') status = 'Get ready…';
        else if (phase === 'question') {
          status = answer ? 'Locked in!' : 'Thinking…';
          statusClass = answer ? 'locked' : '';
          panelClass = answer ? 'is-locked' : 'is-thinking';
        } else if (phase === 'reveal') {
          if (!answer) [status, statusClass, panelClass] = ["Time's up", 'wrong', 'is-wrong'];
          else if (answer.correct)
            [status, statusClass, panelClass] = [`+${answer.points}  ·  ${(answer.elapsedMs / 1000).toFixed(2)}s`, 'right', 'is-right'];
          else [status, statusClass, panelClass] = ['Wrong!', 'wrong', 'is-wrong'];
        } else status = '';

        return (
          <div className={`player-panel p${p + 1} ${panelClass}`} key={p}>
            <div className="name">
              {leading && <span title="In the lead">👑</span>}
              {settings.names[p]}
            </div>
            <div className="score">
              <AnimatedNumber value={score} />
            </div>
            <div className={`status ${statusClass}`} key={status}>
              {status}
            </div>
            {settings.playerCount > 1 && (
              <div className="keycaps small">
                {PLAYER_KEYS[p].labels.map(k => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
