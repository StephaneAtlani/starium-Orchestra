import type { PortfolioGanttRow, ProjectTag } from '../types/project.types';

/** En-tête de groupe (catégorie) — frise portefeuille uniquement. */
export const GANTT_CATEGORY_HEADER_PX = 32;

/** Hauteur de ligne projet — plus aérée que le Gantt projet (`GANTT_ROW_PX`). */
export const PORTFOLIO_GANTT_ROW_PX = 46;

/** Espace vertical entre chaque ligne (catégorie ou projet). */
export const PORTFOLIO_GANTT_ROW_GAP_PX = 10;

const NO_CATEGORY_LABEL = 'Sans catégorie';
const NO_TAG_LABEL = 'Sans étiquette';

export type PortfolioGanttSection = {
  label: string;
  key: string;
  tagColor?: string | null;
  sectionTag?: ProjectTag;
  rows: PortfolioGanttRow[];
};

export function portfolioCategoryLabel(row: PortfolioGanttRow): string {
  const c = row.portfolioCategory;
  if (!c) return NO_CATEGORY_LABEL;
  return c.parentName ? `${c.parentName} / ${c.name}` : c.name;
}

/** Regroupe les projets par libellé de catégorie (tri FR, « Sans catégorie » en dernier). */
export function groupPortfolioGanttByCategory(
  items: PortfolioGanttRow[],
): PortfolioGanttSection[] {
  const buckets = new Map<string, PortfolioGanttRow[]>();
  for (const row of items) {
    const L = portfolioCategoryLabel(row);
    if (!buckets.has(L)) buckets.set(L, []);
    buckets.get(L)!.push(row);
  }
  const sortedLabels = [...buckets.keys()].sort((a, b) => {
    if (a === NO_CATEGORY_LABEL && b !== NO_CATEGORY_LABEL) return 1;
    if (b === NO_CATEGORY_LABEL && a !== NO_CATEGORY_LABEL) return -1;
    return a.localeCompare(b, 'fr');
  });
  return sortedLabels.map((label) => ({
    label,
    key: `cat:${label}`,
    rows: buckets.get(label)!,
  }));
}

/** Regroupe les projets par étiquette (N:N — un projet peut apparaître sous plusieurs sections). */
export function groupPortfolioGanttByTag(
  items: PortfolioGanttRow[],
): PortfolioGanttSection[] {
  const buckets = new Map<
    string,
    { label: string; tag: ProjectTag | null; rows: PortfolioGanttRow[] }
  >();

  for (const row of items) {
    const tags = row.tags ?? [];
    if (tags.length === 0) {
      if (!buckets.has('__none__')) {
        buckets.set('__none__', { label: NO_TAG_LABEL, tag: null, rows: [] });
      }
      buckets.get('__none__')!.rows.push(row);
      continue;
    }
    for (const tag of tags) {
      if (!buckets.has(tag.id)) {
        buckets.set(tag.id, { label: tag.name, tag, rows: [] });
      }
      buckets.get(tag.id)!.rows.push(row);
    }
  }

  const sorted = [...buckets.entries()].sort(([, a], [, b]) => {
    if (a.label === NO_TAG_LABEL && b.label !== NO_TAG_LABEL) return 1;
    if (b.label === NO_TAG_LABEL && a.label !== NO_TAG_LABEL) return -1;
    return a.label.localeCompare(b.label, 'fr');
  });

  return sorted.map(([key, bucket]) => ({
    label: bucket.label,
    key: key === '__none__' ? 'tag:none' : `tag:${key}`,
    tagColor: bucket.tag?.color ?? null,
    sectionTag: bucket.tag ?? undefined,
    rows: bucket.rows,
  }));
}

export type PortfolioGanttLayoutRow =
  | { kind: 'category'; label: string; key: string; tagColor?: string | null }
  | {
      kind: 'project';
      row: PortfolioGanttRow;
      sectionTag?: ProjectTag;
    };

export function flattenPortfolioGanttLayout(
  sections: PortfolioGanttSection[],
): PortfolioGanttLayoutRow[] {
  const out: PortfolioGanttLayoutRow[] = [];
  for (const s of sections) {
    out.push({
      kind: 'category',
      label: s.label,
      key: s.key,
      tagColor: s.tagColor,
    });
    for (const row of s.rows) {
      out.push({
        kind: 'project',
        row,
        ...(s.sectionTag ? { sectionTag: s.sectionTag } : {}),
      });
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
