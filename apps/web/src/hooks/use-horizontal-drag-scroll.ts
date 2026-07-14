'use client';

import { useCallback, useRef } from 'react';

type DragState = {
  pointerId: number;
  startX: number;
  scrollLeft: number;
};

const INTERACTIVE_SELECTOR =
  '[data-slot="tabs-trigger"], button, a, input, select, textarea, label';

/**
 * Scroll horizontal au clic-glissé sur la zone « vide » d’une barre débordante.
 * N’intercepte pas les clics sur onglets / boutons.
 */
export function useHorizontalDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;

    const element = ref.current;
    if (!element) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: element.scrollLeft,
    };
    draggingRef.current = false;
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    const drag = dragRef.current;
    if (!element || !drag || drag.pointerId !== event.pointerId) return;

    const delta = event.clientX - drag.startX;
    if (!draggingRef.current && Math.abs(delta) < 6) return;

    if (!draggingRef.current) {
      draggingRef.current = true;
      element.setPointerCapture(event.pointerId);
    }

    element.scrollLeft = drag.scrollLeft - delta;
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    const drag = dragRef.current;
    if (!element || !drag || drag.pointerId !== event.pointerId) return;

    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    draggingRef.current = false;
  }, []);

  return {
    ref,
    className:
      'cursor-grab active:cursor-grabbing [&_[data-slot=tabs-trigger]]:cursor-pointer',
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}
