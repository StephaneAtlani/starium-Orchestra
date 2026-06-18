'use client';

import { useEffect, useState } from 'react';

/**
 * Hook SSR-safe basé sur `matchMedia`. Non utilisé pour le double rendu DataTable
 * (préférer les breakpoints CSS) — utilitaire pour d'autres besoins UI.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Viewport strictement inférieur au breakpoint `md` (768px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** Viewport `md` et plus (≥ 768px). */
export function useMinMd(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
