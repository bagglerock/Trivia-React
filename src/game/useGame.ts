import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { loadQuestions, topUpQuestionBank } from '../services/questions';
import { initialState, reducer } from './engine';
import { keyToAnswer } from './keys';
import { Settings } from './types';

export const INTRO_MS = 3000;
export const REVEAL_MS = 6000;
const TOP_UP_DELAY_MS = 8000;

/** `inputBlocked` stops game keys while an overlay (e.g. the controls help) is open. */
export const useGame = (inputBlocked = false) => {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const { phase, settings, phaseStartedAt, pausedAt } = state;
  const paused = pausedAt !== null;

  // Only one load at a time; quitting or restarting cancels the one in flight so it can't hog the API's rate limit.
  const loading = useRef<AbortController | null>(null);
  const load = useCallback((s: Settings) => {
    loading.current?.abort();
    const controller = new AbortController();
    loading.current = controller;
    loadQuestions(s, controller.signal)
      .then(({ questions, notice }) => {
        if (controller.signal.aborted) return;
        dispatch({ type: 'LOADED', questions, notice, now: performance.now() });
        // While they play, quietly stock up the question bank for next time / offline.
        window.setTimeout(() => !controller.signal.aborted && topUpQuestionBank(s, controller.signal), TOP_UP_DELAY_MS);
      })
      .catch(e => !controller.signal.aborted && dispatch({ type: 'LOAD_FAILED', error: e.message }));
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
    loading.current?.abort();
    dispatch({ type: 'NEW_GAME' });
  }, []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE', now: performance.now() }), []);
  const resume = useCallback(() => dispatch({ type: 'RESUME', now: performance.now() }), []);
  const next = useCallback(() => dispatch({ type: 'NEXT', now: performance.now() }), []);

  // Auto-pause if you switch away from the tab mid-game.
  useEffect(() => {
    const onHide = () => document.hidden && pause();
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [pause]);

  // Phase timers, measured from when the phase started (which a pause pushes back).
  useEffect(() => {
    if (paused || phaseStartedAt === null) return;
    const after = (ms: number, fn: () => void) => window.setTimeout(fn, Math.max(0, ms - (performance.now() - phaseStartedAt)));
    let timer: number | undefined;
    if (phase === 'intro') {
      timer = after(INTRO_MS, () => dispatch({ type: 'BEGIN_QUESTION', now: performance.now() }));
    } else if (phase === 'question') {
      timer = after(settings.secondsPerQuestion * 1000, () => dispatch({ type: 'TIME_UP', now: performance.now() }));
    } else if (phase === 'reveal') {
      timer = after(REVEAL_MS, next);
    }
    return () => window.clearTimeout(timer);
  }, [phase, phaseStartedAt, paused, settings.secondsPerQuestion, next]);

  // Keyboard: both players share one keyboard.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (inputBlocked) return;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (paused) {
        if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          resume();
        } else if (e.code === 'KeyQ') {
          newGame();
        }
        return;
      }

      if (e.code === 'Escape') {
        pause();
        return;
      }

      if (phase === 'question') {
        const hit = keyToAnswer(e.code, settings.playerCount);
        if (hit) {
          e.preventDefault();
          // event.timeStamp shares performance.now()'s clock and reflects when the key was actually pressed.
          dispatch({ type: 'ANSWER', ...hit, now: e.timeStamp });
        }
      } else if (phase === 'reveal' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        next();
      } else if (phase === 'final' && e.code === 'Enter') {
        e.preventDefault();
        rematch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, paused, settings.playerCount, rematch, newGame, pause, resume, next, inputBlocked]);

  return {
    state,
    start,
    answer: useCallback((player: number, choice: number) => dispatch({ type: 'ANSWER', player, choice, now: performance.now() }), []),
    next,
    rematch,
    newGame,
    pause,
    resume,
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
