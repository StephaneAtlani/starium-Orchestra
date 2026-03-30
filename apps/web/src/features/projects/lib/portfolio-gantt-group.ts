import type { PortfolioGanttRow } from '../types/project.types';

/** En-tête de groupe (catégorie) — frise portefeuille uniquement. */
export const GANTT_CATEGORY_HEADER_PX = 32;

/** Hauteur de ligne projet — plus aérée que le Gantt projet (`GANTT_ROW_PX`). */
export const PORTFOLIO_GANTT_ROW_PX = 46;

/** Espace vertical entre chaque ligne (catégorie ou projet). */
export const PORTFOLIO_GANTT_ROW_GAP_PX = 10;

export function portfolioCategoryLabel(row: PortfolioGanttRow): string {
  const c = row.portfolioCategory;
  if (!c) return 'Sans catégorie';
  return c.parentName ? `${c.parentName} / ${c.name}` : c.name;
}

/** Regroupe les projets par libellé de catégorie (tri FR, « Sans catégorie » en dernier). */
export function groupPortfolioGanttByCategory(
  items: PortfolioGanttRow[],
): { label: string; rows: PortfolioGanttRow[] }[] {
  const buckets = new Map<string, PortfolioGanttRow[]>();
  for (const row of items) {
    const L = portfolioCategoryLabel(row);
    if (!buckets.has(L)) buckets.set(L, []);
    buckets.get(L)!.push(row);
  }
  const sortedLabels = [...buckets.keys()].sort((a, b) => {
    if (a === 'Sans catégorie' && b !== 'Sans catégorie') return 1;
    if (b === 'Sans catégorie' && a !== 'Sans catégorie') return -1;
    return a.localeCompare(b, 'fr');
  });
  return sortedLabels.map((label) => ({
    label,
    rows: buckets.get(label)!,
  }));
}

export type PortfolioGanttLayoutRow =
  | { kind: 'category'; label: string; key: string }
  | { kind: 'project'; row: PortfolioGanttRow };

export function flattenPortfolioGanttLayout(
  sections: { label: string; rows: PortfolioGanttRow[] }[],
): PortfolioGanttLayoutRow[] {
  const out: PortfolioGanttLayoutRow[] = [];
  for (const s of sections) {
    out.push({ kind: 'category', label: s.label, key: `cat:${s.label}` });
    for (const row of s.rows) {
      out.push({ kind: 'project', row });
    }
  }
  return out;
}

export function portfolioGanttBodyHeightPx(layoutRows: PortfolioGanttLayoutRow[]): number {
  const n = layoutRows.length;
  const rowsH = layoutRows.reduce(
    (h, r) =>
      h +
      (r.kind === 'category' ? GANTT_CATEGORY_HEADER_PX : PORTFOLIO_GANTT_ROW_PX),
    0,
  );
  const gaps = n > 1 ? (n - 1) * PORTFOLIO_GANTT_ROW_GAP_PX : 0;
  return rowsH + gaps;
}
