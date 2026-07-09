'use client';

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const PAN_THRESHOLD_PX = 6;

const INTERACTIVE_SELECTOR =
  'a[href], input, textarea, select, label, button, [role="button"]';

type ScrollPanSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  startScrollTop: number;
  active: boolean;
  scrollEl: HTMLElement;
};

export type UseScrollPanOptions<T extends HTMLElement = HTMLDivElement> = {
  /** Résout le conteneur scrollable (ex. délégation depuis une modale). */
  resolveScrollEl?: (event: ReactPointerEvent<T>) => HTMLElement | null;
};

function isScrollableAxis(el: HTMLElement, axis: 'x' | 'y'): boolean {
  const style = getComputedStyle(el);
  const overflow = axis === 'x' ? style.overflowX : style.overflowY;
  const canScroll =
    overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';
  if (!canScroll) return false;
  return axis === 'x'
    ? el.scrollWidth > el.clientWidth + 1
    : el.scrollHeight > el.clientHeight + 1;
}

function isScrollableElement(el: HTMLElement): boolean {
  return isScrollableAxis(el, 'y') || isScrollableAxis(el, 'x');
}

/**
 * Grab/pan sur conteneur scrollable — souris et doigt (Pointer Events).
 * Seuil de déplacement pour ne pas bloquer le clic sur lignes interactives.
 */
export function useScrollPan<T extends HTMLElement = HTMLDivElement>(
  options?: UseScrollPanOptions<T>,
) {
  const scrollRef = useRef<T>(null);
  const sessionRef = useRef<ScrollPanSession | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const didPanRef = useRef(false);
  const resolveScrollEl = options?.resolveScrollEl;

  const endSession = useCallback(() => {
    sessionRef.current = null;
    setIsPanning(false);
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(INTERACTIVE_SELECTOR)) return;

      const el = resolveScrollEl?.(e) ?? scrollRef.current;
      if (!el || !isScrollableElement(el)) return;

      didPanRef.current = false;
      sessionRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: el.scrollLeft,
        startScrollTop: el.scrollTop,
        active: false,
        scrollEl: el,
      };

      const onMove = (ev: PointerEvent) => {
        const session = sessionRef.current;
        if (!session || ev.pointerId !== session.pointerId) return;

        const dx = ev.clientX - session.startX;
        const dy = ev.clientY - session.startY;

        if (!session.active) {
          if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
          session.active = true;
          didPanRef.current = true;
          setIsPanning(true);
        }

        session.scrollEl.scrollLeft = session.startScrollLeft - dx;
        session.scrollEl.scrollTop = session.startScrollTop - dy;
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
    [endSession, resolveScrollEl],
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

/**
 * Grab/pan horizontal pour tableaux — souris et doigt.
 *
 * @see docs/modules/portfolio-gantt-ui.md §5
 */
export function useTablePan() {
  return useScrollPan<HTMLDivElement>();
}

export function findVerticalScrollableAncestor(
  start: HTMLElement,
  boundary: HTMLElement,
): HTMLElement | null {
  let el: HTMLElement | null = start;
  while (el && el !== boundary) {
    if (isScrollableAxis(el, 'y')) return el;
    el = el.parentElement;
  }
  return isScrollableAxis(boundary, 'y') ? boundary : null;
}

/** Cible scroll modale : corps Starium, sinon ancêtre overflow-y scrollable. */
export function resolveDialogScrollTarget(
  target: HTMLElement,
  popup: HTMLElement,
): HTMLElement | null {
  const body = target.closest('[data-slot="dialog-body"]');
  if (body instanceof HTMLElement && isScrollableAxis(body, 'y')) {
    return body;
  }
  return findVerticalScrollableAncestor(target, popup);
}
