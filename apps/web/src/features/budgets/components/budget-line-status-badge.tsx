'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { budgetLineStatusLabel } from '../constants/budget-line-status-options';

function variantForStatus(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'DRAFT':
    case 'PENDING_VALIDATION':
      return 'secondary';
    case 'REJECTED':
    case 'ARCHIVED':
      return 'outline';
    case 'DEFERRED':
      return 'outline';
    case 'CLOSED':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function BudgetLineStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge variant={variantForStatus(status)} className={cn('font-normal', className)}>
      {budgetLineStatusLabel(status)}
    </Badge>
  );
}
