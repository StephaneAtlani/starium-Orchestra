'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

/**
 * Hook de déplacement par clic (grab/pan) pour les conteneurs de table scrollables.
 *
 * Clic gauche maintenu + glisser → translation du scroll (horizontal + vertical).
 * Les éléments interactifs (liens, boutons, champs, selects, labels) ne déclenchent pas le pan.
 *
 * @see docs/modules/portfolio-gantt-ui.md §5 — même pattern que le Gantt portefeuille.
 */
export function useTablePan() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => {
      const el = scrollRef.current;
      const pan = panRef.current;
      if (!el || !pan) return;
      el.scrollLeft = pan.startScrollLeft - (e.clientX - pan.startX);
      el.scrollTop = pan.startScrollTop - (e.clientY - pan.startY);
      e.preventDefault();
    };
    const onUp = () => {
      panRef.current = null;
      setIsPanning(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanning]);

  const onMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('a[href], input, textarea, select, label, button, [role="button"]')) return;
    const el = scrollRef.current;
    if (!el) return;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
    };
    setIsPanning(true);
    e.preventDefault();
  }, []);

  return { scrollRef, isPanning, onMouseDown } as const;
}
