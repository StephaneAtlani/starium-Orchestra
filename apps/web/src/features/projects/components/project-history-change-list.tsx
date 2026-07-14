'use client';

import { cn } from '@/lib/utils';
import type { ProjectHistoryChange } from '../types/project.types';

export function ProjectHistoryChangeList({
  changes,
  variant = 'default',
}: {
  changes: ProjectHistoryChange[];
  variant?: 'default' | 'timeline';
}) {
  if (changes.length === 0) return null;

  return (
    <dl
      className={cn(
        'mt-2 space-y-2',
        variant === 'timeline'
          ? 'rounded-md border border-border/60 bg-muted/20 px-3 py-2'
          : 'border-l-2 border-primary/20 pl-3',
      )}
    >
      {changes.map((change) => (
        <div key={`${change.field}-${change.label}`} className="min-w-0">
          <dt className="text-xs font-medium text-foreground">{change.label}</dt>
          <dd
            className={cn(
              'mt-0.5 text-xs leading-relaxed text-muted-foreground',
              variant === 'timeline' && 'break-words',
            )}
          >
            <span className="text-foreground/70" title={change.before ?? undefined}>
              {change.before ?? '—'}
            </span>
            <span aria-hidden className="mx-1.5 text-foreground/40">
              →
            </span>
            <span className="text-foreground" title={change.after ?? undefined}>
              {change.after ?? '—'}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
