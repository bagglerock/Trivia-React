import { useEffect, useRef } from 'react';
import { sounds, unlockAudio } from './sounds';
import { GameState } from './types';
import { INTRO_MS } from './useGame';

const TICK_SECONDS = 5;

/** Plays sound effects in response to game state changes. */
export const useSoundEffects = (state: GameState) => {
  const { phase, index, questionStartedAt, settings, results } = state;
  const current = results[index];

  // Audio can only start after a user gesture.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Intro countdown beeps.
  useEffect(() => {
    if (phase !== 'intro') return;
    const beeps = [0, 1, 2].map(i => window.setTimeout(sounds.countdown, (INTRO_MS / 3) * i));
    return () => beeps.forEach(window.clearTimeout);
  }, [phase, index]);

  // Question start + ticking for the last few seconds.
  useEffect(() => {
    if (phase !== 'question' || questionStartedAt === null) return;
    sounds.go();
    const endsAt = questionStartedAt + settings.secondsPerQuestion * 1000;
    const ticks = Array.from({ length: TICK_SECONDS }, (_, i) => {
      const delay = endsAt - (TICK_SECONDS - i) * 1000 - performance.now();
      return delay > 0 ? window.setTimeout(sounds.tick, delay) : undefined;
    });
    return () => ticks.forEach(window.clearTimeout);
  }, [phase, questionStartedAt, settings.secondsPerQuestion]);

  // Lock-in blips, one per player as their answer arrives.
  const locked = useRef<boolean[]>([]);
  useEffect(() => {
    if (!current) return;
    if (phase === 'intro') locked.current = [];
    current.forEach((answer, p) => {
      if (answer && !locked.current[p]) {
        locked.current[p] = true;
        sounds.lock(p);
      }
    });
  }, [current, phase]);

  // Reveal: chime if anyone got it, buzzer if nobody did.
  useEffect(() => {
    if (phase !== 'reveal' || !current) return;
    // Short delay so the last lock-in blip doesn't step on it.
    const t = window.setTimeout(() => (current.some(a => a?.correct) ? sounds.correct() : sounds.wrong()), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index]);

  useEffect(() => {
    if (phase === 'final') sounds.fanfare();
  }, [phase]);
};
