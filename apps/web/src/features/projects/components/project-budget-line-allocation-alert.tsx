'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BudgetLineAllocationWarning } from '../lib/project-budget-line-allocation-check';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

type Props = {
  warning: BudgetLineAllocationWarning;
  currency?: string;
  className?: string;
  id?: string;
};

export function ProjectBudgetLineAllocationAlert({
  warning,
  currency = 'EUR',
  className,
  id,
}: Props) {
  const fmt = (value: number) => formatCurrency(value, currency);

  let message: string;
  if (warning.exceedsLineBudget) {
    message = `L’allocation projet (${fmt(warning.projectAllocation)}) dépasse le budget de la ligne « ${warning.lineLabel} » (${fmt(warning.lineBudget)}).`;
  } else {
    message = `L’allocation projet (${fmt(warning.projectAllocation)}) dépasse le disponible sur la ligne « ${warning.lineLabel} » (${fmt(warning.lineRemaining)} restants sur ${fmt(warning.lineBudget)}).`;
  }

  return (
    <div
      id={id}
      className={cn(
        'starium-proj-budget-line-alert',
        warning.severity === 'danger'
          ? 'starium-proj-budget-line-alert--danger'
          : 'starium-proj-budget-line-alert--warning',
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="starium-proj-budget-line-alert__title">
          {warning.exceedsLineBudget ? 'Dépassement du budget ligne' : 'Disponible ligne insuffisant'}
        </p>
        <p className="starium-proj-budget-line-alert__text">{message}</p>
      </div>
    </div>
  );
}
