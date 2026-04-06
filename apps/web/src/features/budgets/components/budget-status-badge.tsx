'use client';

import { RegistryBadge } from '@/lib/ui/registry-badge';
import { cn } from '@/lib/utils';
import {
  BUDGET_STATUS_KEYS,
  budgetStatusBadgeClass,
  budgetStatusLabel,
} from '@/lib/ui/badge-registry';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';

/** Valeurs hors enum courant (ex. anciennes données) — repli visuel. */
const STATUS_CLASS_FALLBACK: Record<string, string> = {
  DRAFT: 'border border-border text-foreground',
  SUBMITTED: 'bg-primary/15 text-primary',
  REVISED: 'bg-amber-500/15 text-amber-900 dark:text-amber-100',
  VALIDATED: 'bg-primary text-primary-foreground',
  LOCKED: 'bg-secondary text-secondary-foreground',
  ARCHIVED: 'bg-secondary text-secondary-foreground',
  CLOSED: 'bg-secondary text-secondary-foreground',
  SUPERSEDED: 'border border-border text-foreground',
};

const STATUS_LABEL_FR: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  REVISED: 'Révisé',
  VALIDATED: 'Validé',
  LOCKED: 'Verrouillé',
  ARCHIVED: 'Archivé',
  CLOSED: 'Clos',
  SUPERSEDED: 'Remplacé',
};

interface BudgetStatusBadgeProps {
  status: string;
  className?: string;
}

export function BudgetStatusBadge({ status, className }: BudgetStatusBadgeProps) {
  const { merged } = useClientUiBadgeConfig();
  const inRegistry = (BUDGET_STATUS_KEYS as readonly string[]).includes(status);

  if (inRegistry) {
    return (
      <RegistryBadge
        className={cn(budgetStatusBadgeClass(merged, status), className)}
        data-testid="budget-status-badge"
        data-status={status}
        title={status}
      >
        {budgetStatusLabel(merged, status)}
      </RegistryBadge>
    );
  }

  const label = STATUS_LABEL_FR[status] ?? status;
  return (
    <RegistryBadge
      className={cn(
        STATUS_CLASS_FALLBACK[status] ?? 'border border-border text-foreground',
        className,
      )}
      data-testid="budget-status-badge"
      data-status={status}
      title={status}
    >
      {label}
    </RegistryBadge>
  );
}
