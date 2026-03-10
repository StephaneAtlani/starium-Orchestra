'use client';

import React from 'react';

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
      className={
        className ??
        'flex flex-col items-center justify-center py-12 px-4 text-center'
      }
      data-testid="empty-state"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
