'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function WidgetSlideShell({
  title,
  children,
  fullWidth,
  className,
}: {
  title: string;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'starium-present-widget-shell flex h-full min-h-0 flex-col p-2.5',
        fullWidth && 'starium-present-widget-shell--full',
        className,
      )}
    >
      <p className="mb-1.5 truncate text-[0.625rem] font-bold uppercase tracking-wide starium-present-text-muted">
        {title}
      </p>
      <div className="min-h-0 flex-1 overflow-hidden starium-present-text">{children}</div>
    </div>
  );
}

export function WidgetSlideList({
  items,
  emptyLabel,
}: {
  items: string[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs starium-present-text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1 text-xs leading-snug starium-present-text">
      {items.slice(0, 3).map((item, i) => (
        <li key={`${item}-${i}`} className="line-clamp-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function WidgetSlideBars({
  items,
  emptyLabel,
}: {
  items: Array<{ label: string; value: number }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs starium-present-text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-1.5">
      {items.slice(0, 3).map((item, i) => (
        <div key={`${item.label}-${i}`}>
          <div className="mb-0.5 flex justify-between gap-1 text-[0.625rem]">
            <span className="starium-present-text truncate">{item.label}</span>
            <span className="tabular-nums starium-present-text-muted">{Math.round(item.value)} %</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[color:var(--present-line)]">
            <div
              className="h-full rounded-full bg-[color:var(--brand-gold)]"
              style={{ width: `${Math.min(100, item.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetSlideTimeline({
  items,
  emptyLabel,
}: {
  items: Array<{ title: string; subtitle: string; date: string }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs starium-present-text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1.5 text-xs starium-present-text">
      {items.slice(0, 3).map((item, i) => (
        <li key={`${item.title}-${i}`} className="min-w-0">
          <p className="truncate font-medium">{item.title}</p>
          <p className="truncate starium-present-text-muted">{item.date} · {item.subtitle}</p>
        </li>
      ))}
    </ul>
  );
}

export function WidgetSlideKpiGrid({
  cells,
}: {
  cells: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((cell) => (
        <div key={cell.label} className="rounded-md starium-present-surface-pill px-2 py-1.5">
          <p className="text-[0.6rem] uppercase tracking-wide starium-present-text-subtle">{cell.label}</p>
          <p className="starium-present-text text-sm font-bold tabular-nums">{cell.value}</p>
        </div>
      ))}
    </div>
  );
}
