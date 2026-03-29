'use client';

import React from 'react';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { cn } from '@/lib/utils';

/** Même sémantique qu’avant (default / secondary / outline), sans variante shadcn qui écrase les couleurs. */
const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'border border-border text-foreground',
  ACTIVE: 'bg-primary text-primary-foreground',
  LOCKED: 'bg-secondary text-secondary-foreground',
  ARCHIVED: 'bg-secondary text-secondary-foreground',
  CLOSED: 'bg-secondary text-secondary-foreground',
  SUPERSEDED: 'border border-border text-foreground',
};

interface BudgetStatusBadgeProps {
  status: string;
  className?: string;
}

export function BudgetStatusBadge({ status, className }: BudgetStatusBadgeProps) {
  return (
    <RegistryBadge
      className={cn(STATUS_CLASS[status] ?? 'border border-border text-foreground', className)}
      data-testid="budget-status-badge"
    >
      {status}
    </RegistryBadge>
  );
}
