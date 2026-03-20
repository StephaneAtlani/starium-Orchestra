'use client';

import React, { useRef } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { useBudgetDashboardPage } from './hooks/use-budget-dashboard-page';
import { BudgetDashboardShell } from './components/budget-dashboard-shell';
import { BudgetDashboardSkeleton } from './components/budget-dashboard-skeleton';
import { BudgetDashboardEmptyState } from './components/budget-dashboard-empty-state';
import { BudgetDashboardErrorState } from './components/budget-dashboard-error-state';
import { BudgetDashboardHeader } from './components/budget-dashboard-header';
import { BudgetKpiGrid } from './components/budget-kpi-grid';
import { BudgetAlertsPanel } from './components/budget-alerts-panel';
import { BudgetAnalyticsGrid } from './components/budget-analytics-grid';
import { BudgetTopEnvelopesCard } from './components/budget-top-envelopes-card';
import { BudgetEnvelopesTable } from './components/budget-envelopes-table';
import { BudgetLinesCritiqueTable } from './components/budget-lines-critique-table';
import { cockpitCardClass } from './components/budget-dashboard-shell';

export function BudgetDashboardPage() {
  const criticalRef = useRef<HTMLDivElement>(null);
  const scrollToCritical = () => {
    criticalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const {
    exerciseId,
    budgetId,
    exerciseSelectLabel,
    budgetSelectLabel,
    onExerciseChange,
    onBudgetChange,
    refresh,
    data,
    isLoading,
    isFetching,
    error,
    exercises,
    exercisesLoading,
    budgets,
    budgetsLoading,
  } = useBudgetDashboardPage();

  const {
    taxDisplayMode,
    setTaxDisplayMode,
    isLoading: taxDisplayLoading,
    defaultTaxRate,
  } = useTaxDisplayMode();

  const err = error instanceof Error ? error : null;

  return (
    <RequireActiveClient>
      <PageContainer>
        {isLoading && <BudgetDashboardSkeleton />}

        {!isLoading && err && (
          <BudgetDashboardErrorState
            message={err.message || 'Impossible de charger le cockpit budget.'}
            onRetry={refresh}
          />
        )}

        {!isLoading && !err && !data && <BudgetDashboardEmptyState />}

        {!isLoading && !err && data && (
          <BudgetDashboardShell data-testid="budget-dashboard-content">
            <BudgetDashboardHeader
              exercises={exercises}
              budgets={budgets}
              exerciseId={exerciseId}
              budgetId={budgetId}
              exerciseSelectLabel={exerciseSelectLabel}
              budgetSelectLabel={budgetSelectLabel}
              exercisesLoading={exercisesLoading}
              budgetsLoading={budgetsLoading}
              onExerciseChange={onExerciseChange}
              onBudgetChange={onBudgetChange}
              onRefresh={refresh}
              isFetching={isFetching}
              taxDisplayMode={taxDisplayMode}
              onTaxDisplayModeChange={setTaxDisplayMode}
              taxDisplayLoading={taxDisplayLoading}
            />

            <Card className={cockpitCardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Contexte
                </CardTitle>
                <CardDescription>
                  Exercice : {data.exercise.name}
                  {data.exercise.code ? ` (${data.exercise.code})` : ''}
                  {' · '}
                  Budget : {data.budget.name}
                  {data.budget.code ? ` (${data.budget.code})` : ''}
                  {' · '}
                  {data.budget.currency}
                </CardDescription>
              </CardHeader>
            </Card>

            <BudgetKpiGrid
              data={data}
              taxDisplayMode={taxDisplayMode}
              defaultTaxRate={defaultTaxRate}
            />

            <BudgetAlertsPanel
              alertsSummary={data.alertsSummary}
              onViewCriticalLines={scrollToCritical}
            />

            <BudgetAnalyticsGrid
              data={data}
              taxDisplayMode={taxDisplayMode}
              defaultTaxRate={defaultTaxRate}
            />

            {data.topEnvelopes && data.topEnvelopes.length > 0 && (
              <BudgetTopEnvelopesCard
                rows={data.topEnvelopes}
                currency={data.budget.currency}
                taxDisplayMode={taxDisplayMode}
                defaultTaxRate={defaultTaxRate}
                onRowClick={scrollToCritical}
              />
            )}

            {data.riskEnvelopes && data.riskEnvelopes.length > 0 && (
              <BudgetEnvelopesTable
                rows={data.riskEnvelopes}
                currency={data.budget.currency}
                taxDisplayMode={taxDisplayMode}
                defaultTaxRate={defaultTaxRate}
                onRowClick={scrollToCritical}
              />
            )}

            <div ref={criticalRef}>
              {data.criticalBudgetLines && (
                <BudgetLinesCritiqueTable
                  rows={data.criticalBudgetLines}
                  currency={data.budget.currency}
                  budgetId={data.budget.id}
                  taxDisplayMode={taxDisplayMode}
                  defaultTaxRate={defaultTaxRate}
                />
              )}
            </div>

            {data.topBudgetLines && data.topBudgetLines.length > 0 && (
              <Card className={cockpitCardClass}>
                <CardHeader>
                  <CardTitle className="text-base">Top lignes (consommation)</CardTitle>
                  <CardDescription>
                    Max. 10 — par montant consommé
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Ligne</TableHead>
                        <TableHead className="text-muted-foreground">Enveloppe</TableHead>
                        <TableHead className="text-right text-muted-foreground">
                          Consommé
                        </TableHead>
                        <TableHead className="text-right text-muted-foreground">
                          Forecast
                        </TableHead>
                        <TableHead className="text-right text-muted-foreground">
                          Restant
                        </TableHead>
                        <TableHead className="text-muted-foreground">Gravité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topBudgetLines.map((l) => (
                        <TableRow key={l.lineId} className="border-border">
                          <TableCell className="text-foreground">
                            {l.code ? `${l.code} — ` : ''}
                            {l.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {l.envelopeName ?? '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatDashboardAmount({
                              ht: l.consumed,
                              currency: data.budget.currency,
                              mode: taxDisplayMode,
                              defaultTaxRate,
                            })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatDashboardAmount({
                              ht: l.forecast,
                              currency: data.budget.currency,
                              mode: taxDisplayMode,
                              defaultTaxRate,
                            })}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatDashboardAmount({
                              ht: l.remaining,
                              currency: data.budget.currency,
                              mode: taxDisplayMode,
                              defaultTaxRate,
                            })}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                l.lineRiskLevel === 'CRITICAL'
                                  ? 'text-destructive'
                                  : l.lineRiskLevel === 'WARNING'
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                              }
                            >
                              {l.lineRiskLevel}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </BudgetDashboardShell>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
