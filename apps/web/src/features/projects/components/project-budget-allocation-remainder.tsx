'use client';

import { cn } from '@/lib/utils';
import type { AllocationRemainder } from '../lib/project-budget-allocation';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value);
}

type Props = {
  mode: 'FIXED' | 'PERCENTAGE';
  remainder: AllocationRemainder | null;
  forecastCost?: number | null;
  currency?: string;
};

export function ProjectBudgetAllocationRemainder({
  mode,
  remainder,
  forecastCost = null,
  currency = 'EUR',
}: Props) {
  if (mode === 'FIXED' && remainder == null) {
    return (
      <p className="starium-proj-budget-remainder starium-proj-budget-remainder--muted" role="status">
        Renseignez le coût prévisionnel sur la fiche projet pour suivre le reste à allouer en
        montant fixe.
      </p>
    );
  }

  if (!remainder) return null;

  const formatValue = (value: number) =>
    mode === 'FIXED' ? formatCurrency(value, currency) : `${formatPercent(value)} %`;

  const allocatedLabel = mode === 'FIXED' ? 'Déjà imputé' : 'Déjà réparti';
  const remainingLabel = mode === 'FIXED' ? 'Reste à allouer' : 'Reste à répartir';
  const referenceHint =
    mode === 'FIXED'
      ? forecastCost != null
        ? `sur le coût prévisionnel (${formatCurrency(forecastCost, currency)})`
        : 'sur le coût prévisionnel de la fiche projet'
      : 'sur la répartition du projet (100 %)';

  const remainingTone =
    remainder.remaining < 0
      ? 'starium-proj-budget-remainder__val--danger'
      : remainder.remaining === 0
        ? 'starium-proj-budget-remainder__val--warning'
        : 'starium-proj-budget-remainder__val--success';

  const afterDraftTone =
    remainder.remainingAfterDraft != null && remainder.remainingAfterDraft < 0
      ? 'starium-proj-budget-remainder__val--danger'
      : remainder.remainingAfterDraft === 0
        ? 'starium-proj-budget-remainder__val--warning'
        : undefined;

  return (
    <div
      className="starium-proj-budget-remainder"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="starium-proj-budget-remainder__title">{remainingLabel}</p>
      <p className="starium-proj-budget-remainder__hint">{referenceHint}</p>
      <dl className="starium-proj-budget-remainder__grid">
        <div>
          <dt>{allocatedLabel}</dt>
          <dd className="tabular-nums">{formatValue(remainder.allocated)}</dd>
        </div>
        <div>
          <dt>{remainingLabel}</dt>
          <dd className={cn('tabular-nums font-semibold', remainingTone)}>
            {formatValue(remainder.remaining)}
          </dd>
        </div>
        {remainder.draft != null && remainder.remainingAfterDraft != null ? (
          <div className="starium-proj-budget-remainder__after-draft">
            <dt>{mode === 'FIXED' ? 'Après ce montant' : 'Après ce pourcentage'}</dt>
            <dd className={cn('tabular-nums font-semibold', afterDraftTone)}>
              {formatValue(remainder.remainingAfterDraft)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
