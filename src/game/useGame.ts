import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { loadQuestions } from '../services/questions';
import { initialState, reducer } from './engine';
import { keyToAnswer } from './keys';
import { Settings } from './types';

export const INTRO_MS = 3000;
export const REVEAL_MS = 6000;

export const useGame = () => {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const { phase, settings, index, questionStartedAt } = state;

  // Each load gets an id so a slow response from an abandoned game is ignored.
  const loadId = useRef(0);
  const load = useCallback((s: Settings) => {
    const id = ++loadId.current;
    loadQuestions(s)
      .then(({ questions, usingBackup }) => id === loadId.current && dispatch({ type: 'LOADED', questions, usingBackup }))
      .catch(e => id === loadId.current && dispatch({ type: 'LOAD_FAILED', error: e.message }));
  }, []);

  const start = useCallback(
    (s: Settings) => {
      dispatch({ type: 'START', settings: s });
      load(s);
    },
    [load]
  );
  const rematch = useCallback(() => start(settings), [start, settings]);
  const newGame = useCallback(() => {
    loadId.current++;
    dispatch({ type: 'NEW_GAME' });
  }, []);

  // Phase timers.
  useEffect(() => {
    let timer: number | undefined;
    if (phase === 'intro') {
      timer = window.setTimeout(() => dispatch({ type: 'BEGIN_QUESTION', now: performance.now() }), INTRO_MS);
    } else if (phase === 'question' && questionStartedAt !== null) {
      const remaining = settings.secondsPerQuestion * 1000 - (performance.now() - questionStartedAt);
      timer = window.setTimeout(() => dispatch({ type: 'TIME_UP' }), Math.max(0, remaining));
    } else if (phase === 'reveal') {
      timer = window.setTimeout(() => dispatch({ type: 'NEXT' }), REVEAL_MS);
    }
    return () => window.clearTimeout(timer);
  }, [phase, index, questionStartedAt, settings.secondsPerQuestion]);

  // Keyboard: both players share one keyboard.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (phase === 'question') {
        const hit = keyToAnswer(e.code, settings.playerCount);
        if (hit) {
          e.preventDefault();
          // event.timeStamp shares performance.now()'s clock and reflects when the key was actually pressed.
          dispatch({ type: 'ANSWER', ...hit, now: e.timeStamp });
        }
      } else if (phase === 'reveal' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        dispatch({ type: 'NEXT' });
      } else if (phase === 'final' && e.code === 'Enter') {
        e.preventDefault();
        rematch();
      }

      if (e.code === 'Escape' && phase !== 'setup' && phase !== 'final') {
        if (window.confirm('Quit this game?')) newGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, settings.playerCount, rematch, newGame]);

  return {
    state,
    start,
    answer: useCallback((player: number, choice: number) => dispatch({ type: 'ANSWER', player, choice, now: performance.now() }), []),
    next: useCallback(() => dispatch({ type: 'NEXT' }), []),
    rematch,
    newGame,
  };
};

/** Re-renders every animation frame while `active`, returning performance.now(). */
export const useNow = (active: boolean): number => {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!active) return;
    let frame: number;
    const tick = () => {
      setNow(performance.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return now;
};
