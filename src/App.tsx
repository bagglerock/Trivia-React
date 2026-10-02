import { ControlsOverlay } from './components/ControlsOverlay';
import { FinalScreen } from './components/FinalScreen';
import { RoundScreen } from './components/RoundScreen';
import { SetupScreen } from './components/SetupScreen';
import { useEffect, useState } from 'react';
import { isMuted, setMuted } from './game/sounds';
import { useGame } from './game/useGame';
import { useSoundEffects } from './game/useSoundEffects';

export const App = () => {
  const [showControls, setShowControls] = useState(false);
  const { state, start, answer, next, rematch, newGame } = useGame(showControls);
  const { phase } = state;
  useSoundEffects(state);

  const [muted, setMutedState] = useState(isMuted);
  const toggleMute = () =>
    setMutedState(m => {
      setMuted(!m);
      return !m;
    });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'KeyM') toggleMute();
      else if (e.code === 'Slash' || e.key === '?' || e.code === 'KeyH') setShowControls(s => !s);
      else if (e.code === 'Escape') setShowControls(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={`app phase-${phase}`}>
      <header className="header">
        <h1 aria-label="Trivia">
          {'Trivia'.split('').map((c, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>
              {c}
            </span>
          ))}
        </h1>
        <button className="help-button" onClick={() => setShowControls(true)} title="Controls (?)">
          ?
        </button>
        <button className="mute-button" onClick={toggleMute} aria-pressed={muted} title={muted ? 'Sound off (M)' : 'Sound on (M)'}>
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <main className="main">
        {state.usingBackupQuestions && phase !== 'setup' && (
          <div className="notice">Couldn't reach the question server — playing with the backup question set.</div>
        )}

        {phase === 'setup' && <SetupScreen onStart={start} error={state.error} />}
        {phase === 'loading' && (
          <div className="loading screen">
            <h2>Pouring the questions…</h2>
          </div>
        )}
        {(phase === 'intro' || phase === 'question' || phase === 'reveal') && <RoundScreen state={state} onAnswer={answer} onNext={next} />}
        {phase === 'final' && <FinalScreen state={state} onRematch={rematch} onNewGame={newGame} />}
      </main>

      {showControls && (
        <ControlsOverlay initialPlayers={state.settings.playerCount} names={state.settings.names} onClose={() => setShowControls(false)} />
      )}

      <footer>
        <span>? controls · </span>
        {phase !== 'setup' && phase !== 'final' ? <span>esc to quit · </span> : null}
        &copy; {new Date().getFullYear()} Oscar Villalta
      </footer>
    </div>
  );
};
