'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getCockpitAlertsSummary,
  type BudgetCockpitResponse,
} from '@/features/budgets/types/budget-dashboard.types';

export interface BudgetDetailAlertsBannerProps {
  dashboard: BudgetCockpitResponse | null | undefined;
  /** Bascule vers l'onglet Suivi, filtre lignes critiques. */
  onViewCriticalLines: () => void;
}

/**
 * Zone 2 bis du cockpit (RFC-FE-BUD-032 §3.A) : alertes réelles issues du widget `ALERT_LIST`
 * de l'API cockpit — plus aucune recommandation fabriquée côté client.
 * Information portée par icône + texte, jamais par la couleur seule.
 */
export function BudgetDetailAlertsBanner({
  dashboard,
  onViewCriticalLines,
}: BudgetDetailAlertsBannerProps) {
  const items = useMemo(() => {
    if (!dashboard) return [];
    const totals = getCockpitAlertsSummary(dashboard);
    return [
      {
        key: 'negativeRemaining',
        icon: ArrowDownRight,
        label: 'lignes en restant négatif',
        count: totals.negativeRemaining,
      },
      {
        key: 'overCommitted',
        icon: Wallet,
        label: 'lignes sur-engagées',
        count: totals.overCommitted,
      },
      {
        key: 'overConsumed',
        icon: Receipt,
        label: 'lignes surconsommées',
        count: totals.overConsumed,
      },
      {
        key: 'forecastOverBudget',
        icon: TrendingUp,
        label: 'lignes dont la prévision dépasse le budget',
        count: totals.forecastOverBudget,
      },
    ].filter((item) => item.count > 0);
  }, [dashboard]);

  return (
    <div role="status" aria-live="polite">
      {items.length === 0 ? null : (
        <section
          className="starium-section flex flex-col gap-3 border-[color-mix(in_srgb,var(--state-warning)_35%,var(--border))] bg-[color-mix(in_srgb,var(--state-warning-bg)_80%,var(--card))] sm:flex-row sm:items-center sm:justify-between"
          data-testid="budget-detail-alerts-banner"
        >
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle
              className="mt-0.5 size-5 shrink-0 text-[color:var(--state-warning)]"
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Points de vigilance sur ce budget
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
                {items.map(({ key, icon: Icon, label, count }) => (
                  <li key={key} className="flex items-center gap-1.5">
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="tabular-nums font-semibold">{count}</span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0 sm:min-h-9"
            onClick={onViewCriticalLines}
          >
            Voir les lignes concernées
          </Button>
        </section>
      )}
    </div>
  );
}
