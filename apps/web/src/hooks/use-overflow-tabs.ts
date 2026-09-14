'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export function sumWithGaps(widths: number[], gapPx: number): number {
  if (widths.length === 0) return 0;
  return widths.reduce((acc, w) => acc + w, 0) + gapPx * (widths.length - 1);
}

/** Pure : combien d’onglets garder visibles (le reste → burger). */
export function computeVisibleTabCount(input: {
  widths: number[];
  available: number;
  gapPx: number;
  moreW: number;
  leadingW?: number;
}): number {
  const { widths, available, gapPx, moreW } = input;
  const leadingW = input.leadingW ?? 0;
  if (widths.length === 0) return 0;
  if (available < 32) return widths.length;

  const allParts = [
    ...(leadingW > 0 ? [leadingW] : []),
    ...widths,
  ];
  if (sumWithGaps(allParts, gapPx) <= available) {
    return widths.length;
  }

  let count = 0;
  for (let i = 0; i < widths.length; i += 1) {
    const candidate = [
      ...(leadingW > 0 ? [leadingW] : []),
      ...widths.slice(0, i + 1),
      moreW,
    ];
    if (sumWithGaps(candidate, gapPx) <= available) {
      count = i + 1;
    } else {
      break;
    }
  }
  return count;
}

type Options = {
  gapPx?: number;
  deps?: readonly unknown[];
};

/**
 * Découpe adaptative. `containerRef` = hôte **plein largeur** (w-full) pour la place dispo.
 * `measureRef` = rangée hors écran (enfants shrink-0) pour les largeurs naturelles.
 */
export function useOverflowTabs(itemCount: number, options?: Options) {
  const gapPx = options?.gapPx ?? 4;
  const deps = options?.deps ?? [];
  const containerRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const moreMeasureRef = useRef<HTMLElement | null>(null);
  const leadingRef = useRef<HTMLElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(itemCount);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureEl = measureRef.current;
    if (!container || !measureEl) return;

    let raf = 0;

    const recalculate = () => {
      if (typeof window === 'undefined') return;

      const style = getComputedStyle(container);
      if (style.display === 'none') return;

      const padX =
        (parseFloat(style.paddingLeft) || 0) +
        (parseFloat(style.paddingRight) || 0);
      const available = Math.floor(container.getBoundingClientRect().width - padX);
      if (available < 32) return;

      const kids = Array.from(measureEl.children) as HTMLElement[];
      if (kids.length === 0) {
        setVisibleCount(0);
        return;
      }

      const widths = kids.map((k) => k.getBoundingClientRect().width);
      if (widths.some((w) => w < 1)) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(recalculate);
        return;
      }

      const leadingW = leadingRef.current
        ? leadingRef.current.getBoundingClientRect().width
        : 0;
      const moreW = moreMeasureRef.current
        ? Math.max(
            40,
            moreMeasureRef.current.getBoundingClientRect().width,
          )
        : 44;

      const next = computeVisibleTabCount({
        widths,
        available,
        gapPx,
        moreW,
        leadingW,
      });
      setVisibleCount((prev) => (prev === next ? prev : next));
    };

    recalculate();
    const ro = new ResizeObserver(() => {
      recalculate();
    });
    ro.observe(container);
    ro.observe(measureEl);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => recalculate());
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps fournis par l’appelant
  }, [itemCount, gapPx, ...deps]);

  return {
    containerRef,
    measureRef,
    moreMeasureRef,
    leadingRef,
    visibleCount: Math.min(visibleCount, itemCount),
  };
}

/** Rangée de mesure hors écran — largeurs naturelles, hors cascade flex du bandeau. */
export const OVERFLOW_TABS_MEASURE_ROW_CLASS =
  'pointer-events-none fixed left-[-10000px] top-0 z-[-1] flex w-max max-w-none flex-nowrap items-center';
