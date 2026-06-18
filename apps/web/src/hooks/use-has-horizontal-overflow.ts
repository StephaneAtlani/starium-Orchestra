'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Détecte si un conteneur scrollable a un débordement horizontal.
 * Utilisé pour afficher un hint visuel de scroll sur mobile.
 */
export function useHasHorizontalOverflow(
  ref: RefObject<HTMLElement | null>,
): boolean {
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setHasOverflow(el.scrollWidth > el.clientWidth);
    };

    check();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(check);
    observer.observe(el);

    return () => observer.disconnect();
  }, [ref]);

  return hasOverflow;
}
