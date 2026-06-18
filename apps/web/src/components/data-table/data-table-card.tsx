'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  type DataTableColumn,
  renderCellContent,
  resolveMobilePriority,
} from './data-table.types';

interface DataTableCardProps<T> {
  row: T;
  columns: DataTableColumn<T>[];
}

export function DataTableCard<T>({ row, columns }: DataTableCardProps<T>) {
  const resolved = columns.map((col, index) => ({
    col,
    priority: resolveMobilePriority(col, index, columns),
  }));

  const primaryCols = resolved.filter(({ priority }) => priority === 'primary');
  const secondaryCols = resolved.filter(
    ({ priority }) => priority === 'secondary',
  );
  const actionCols = resolved.filter(({ priority }) => priority === 'actions');

  const hasHeader = primaryCols.length > 0;
  const hasFooter = actionCols.length > 0;

  return (
    <li>
      <article className="rounded-lg border border-border bg-card p-4 space-y-3">
        {hasHeader && (
          <header className="text-sm font-medium text-foreground">
            {primaryCols.map(({ col }) => (
              <div key={col.key}>{renderCellContent(col, row)}</div>
            ))}
          </header>
        )}

        {secondaryCols.length > 0 && (
          <dl className="grid grid-cols-1 gap-1.5 text-sm">
            {secondaryCols.map(({ col }) => (
              <div key={col.key} className="grid grid-cols-[minmax(0,40%)_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-muted-foreground">
                  {col.mobileLabel ?? col.header}
                </dt>
                <dd className="whitespace-normal break-words text-foreground">
                  {renderCellContent(col, row)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {hasFooter && (
          <footer className="flex flex-wrap gap-2 pt-1">
            {actionCols.map(({ col }) => (
              <div key={col.key} className={cn(col.className)}>
                {renderCellContent(col, row)}
              </div>
            ))}
          </footer>
        )}
      </article>
    </li>
  );
}
