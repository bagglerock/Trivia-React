import { useEffect, useRef, useState } from 'react';

/** Counts up (or down) to `value` whenever it changes, game-show style. */
export const AnimatedNumber = ({ value, duration = 900, from }: { value: number; duration?: number; from?: number }) => {
  const [shown, setShown] = useState(from ?? value);
  const shownRef = useRef(shown);

  useEffect(() => {
    const start = shownRef.current;
    if (start === value) return;
    const t0 = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(start + (value - start) * eased);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{shown.toLocaleString()}</>;
};
