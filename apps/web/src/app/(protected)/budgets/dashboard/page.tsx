'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetDashboardQuery } from '@/features/budgets/hooks/use-budget-dashboard';
import { formatAmount, formatPercent } from '@/features/budgets/lib/budget-formatters';

export default function BudgetDashboardPage() {
  const { data, isLoading, error, refetch } = useBudgetDashboardQuery();

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Dashboard Budgets"
          description="Cockpit de pilotage budgétaire."
        />

        {isLoading && (
          <div className="space-y-4" data-testid="budget-dashboard-loading">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
            <LoadingState rows={3} />
          </div>
        )}

        {error && (
          <div data-testid="budget-dashboard-error">
            <ErrorState
            message={error instanceof Error ? error.message : 'Erreur lors du chargement du dashboard.'}
            onRetry={() => void refetch()}
          />
          </div>
        )}

        {!isLoading && !error && !data && (
          <div data-testid="budget-dashboard-empty">
            <EmptyState
            title="Aucun budget ou exercice trouvé"
            description="Sélectionnez un client disposant d’un exercice et d’un budget, ou créez-en un."
          />
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="space-y-6" data-testid="budget-dashboard-content">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Contexte</CardTitle>
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

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card data-testid="kpi-total-budget">
                <CardHeader className="pb-1">
                  <CardDescription>Budget total</CardDescription>
                </CardHeader>
                <CardContent className="text-xl font-semibold">
                  {formatAmount(data.kpis.totalBudget, data.budget.currency)}
                </CardContent>
              </Card>
              <Card data-testid="kpi-committed">
                <CardHeader className="pb-1">
                  <CardDescription>Engagé</CardDescription>
                </CardHeader>
                <CardContent className="text-xl font-semibold">
                  {formatAmount(data.kpis.committed, data.budget.currency)}
                </CardContent>
              </Card>
              <Card data-testid="kpi-consumed">
                <CardHeader className="pb-1">
                  <CardDescription>Consommé</CardDescription>
                </CardHeader>
                <CardContent className="text-xl font-semibold">
                  {formatAmount(data.kpis.consumed, data.budget.currency)}
                </CardContent>
              </Card>
              <Card data-testid="kpi-forecast">
                <CardHeader className="pb-1">
                  <CardDescription>Prévision</CardDescription>
                </CardHeader>
                <CardContent className="text-xl font-semibold">
                  {formatAmount(data.kpis.forecast, data.budget.currency)}
                </CardContent>
              </Card>
              <Card data-testid="kpi-remaining">
                <CardHeader className="pb-1">
                  <CardDescription>Restant</CardDescription>
                </CardHeader>
                <CardContent className="text-xl font-semibold">
                  {formatAmount(data.kpis.remaining, data.budget.currency)}
                </CardContent>
              </Card>
              <Card data-testid="kpi-consumption-rate">
                <CardHeader className="pb-1">
                  <CardDescription>Taux de consommation</CardDescription>
                </CardHeader>
                <CardContent className="text-xl font-semibold">
                  {formatPercent(data.kpis.consumptionRate)}
                </CardContent>
              </Card>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition CAPEX / OPEX</CardTitle>
                  <CardDescription>Montants budgétés par type de dépense</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CAPEX</span>
                    <span className="font-medium">
                      {formatAmount(data.capexOpexDistribution.capex, data.budget.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>OPEX</span>
                    <span className="font-medium">
                      {formatAmount(data.capexOpexDistribution.opex, data.budget.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Évolution mensuelle</CardTitle>
                  <CardDescription>Engagé et consommé par mois</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.monthlyTrend.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune donnée</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {data.monthlyTrend.map((row) => (
                        <div
                          key={row.month}
                          className="flex justify-between text-sm"
                        >
                          <span>{row.month}</span>
                          <span>
                            E: {formatAmount(row.committed)} · C: {formatAmount(row.consumed)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {data.topEnvelopes && data.topEnvelopes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top enveloppes</CardTitle>
                  <CardDescription>Par montant consommé (max. 10)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Enveloppe</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Consommé</TableHead>
                        <TableHead className="text-right">Restant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topEnvelopes.map((e) => (
                        <TableRow key={e.envelopeId}>
                          <TableCell>
                            {e.code ? `${e.code} — ` : ''}{e.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(e.totalBudget, data.budget.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(e.consumed, data.budget.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(e.remaining, data.budget.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {data.riskEnvelopes && data.riskEnvelopes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Enveloppes à risque</CardTitle>
                  <CardDescription>Niveau de risque selon prévision / budget</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Enveloppe</TableHead>
                        <TableHead className="text-right">Prévision</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead>Niveau</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.riskEnvelopes.map((e) => (
                        <TableRow key={e.envelopeId}>
                          <TableCell>
                            {e.code ? `${e.code} — ` : ''}{e.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(e.forecast, data.budget.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(e.budgetAmount, data.budget.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                e.riskLevel === 'HIGH'
                                  ? 'destructive'
                                  : e.riskLevel === 'MEDIUM'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {e.riskLevel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {data.topBudgetLines && data.topBudgetLines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top lignes budgétaires</CardTitle>
                  <CardDescription>Par montant consommé (max. 10)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ligne</TableHead>
                        <TableHead>Enveloppe</TableHead>
                        <TableHead className="text-right">Consommé</TableHead>
                        <TableHead className="text-right">Prévision</TableHead>
                        <TableHead className="text-right">Restant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topBudgetLines.map((l) => (
                        <TableRow key={l.lineId}>
                          <TableCell>
                            {l.code ? `${l.code} — ` : ''}{l.name}
                          </TableCell>
                          <TableCell>{l.envelopeName ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            {formatAmount(l.consumed, data.budget.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(l.forecast, data.budget.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(l.remaining, data.budget.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
