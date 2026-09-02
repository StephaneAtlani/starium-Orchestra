'use client';

import { Badge } from '@/components/ui/badge';
import type { BudgetImportJobStatus } from '../types/budget-imports.types';

const STATUS_META: Record<
  BudgetImportJobStatus,
  { label: string; className: string }
> = {
  ANALYZED: {
    label: 'Analysé',
    className: 'border-border bg-muted/40 text-foreground',
  },
  PREVIEWED: {
    label: 'Prévisualisé',
    className: 'border-border bg-muted/40 text-foreground',
  },
  RUNNING: {
    label: 'En cours',
    className: 'border-border bg-[color:var(--state-info-bg)] text-foreground',
  },
  COMPLETED: {
    label: 'Terminé',
    className: 'border-border bg-[color:var(--state-success-bg)] text-foreground',
  },
  FAILED: {
    label: 'Échec',
    className: 'border-border bg-[color:var(--state-danger-bg)] text-foreground',
  },
};

export function ImportJobStatusBadge({ status }: { status: BudgetImportJobStatus }) {
  const meta = STATUS_META[status] ?? {
    label: 'Statut inconnu',
    className: 'border-border bg-muted/40 text-foreground',
  };
  return (
    <Badge variant="outline" className={meta.className}>
      {meta.label}
    </Badge>
  );
}
