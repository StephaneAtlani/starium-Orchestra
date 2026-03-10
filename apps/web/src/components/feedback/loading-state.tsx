'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  /** Nombre de lignes skeleton (pour table) */
  rows?: number;
  className?: string;
}

export function LoadingState({ rows = 5, className }: LoadingStateProps) {
  return (
    <div className={className ?? 'space-y-3 py-4'} data-testid="loading-state">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
