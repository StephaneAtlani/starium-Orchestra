'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Hauteur estimée d’une ligne corps (padding + contenu dense). */
export const PROJECTS_VIEWPORT_ROW_PX = 72;
/** Hauteur estimée des 2 lignes d’en-tête (libellés + filtres). */
export const PROJECTS_VIEWPORT_THEAD_PX = 128;
export const PROJECTS_VIEWPORT_FOOTER_PX = 56;
export const PROJECTS_VIEWPORT_LIMIT_MIN = 5;
export const PROJECTS_VIEWPORT_LIMIT_MAX = 40;

function findVerticalScrollParent(el: HTMLElement): HTMLElement {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/** Offset du tableau dans le scroll parent — stable même si la page est déjà scrollée. */
export function measureStableTableTop(el: HTMLElement): number {
  const scrollParent = findVerticalScrollParent(el);
  const elRect = el.getBoundingClientRect();
  const parentRect = scrollParent.getBoundingClientRect();
  return Math.max(0, elRect.top - parentRect.top + scrollParent.scrollTop);
}

export function estimateProjectsViewportPageLimit(options: {
  viewportHeight: number;
  /**
   * Chrome au-dessus du tableau (scroll = 0). Ignoré si `stickyHeader` :
   * le thead colle sous le WorkspaceHeader et remplit la hauteur du `main`.
   */
  tableTop?: number;
  /** Thead sticky sous le header app → compter toute la hauteur utile du scrollport. */
  stickyHeader?: boolean;
  theadHeight?: number;
  rowHeight?: number;
  footerHeight?: number;
}): number {
  const thead = options.theadHeight ?? PROJECTS_VIEWPORT_THEAD_PX;
  const row = options.rowHeight ?? PROJECTS_VIEWPORT_ROW_PX;
  const footer = options.footerHeight ?? PROJECTS_VIEWPORT_FOOTER_PX;
  const topOffset = options.stickyHeader ? 0 : Math.max(0, options.tableTop ?? 0);
  const available = options.viewportHeight - topOffset - thead - footer - 8;
  const rows = Math.floor(available / Math.max(1, row));
  return Math.min(
    PROJECTS_VIEWPORT_LIMIT_MAX,
    Math.max(PROJECTS_VIEWPORT_LIMIT_MIN, rows),
  );
}

/**
 * Calcule un `limit` pour afficher autant de projets que la hauteur de page le permet.
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
    const el = anchorRef.current;
    const scrollParent = el ? findVerticalScrollParent(el) : null;
    const viewportHeight =
      scrollParent?.clientHeight ||
      window.visualViewport?.height ||
      window.innerHeight;
    const theadHeight =
      el?.querySelector('thead')?.getBoundingClientRect().height ?? undefined;
    const rowHeight =
      el?.querySelector('tbody tr')?.getBoundingClientRect().height ?? undefined;
    const footerHeight =
      el
        ?.querySelector('[data-slot="card-footer"]')
        ?.getBoundingClientRect().height ?? undefined;

    const next = estimateProjectsViewportPageLimit({
      viewportHeight,
      stickyHeader: true,
      theadHeight,
      rowHeight,
      footerHeight,
    });
    if (lastLimitRef.current === next) return;
    lastLimitRef.current = next;
    onLimitChange(next);
  }, [enabled, onLimitChange]);

  useEffect(() => {
    if (!enabled) return;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => recompute());
    });
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    const ro =
      typeof ResizeObserver !== 'undefined' && anchorRef.current
        ? new ResizeObserver(() => recompute())
        : null;
    if (anchorRef.current && ro) ro.observe(anchorRef.current);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [enabled, recompute, layoutKey]);

  return anchorRef;
}
