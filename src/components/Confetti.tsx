import { CSSProperties, useMemo } from 'react';

const COLORS = ['#ffd700', '#f08080', '#ff7f50', '#2e86ab', '#a23b72', '#3bb273', '#ffffff'];

/** A one-shot shower of confetti. Re-mount (change its key) to fire again. */
export const Confetti = ({ pieces = 70, long = false }: { pieces?: number; long?: boolean }) => {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, () => ({
        '--x': `${Math.random() * 100}vw`,
        '--drift': `${(Math.random() - 0.5) * 30}vw`,
        '--spin': `${(Math.random() - 0.5) * 1440}deg`,
        '--delay': `${Math.random() * (long ? 1.5 : 0.4)}s`,
        '--dur': `${(long ? 2.8 : 1.6) + Math.random() * 1.4}s`,
        '--w': `${6 + Math.random() * 8}px`,
        '--h': `${8 + Math.random() * 12}px`,
        background: COLORS[Math.floor(Math.random() * COLORS.length)],
        borderRadius: Math.random() < 0.3 ? '50%' : '2px',
      })),
    [pieces, long]
  );

  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((style, i) => (
        <span key={i} style={style as CSSProperties} />
      ))}
    </div>
  );
};
