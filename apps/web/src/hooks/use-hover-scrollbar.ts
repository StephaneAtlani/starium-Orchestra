'use client';

import { useCallback, useState } from 'react';

type HoverScrollbarProps = {
  'data-scroll-hover'?: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

/**
 * Active `data-scroll-hover` au survol — force l’affichage de la scrollbar
 * (CSS `[data-scroll-hover]::-webkit-scrollbar` dans les modales).
 */
export function useHoverScrollbar(): {
  scrollHover: boolean;
  hoverScrollbarProps: HoverScrollbarProps;
} {
  const [scrollHover, setScrollHover] = useState(false);

  const onMouseEnter = useCallback(() => setScrollHover(true), []);
  const onMouseLeave = useCallback(() => setScrollHover(false), []);

  return {
    scrollHover,
    hoverScrollbarProps: {
      'data-scroll-hover': scrollHover ? true : undefined,
      onMouseEnter,
      onMouseLeave,
    },
  };
}
