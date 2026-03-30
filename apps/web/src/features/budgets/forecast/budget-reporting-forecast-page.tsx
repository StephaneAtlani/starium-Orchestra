'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { CockpitSurfaceCard } from '@/features/budgets/dashboard/components/budget-cockpit-primitives';
import { BarChart3, GitCompare } from 'lucide-react';
import { useBudgetForecast } from '@/features/budgets/forecast/hooks/use-budget-forecast';
import { useBudgetComparison } from '@/features/budgets/forecast/hooks/use-budget-comparison';
import { useBudgetSnapshotsForSelect } from '@/features/budgets/forecast/hooks/use-budget-snapshots-for-select';
import { useBudgetVersionHistory } from '@/features/budgets/forecast/hooks/use-budget-version-history';
import { ForecastKpiCards } from '@/features/budgets/forecast/components/forecast-kpi-cards';
import { ComparisonTable } from '@/features/budgets/forecast/components/comparison-table';
import { BudgetComparisonSelector } from '@/features/budgets/forecast/components/budget-comparison-selector';
import type { BudgetComparisonMode } from '@/features/budgets/types/budget-forecast.types';

export function BudgetReportingForecastPage({ budgetId }: { budgetId: string }) {
  const [compareTo, setCompareTo] = useState<BudgetComparisonMode>('baseline');
  const [targetId, setTargetId] = useState<string | undefined>(undefined);

  const handleCompareToChange = useCallback((mode: BudgetComparisonMode) => {
    setCompareTo(mode);
    setTargetId(undefined);
  }, []);

  const forecastQuery = useBudgetForecast(budgetId);
  const snapshotsQuery = useBudgetSnapshotsForSelect(budgetId, {
    enabled: compareTo === 'snapshot',
  });
  const versionsQuery = useBudgetVersionHistory(budgetId, {
    enabled: compareTo === 'version',
  });

  const comparisonQuery = useBudgetComparison(budgetId, compareTo, targetId);

  return (
    <PageContainer>
        <BudgetPageHeader
          title="Forecast & comparaison"
          description="Projection et écarts vs baseline, snapshot ou autre version — pilotage DAF."
        />

        <div className="space-y-10">
          <CockpitSurfaceCard
            title="Synthèse forecast"
            description="Agrégats budget issus du moteur financial — même périmètre que le reporting."
            icon={BarChart3}
            accent="sky"
          >
            <ForecastKpiCards
              data={forecastQuery.data}
              isLoading={forecastQuery.isLoading}
              error={forecastQuery.error as Error | null}
            />
          </CockpitSurfaceCard>

          <CockpitSurfaceCard
            title="Comparaison budgétaire"
            description="Référence à gauche, périmètre comparé à droite — montants et variances renvoyés par l’API."
            icon={GitCompare}
            accent="primary"
          >
            <div className="space-y-6">
              <BudgetComparisonSelector
                compareTo={compareTo}
                onCompareToChange={handleCompareToChange}
                targetId={targetId}
                onTargetIdChange={setTargetId}
                currentBudgetId={budgetId}
                snapshots={snapshotsQuery.data?.items ?? []}
                snapshotsLoading={snapshotsQuery.isLoading}
                versions={versionsQuery.data ?? []}
                versionsLoading={versionsQuery.isLoading}
                versionsError={versionsQuery.isError}
              />

              {compareTo === 'snapshot' && snapshotsQuery.isError && (
                <p className="text-sm text-destructive">
                  Impossible de charger la liste des snapshots.
                </p>
              )}

              {compareTo === 'version' && versionsQuery.isError && (
                <p className="text-sm text-destructive">
                  {(versionsQuery.error as Error)?.message ??
                    'Historique de versions indisponible (budget non versionné ?).'}
                </p>
              )}

              {((compareTo === 'snapshot' || compareTo === 'version') && !targetId) ? (
                <p className="text-sm text-muted-foreground" data-testid="comparison-idle">
                  Sélectionnez{' '}
                  {compareTo === 'snapshot' ? 'un snapshot' : 'une version cible'} pour lancer la
                  comparaison.
                </p>
              ) : (
                <ComparisonTable
                  data={comparisonQuery.data}
                  isLoading={comparisonQuery.isLoading}
                  error={comparisonQuery.error as Error | null}
                />
              )}
            </div>
          </CockpitSurfaceCard>

          <p className="text-sm text-muted-foreground">
            <Link href={`/budgets/${budgetId}`} className="underline underline-offset-4">
              Retour au budget
            </Link>
          </p>
        </div>
    </PageContainer>
  );
}
