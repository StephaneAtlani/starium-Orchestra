'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Hauteur estimée d’une ligne corps (padding + contenu dense). */
export const PROJECTS_VIEWPORT_ROW_PX = 68;
/** Hauteur estimée des 2 lignes d’en-tête (libellés + filtres). */
export const PROJECTS_VIEWPORT_THEAD_PX = 128;
export const PROJECTS_VIEWPORT_FOOTER_PX = 56;
export const PROJECTS_VIEWPORT_LIMIT_MIN = 5;
export const PROJECTS_VIEWPORT_LIMIT_MAX = 40;

export function estimateProjectsViewportPageLimit(options: {
  viewportHeight: number;
  /** Distance du haut du viewport jusqu’au haut de la zone tableau. */
  tableTop: number;
}): number {
  const available =
    options.viewportHeight -
    options.tableTop -
    PROJECTS_VIEWPORT_THEAD_PX -
    PROJECTS_VIEWPORT_FOOTER_PX -
    8;
  const rows = Math.floor(available / PROJECTS_VIEWPORT_ROW_PX);
  return Math.min(
    PROJECTS_VIEWPORT_LIMIT_MAX,
    Math.max(PROJECTS_VIEWPORT_LIMIT_MIN, rows),
  );
}

/**
 * Calcule un `limit` pour remplir environ une hauteur d’écran (scroll page, pas panneau).
 */
export function useProjectsViewportPageLimit(
  onLimitChange: (limit: number) => void,
  enabled = true,
  /** Recalcule quand le chrome au-dessus du tableau change (KPI, toolbar…). */
  layoutKey?: unknown,
) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const lastLimitRef = useRef<number | null>(null);

  const recompute = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;
    const top =
      anchorRef.current?.getBoundingClientRect().top ??
      Math.round(window.innerHeight * 0.35);
    const next = estimateProjectsViewportPageLimit({
      viewportHeight: window.innerHeight,
      tableTop: Math.max(0, top),
    });
    if (lastLimitRef.current === next) return;
    lastLimitRef.current = next;
    onLimitChange(next);
  }, [enabled, onLimitChange]);

  useEffect(() => {
    if (!enabled) return;
    recompute();
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    const ro =
      typeof ResizeObserver !== 'undefined' && anchorRef.current
        ? new ResizeObserver(() => recompute())
        : null;
    if (anchorRef.current && ro) ro.observe(anchorRef.current);
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [enabled, recompute, layoutKey]);

  return anchorRef;
}
