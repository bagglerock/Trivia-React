/**
 * Synthesized sound effects (Web Audio) — no audio files to load.
 */

const MUTE_KEY = 'trivia.muted';

let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

export const isMuted = () => muted;

export const setMuted = (value: boolean) => {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // not fatal
  }
};

/** Browsers only allow audio after a user gesture; call this from click/keydown handlers. */
export const unlockAudio = () => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
};

interface Note {
  freq: number;
  start?: number; // seconds after now
  duration: number;
  type?: OscillatorType;
  volume?: number;
  slideTo?: number; // glide frequency to this by the end
}

const play = (notes: Note[]) => {
  if (muted || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  for (const { freq, start = 0, duration, type = 'square', volume = 0.12, slideTo } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = now + start;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    // Quick attack, exponential release so nothing clicks.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
};

export const sounds = {
  /** Countdown beep during the "Q3" intro. */
  countdown: () => play([{ freq: 440, duration: 0.12, type: 'triangle', volume: 0.15 }]),

  /** Question appears — clock is running. */
  go: () => play([{ freq: 880, duration: 0.25, type: 'triangle', volume: 0.18 }]),

  /** A player locked in. Each player gets their own pitch so you can hear who buzzed. */
  lock: (player: number) =>
    play([
      { freq: player === 0 ? 523 : 659, duration: 0.07 },
      { freq: player === 0 ? 784 : 988, start: 0.06, duration: 0.1 },
    ]),

  /** Last few seconds of the clock. */
  tick: () => play([{ freq: 1200, duration: 0.04, type: 'square', volume: 0.06 }]),

  correct: () =>
    play([
      { freq: 523, duration: 0.12, type: 'triangle', volume: 0.2 },
      { freq: 659, start: 0.1, duration: 0.12, type: 'triangle', volume: 0.2 },
      { freq: 784, start: 0.2, duration: 0.3, type: 'triangle', volume: 0.2 },
    ]),

  wrong: () =>
    play([
      { freq: 180, duration: 0.35, type: 'sawtooth', volume: 0.1, slideTo: 110 },
      { freq: 185, duration: 0.35, type: 'sawtooth', volume: 0.08, slideTo: 112 },
    ]),

  fanfare: () =>
    play(
      [523, 659, 784, 1047, 784, 1047].map((freq, i) => ({
        freq,
        start: i * 0.13,
        duration: i === 5 ? 0.6 : 0.15,
        type: 'triangle' as OscillatorType,
        volume: 0.2,
      }))
    ),
};
