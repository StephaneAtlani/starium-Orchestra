'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

type DragState = {
  pointerId: number;
  startX: number;
  scrollLeft: number;
};

type Options = {
  /**
   * Si true (défaut), le drag peut démarrer sur un onglet / bouton :
   * un petit mouvement → pan ; sans mouvement → clic normal.
   */
  allowDragFromInteractive?: boolean;
};

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="tab"], [data-slot="tabs-trigger"]';

const DRAG_THRESHOLD_PX = 6;

/**
 * Scroll horizontal au clic-glissé / doigt sur une barre débordante.
 */
export function useHorizontalDragScroll<T extends HTMLElement = HTMLDivElement>(
  options?: Options,
) {
  const allowDragFromInteractive = options?.allowDragFromInteractive !== false;
  const ref = useRef<T | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<T>) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (
        !allowDragFromInteractive &&
        target.closest(INTERACTIVE_SELECTOR)
      ) {
        return;
      }

      const element = ref.current;
      if (!element) return;
      if (element.scrollWidth <= element.clientWidth + 1) return;

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        scrollLeft: element.scrollLeft,
      };
      draggingRef.current = false;
      suppressClickRef.current = false;
    },
    [allowDragFromInteractive],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<T>) => {
    const element = ref.current;
    const drag = dragRef.current;
    if (!element || !drag || drag.pointerId !== event.pointerId) return;

    const delta = event.clientX - drag.startX;
    if (!draggingRef.current && Math.abs(delta) < DRAG_THRESHOLD_PX) return;

    if (!draggingRef.current) {
      draggingRef.current = true;
      suppressClickRef.current = true;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }

    element.scrollLeft = drag.scrollLeft - delta;
    event.preventDefault();
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<T>) => {
    const element = ref.current;
    const drag = dragRef.current;
    if (!element || !drag || drag.pointerId !== event.pointerId) return;

    if (element.hasPointerCapture(event.pointerId)) {
      try {
        element.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
    draggingRef.current = false;
  }, []);

  const onClickCapture = useCallback((event: React.MouseEvent<T>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  return {
    ref,
    className: cn(
      'cursor-grab touch-pan-x overscroll-x-contain active:cursor-grabbing',
      '[&_a]:cursor-pointer [&_button]:cursor-pointer [&_[role=tab]]:cursor-pointer',
    ),
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
  };
}
