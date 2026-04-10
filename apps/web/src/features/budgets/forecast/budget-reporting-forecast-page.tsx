'use client';

import React from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { CockpitSurfaceCard } from '@/features/budgets/dashboard/components/budget-cockpit-primitives';
import { GitCompare } from 'lucide-react';
import { ForecastComparisonPanel } from '@/features/budgets/forecast/components/forecast-comparison-panel';

export function BudgetReportingForecastPage({
  budgetId,
  variant = 'page',
}: {
  budgetId: string;
  /** `embedded` : contenu seul pour l’onglet Comparaison sur la fiche budget (pas de PageContainer ni bandeau titre). */
  variant?: 'page' | 'embedded';
}) {
  const inner = (
    <div className={variant === 'embedded' ? 'space-y-6' : 'space-y-10'}>
      <CockpitSurfaceCard
        title="Comparaison budgétaire"
        description="Trois modes : actuel vs baseline ou version figée ; deux versions figées entre elles ; ou 2 à 4 versions figées vs le budget actuel (colonnes côte à côte)."
        icon={GitCompare}
        accent="primary"
      >
        <ForecastComparisonPanel budgetId={budgetId} />
      </CockpitSurfaceCard>

      {variant === 'page' ? (
        <p className="text-sm text-muted-foreground">
          <Link href={`/budgets/${budgetId}`} className="underline underline-offset-4">
            Retour au budget
          </Link>
        </p>
      ) : null}
    </div>
  );

  if (variant === 'embedded') {
    return inner;
  }

  return (
    <PageContainer>
      <BudgetPageHeader
        title="Comparaison budgétaire"
        description="Écarts vs baseline ou versions figées — pilotage DAF."
      />
      {inner}
    </PageContainer>
  );
}
