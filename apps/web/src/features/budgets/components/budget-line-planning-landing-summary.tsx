'use client';

import { cn } from '@/lib/utils';
import { formatAmount } from '../lib/budget-formatters';
import type { BudgetLinePlanningResponse } from '../types/budget-line-planning.types';

interface BudgetLinePlanningLandingSummaryProps {
  data: BudgetLinePlanningResponse;
  currency: string;
  className?: string;
}

export function BudgetLinePlanningLandingSummary({
  data,
  currency,
  className,
}: BudgetLinePlanningLandingSummaryProps) {
  const landingVar = data.landingVariance ?? data.variance ?? 0;
  const planningD = data.planningDelta ?? data.deltaVsRevised ?? 0;

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-muted/30 px-3 py-2 text-xs',
        className,
      )}
    >
      <div className="mb-2 font-semibold text-foreground">Synthèse atterrissage</div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Révisé</dt>
          <dd className="tabular-nums font-medium">{formatAmount(data.revisedAmount, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Consommé</dt>
          <dd className="tabular-nums font-medium">{formatAmount(data.consumedAmount, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Engagé</dt>
          <dd className="tabular-nums font-medium">{formatAmount(data.committedAmount, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Prévision restante</dt>
          <dd className="tabular-nums font-medium">{formatAmount(data.remainingPlanning, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Atterrissage</dt>
          <dd className="tabular-nums font-medium">{formatAmount(data.landing, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Écart (atterrissage)</dt>
          <dd
            className={cn(
              'tabular-nums font-semibold',
              landingVar > 0 ? 'text-red-600' : 'text-foreground',
            )}
          >
            {formatAmount(landingVar, currency)}
          </dd>
        </div>
      </dl>
      {landingVar > 0 && (
        <p className="mt-2 text-red-600">
          Alerte : atterrissage projeté au-dessus du budget révisé.
        </p>
      )}
      <p className="mt-2 text-muted-foreground">
        Écart prévision 12 mois vs révisé :{' '}
        <span className="font-medium text-foreground tabular-nums">
          {formatAmount(planningD, currency)}
        </span>
      </p>
    </div>
  );
}
