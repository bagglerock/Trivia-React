import { FinalScreen } from './components/FinalScreen';
import { RoundScreen } from './components/RoundScreen';
import { SetupScreen } from './components/SetupScreen';
import { useEffect, useState } from 'react';
import { isMuted, setMuted } from './game/sounds';
import { useGame } from './game/useGame';
import { useSoundEffects } from './game/useSoundEffects';

export const App = () => {
  const { state, start, answer, next, rematch, newGame } = useGame();
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
      if (e.code !== 'KeyM' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      toggleMute();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Trivia</h1>
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

      <footer>
        {phase !== 'setup' && phase !== 'final' ? <span>esc to quit · </span> : null}
        &copy; {new Date().getFullYear()} Oscar Villalta
      </footer>
    </div>
  );
};
