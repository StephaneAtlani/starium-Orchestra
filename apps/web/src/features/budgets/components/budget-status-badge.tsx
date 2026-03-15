'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  ACTIVE: 'default',
  LOCKED: 'secondary',
  ARCHIVED: 'secondary',
  CLOSED: 'secondary',
  SUPERSEDED: 'outline',
};

interface BudgetStatusBadgeProps {
  status: string;
  className?: string;
}

export function BudgetStatusBadge({ status, className }: BudgetStatusBadgeProps) {
  const variant = STATUS_VARIANT[status] ?? 'outline';
  return (
    <Badge variant={variant} className={className} data-testid="budget-status-badge">
      {status}
    </Badge>
  );
}
