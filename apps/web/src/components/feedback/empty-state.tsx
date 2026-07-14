'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'Aucune donnée',
  description = 'Aucun élément à afficher pour le moment.',
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5 px-6 py-12 text-center',
        className,
      )}
      data-testid="empty-state"
    >
      <div className="flex max-w-md flex-col items-center gap-2.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
