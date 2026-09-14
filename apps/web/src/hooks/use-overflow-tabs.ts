'use client';

import { useLayoutEffect, useRef, useState } from 'react';

function sumWithGaps(widths: number[], gapPx: number): number {
  if (widths.length === 0) return 0;
  return widths.reduce((acc, w) => acc + w, 0) + gapPx * (widths.length - 1);
}

type Options = {
  /** Espacement flex entre items (px) — doit matcher le CSS réel. */
  gapPx?: number;
  /** Déclenche un recalcul (libellés, compteurs, etc.). */
  deps?: readonly unknown[];
};

/**
 * Découpe une barre d’onglets : autant d’items visibles que la largeur permet,
 * le reste via le menu burger. L’onglet actif n’est pas promu s’il déborde.
 *
 * La rangée de mesure doit être hors flux (`fixed` + `w-max` + enfants `shrink-0`)
 * pour obtenir les largeurs naturelles, pas des largeurs contraintes par le flex parent.
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

    const recalculate = () => {
      if (typeof window === 'undefined') return;

      const style = getComputedStyle(container);
      const padX =
        (parseFloat(style.paddingLeft) || 0) +
        (parseFloat(style.paddingRight) || 0);
      // display:none (ex. mobile `hidden md:flex`) → clientWidth 0 : ne pas écraser.
      const available = Math.max(0, container.clientWidth - padX);
      if (available < 32) return;

      const kids = Array.from(measureEl.children) as HTMLElement[];
      if (kids.length === 0) {
        setVisibleCount(0);
        return;
      }

      const widths = kids.map((k) => Math.max(0, k.offsetWidth));
      if (widths.some((w) => w <= 0)) {
        // Mesure pas encore prête (fonts / layout) — réessayer au frame suivant.
        requestAnimationFrame(recalculate);
        return;
      }

      const leadingW = leadingRef.current
        ? Math.max(0, leadingRef.current.offsetWidth)
        : 0;
      const moreW = moreMeasureRef.current
        ? Math.max(40, moreMeasureRef.current.offsetWidth)
        : 44;

      const allParts = [
        ...(leadingW > 0 ? [leadingW] : []),
        ...widths,
      ];
      const totalAll = sumWithGaps(allParts, gapPx);

      if (totalAll <= available) {
        setVisibleCount(widths.length);
        return;
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
      setVisibleCount(count);
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
    return () => ro.disconnect();
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

/** Classes communes pour la rangée de mesure hors écran. */
export const OVERFLOW_TABS_MEASURE_ROW_CLASS =
  'pointer-events-none fixed left-0 top-0 -z-[1] flex w-max max-w-none flex-nowrap items-center opacity-0';
