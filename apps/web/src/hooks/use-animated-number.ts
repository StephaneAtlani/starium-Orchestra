'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interpolation ease-out vers `target`. Quand `enabled` est faux, suit `target` sans animation.
 */
export function useAnimatedNumber(
  target: number,
  {
    enabled,
    durationMs = 620,
  }: {
    enabled: boolean;
    durationMs?: number;
  },
): number {
  const displayRef = useRef(0);
  const [display, setDisplay] = useState(() => (enabled ? 0 : target));
  const rafRef = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(target)) return;

    if (!enabled) {
      cancelAnimationFrame(rafRef.current);
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const start = displayRef.current;
    const t0 = performance.now();

    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - u) ** 2;
      const v = start + (target - start) * eased;
      displayRef.current = v;
      setDisplay(v);
      if (u < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setDisplay(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, enabled, durationMs]);

  return display;
}
