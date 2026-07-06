import type React from 'react';

export type DataTableColumnPriority =
  | 'primary'
  | 'secondary'
  | 'hidden-mobile'
  | 'actions';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  /** Libellé affiché devant la valeur en vue carte (défaut : header) */
  mobileLabel?: string;
  /** Priorité d'affichage mobile. Défaut : inféré via resolveMobilePriority */
  mobilePriority?: DataTableColumnPriority;
};

export function resolveMobilePriority<T>(
  col: DataTableColumn<T>,
  index: number,
  columns: DataTableColumn<T>[],
): DataTableColumnPriority {
  if (col.mobilePriority) {
    return col.mobilePriority;
  }

  if (col.key === 'actions') {
    return 'actions';
  }

  const isLastColumn = index === columns.length - 1;
  if (isLastColumn && col.className?.includes('text-right')) {
    return 'actions';
  }

  if (index === 0) {
    return 'primary';
  }

  return 'secondary';
}

export function renderCellContent<T>(
  col: DataTableColumn<T>,
  row: T,
): React.ReactNode {
  if (col.cell) {
    return col.cell(row);
  }
  return String((row as Record<string, unknown>)[col.key] ?? '—');
}
