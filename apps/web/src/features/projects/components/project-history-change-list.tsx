'use client';

import type { ProjectHistoryChange } from '../types/project.types';

export function ProjectHistoryChangeList({ changes }: { changes: ProjectHistoryChange[] }) {
  if (changes.length === 0) return null;

  return (
    <dl className="mt-2 space-y-2 border-l-2 border-primary/20 pl-3">
      {changes.map((change) => (
        <div key={`${change.field}-${change.label}`} className="min-w-0">
          <dt className="text-xs font-medium text-foreground">{change.label}</dt>
          <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
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
