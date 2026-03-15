'use client';

import React from 'react';

interface PaginationSummaryProps {
  offset: number;
  limit: number;
  total: number;
  className?: string;
}

/**
 * Affiche "1–20 sur 84 résultats" (RFC-FE-003).
 */
export function PaginationSummary({ offset, limit, total, className }: PaginationSummaryProps) {
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const text =
    total === 0
      ? '0 résultat'
      : total === 1
        ? '1 résultat'
        : `${start}–${end} sur ${total} résultats`;
  return (
    <p className={className ?? 'text-sm text-muted-foreground'} data-testid="pagination-summary">
      {text}
    </p>
  );
}
