'use client';

import { useMemo, useState } from 'react';
import { GitCompare, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useBudgetForecast } from '@/features/budgets/forecast/hooks/use-budget-forecast';
import { useBudgetSnapshotsForSelect } from '@/features/budgets/forecast/hooks/use-budget-snapshots-for-select';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';

/** Coefficients indicatifs — en attente d’API scénarios backend. */
const SCENARIO_LOW_FACTOR = 0.94;
const SCENARIO_HIGH_FACTOR = 1.11;

type ScenarioKind = 'low' | 'central' | 'high';

type BudgetScenariosVersionsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
  exerciseYearLabel: string | null;
  currency: string;
  kpi: BudgetSummaryKpi | undefined;
  lines: BudgetLine[];
  onOpenDetailedComparison?: () => void;
};

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactAmount(value: number): string {
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)} k€`;
  }
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLineLabel(line: BudgetLine): string {
  return line.code ? `${line.name} (${line.code})` : line.name;
}

export function BudgetScenariosVersionsModal({
  open,
  onOpenChange,
  budgetId,
  budgetName,
  exerciseYearLabel,
  currency,
  kpi,
  lines,
  onOpenDetailedComparison,
}: BudgetScenariosVersionsModalProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKind>('central');
  const forecastQuery = useBudgetForecast(budgetId, { enabled: open });
  const snapshotsQuery = useBudgetSnapshotsForSelect(budgetId, { enabled: open });

  const totalBudget = kpi?.totalInitialAmount ?? forecastQuery.data?.totalBudget ?? 0;
  const totalCentral = kpi?.totalForecastAmount ?? forecastQuery.data?.totalForecast ?? 0;
  const totalLow = totalCentral * SCENARIO_LOW_FACTOR;
  const totalHigh = totalCentral * SCENARIO_HIGH_FACTOR;

  const scenarioCards = useMemo(
    () => [
      {
        id: 'low' as const,
        label: 'Scénario bas',
        total: totalLow,
        description: 'Projection indicative à partir du forecast actuel.',
      },
      {
        id: 'central' as const,
        label: 'Scénario central',
        total: totalCentral,
        description: 'Forecast live du budget — référence actuelle.',
      },
      {
        id: 'high' as const,
        label: 'Scénario haut',
        total: totalHigh,
        description: 'Projection indicative à partir du forecast actuel.',
      },
    ],
    [totalCentral, totalHigh, totalLow],
  );

  const comparisonRows = useMemo(
    () =>
      [...lines]
        .map((line) => {
          const budgetAmount = line.initialAmount;
          const central = line.forecastAmount;
          const low = central * SCENARIO_LOW_FACTOR;
          const high = central * SCENARIO_HIGH_FACTOR;
          return {
            id: line.id,
            label: formatLineLabel(line),
            budgetAmount,
            low,
            central,
            high,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'fr-FR')),
    [lines],
  );

  const isLoading = forecastQuery.isLoading || snapshotsQuery.isLoading;
  const error = forecastQuery.error ?? snapshotsQuery.error;

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Scénarios et versions budgétaires"
      description={`${budgetName}${exerciseYearLabel ? ` · exercice ${exerciseYearLabel}` : ''} · atterrissage projeté`}
      icon={GitCompare}
      size="full"
      bodyClassName="max-h-[78vh] overflow-y-auto"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
          {onOpenDetailedComparison ? (
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              onClick={() => {
                onOpenChange(false);
                onOpenDetailedComparison();
              }}
            >
              Comparaison détaillée
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Trois hypothèses d’atterrissage comparées au budget alloué de{' '}
          <strong>{formatAmount(totalBudget, currency)}</strong>. Le scénario central repose sur le
          forecast live ; bas et haut sont des projections indicatives en attente d’API scénarios.
        </p>

        <Alert>
          <AlertDescription>
            Les scénarios bas et haut utilisent des coefficients indicatifs (
            {SCENARIO_LOW_FACTOR.toLocaleString('fr-FR')} / {SCENARIO_HIGH_FACTOR.toLocaleString('fr-FR')}
            ) appliqués au forecast actuel. Ils ne remplacent pas une validation CODIR.
          </AlertDescription>
        </Alert>

        {isLoading ? <LoadingState rows={3} /> : null}

        {error ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Une erreur est survenue.'}
          />
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              {scenarioCards.map((scenario) => {
                const delta = scenario.total - totalBudget;
                const selected = selectedScenario === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={cn(
                      'rounded-xl border p-4 text-left shadow-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected
                        ? 'border-[color:var(--brand-gold)] bg-card ring-1 ring-[color:var(--brand-gold)]/30'
                        : 'border-border/70 bg-card hover:bg-muted/20',
                    )}
                    aria-pressed={selected}
                  >
                    <p className="starium-overline text-muted-foreground">{scenario.label}</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                      {formatAmount(scenario.total, currency)}
                    </p>
                    <p
                      className={cn(
                        'mt-1 text-sm font-medium tabular-nums',
                        delta > 0 ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {delta > 0 ? '+' : ''}
                      {formatAmount(delta, currency)} vs budget
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{scenario.description}</p>
                  </button>
                );
              })}
            </div>

            <section className="space-y-3">
              <p className="starium-overline text-muted-foreground">Comparaison par ligne</p>
              {comparisonRows.length === 0 ? (
                <EmptyState
                  title="Aucune ligne budgétaire"
                  description="Ajoutez des lignes au budget pour comparer les scénarios."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ligne budgétaire</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                        <TableHead className="text-right">Bas</TableHead>
                        <TableHead className="text-right">Central</TableHead>
                        <TableHead className="text-right">Haut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCompactAmount(row.budgetAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCompactAmount(row.low)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums font-semibold',
                              row.central > row.budgetAmount && 'text-destructive',
                            )}
                          >
                            {formatCompactAmount(row.central)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums font-semibold',
                              row.high > row.budgetAmount && 'text-destructive',
                            )}
                          >
                            {formatCompactAmount(row.high)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <p className="starium-overline text-muted-foreground">Versions budgétaires</p>
              <article className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{budgetName}</p>
                    <p className="text-sm text-muted-foreground">Version de travail — modifiable</p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </article>

              {(snapshotsQuery.data?.items ?? []).map((snapshot) => (
                <article
                  key={snapshot.id}
                  className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{snapshot.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Figée le{' '}
                        {new Intl.DateTimeFormat('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }).format(new Date(snapshot.snapshotDate))}
                        {snapshot.createdByLabel ? ` · ${snapshot.createdByLabel}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Lock className="size-3" aria-hidden />
                      Verrouillée
                    </Badge>
                  </div>
                </article>
              ))}

              {(snapshotsQuery.data?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune version figée pour ce budget. Créez un snapshot depuis la fiche budget.
                </p>
              ) : null}
            </section>

            <Alert>
              <AlertDescription>
                Une version verrouillée sert de référence de comparaison. Seule la version active
                accepte les saisies, imports et réaffectations.
              </AlertDescription>
            </Alert>
          </>
        ) : null}
      </div>
    </StariumModal>
  );
}
