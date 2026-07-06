'use client';

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const PAN_THRESHOLD_PX = 6;

const INTERACTIVE_SELECTOR =
  'a[href], input, textarea, select, label, button, [role="button"]';

/**
 * Grab/pan sur conteneur scrollable — souris et doigt (Pointer Events).
 * Seuil de déplacement pour ne pas bloquer le clic sur lignes interactives.
 *
 * @see docs/modules/portfolio-gantt-ui.md §5
 */
export function useTablePan() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    active: boolean;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const didPanRef = useRef(false);

  const endSession = useCallback(() => {
    sessionRef.current = null;
    setIsPanning(false);
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(INTERACTIVE_SELECTOR)) return;

      const el = scrollRef.current;
      if (!el) return;

      didPanRef.current = false;
      sessionRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: el.scrollLeft,
        startScrollTop: el.scrollTop,
        active: false,
      };

      const onMove = (ev: PointerEvent) => {
        const session = sessionRef.current;
        const scrollEl = scrollRef.current;
        if (!session || !scrollEl || ev.pointerId !== session.pointerId) return;

        const dx = ev.clientX - session.startX;
        const dy = ev.clientY - session.startY;

        if (!session.active) {
          if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
          session.active = true;
          didPanRef.current = true;
          setIsPanning(true);
        }

        scrollEl.scrollLeft = session.startScrollLeft - dx;
        scrollEl.scrollTop = session.startScrollTop - dy;
        ev.preventDefault();
      };

      const onUp = (ev: PointerEvent) => {
        if (sessionRef.current?.pointerId !== ev.pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        endSession();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [endSession],
  );

  const shouldSuppressClick = useCallback(() => {
    if (didPanRef.current) {
      didPanRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    scrollRef,
    isPanning,
    onPointerDown,
    shouldSuppressClick,
    /** Alias rétrocompat — préférer onPointerDown (tactile + souris). */
    onMouseDown: onPointerDown,
  } as const;
}
