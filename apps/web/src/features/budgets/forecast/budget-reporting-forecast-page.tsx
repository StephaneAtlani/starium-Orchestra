'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { CockpitSurfaceCard } from '@/features/budgets/dashboard/components/budget-cockpit-primitives';
import { BarChart3, GitCompare } from 'lucide-react';
import { useBudgetForecast } from '@/features/budgets/forecast/hooks/use-budget-forecast';
import { ForecastKpiCards } from '@/features/budgets/forecast/components/forecast-kpi-cards';
import { ForecastComparisonPanel } from '@/features/budgets/forecast/components/forecast-comparison-panel';

export function BudgetReportingForecastPage({ budgetId }: { budgetId: string }) {
  const forecastQuery = useBudgetForecast(budgetId);

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
          description="Quatre modes : actuel vs baseline/snapshot/version ; deux snapshots entre eux ; deux versions ; ou 2 à 4 snapshots vs le budget actuel (colonnes côte à côte)."
          icon={GitCompare}
          accent="primary"
        >
          <ForecastComparisonPanel budgetId={budgetId} />
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
