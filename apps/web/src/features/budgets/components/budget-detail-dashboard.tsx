'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';
import type {
  BudgetCockpitResponse,
  BudgetDashboardLineRow,
} from '@/features/budgets/types/budget-dashboard.types';
import { formatPercent } from '@/features/budgets/lib/budget-formatters';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { BUDGET_LABELS } from '@/features/budgets/lib/budget-display-labels';
import { RealizedVsPlannedBarChart } from '@/features/budgets/components/realized-vs-planned-bar-chart';
import { buildRealizedVsPlannedChartRows } from '@/features/budgets/lib/build-realized-vs-planned-chart';
import type {
  BudgetEnvelope,
  BudgetLine,
} from '@/features/budgets/types/budget-management.types';
import { Badge } from '@/components/ui/badge';
import { PortfolioProgressBar, TableToneAmount } from '@/components/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StariumTableWrap } from '@/components/ui/starium-table-wrap';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type EnvelopeSummaryRow = {
  envelopeId: string;
  name: string;
  code: string | null;
  type: string;
  initial: number;
  committed: number;
  consumed: number;
  forecast: number;
  remaining: number;
  overrun: number;
  executionRate: number;
  scopedLines: BudgetLine[];
};

type AmountSummary = Pick<
  EnvelopeSummaryRow,
  'initial' | 'committed' | 'consumed' | 'forecast' | 'remaining' | 'overrun' | 'executionRate'
>;

const MAX_CRITICAL_LINES = 6;

function summarizeAmounts(scopedLines: BudgetLine[], initial: number): AmountSummary {
  const committed = scopedLines.reduce((sum, line) => sum + line.committedAmount, 0);
  const consumed = scopedLines.reduce((sum, line) => sum + line.consumedAmount, 0);
  const forecast = scopedLines.reduce((sum, line) => sum + line.forecastAmount, 0);
  const remaining = scopedLines.reduce((sum, line) => sum + line.remainingAmount, 0);
  return {
    initial,
    committed,
    consumed,
    forecast,
    remaining,
    overrun: Math.max(0, forecast - initial),
    executionRate: initial > 0 ? consumed / initial : 0,
  };
}

function lineAmountSummary(line: BudgetLine): AmountSummary {
  return summarizeAmounts([line], line.initialAmount);
}

function normalizeEnvelopeType(type: string): string {
  if (type === 'CAPEX') return 'CAPEX';
  if (type === 'OPEX') return 'OPEX';
  if (type === 'RUN') return 'RUN';
  if (type === 'BUILD') return 'BUILD';
  return type;
}

function AmountCells({
  amounts,
  currency,
  taxDisplayMode,
  defaultTaxRate,
}: {
  amounts: AmountSummary;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
}) {
  return (
    <>
      <TableCell className="tabular-nums">
        {formatDashboardAmount({
          ht: amounts.initial,
          currency,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
      </TableCell>
      <TableCell>
        <TableToneAmount tone="brand">
          {formatDashboardAmount({
            ht: amounts.committed,
            currency,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
        </TableToneAmount>
      </TableCell>
      <TableCell>
        <TableToneAmount tone="info">
          {formatDashboardAmount({
            ht: amounts.consumed,
            currency,
            mode: taxDisplayMode,
            defaultTaxRate,
          })}
        </TableToneAmount>
      </TableCell>
      <TableCell className="tabular-nums">
        {formatDashboardAmount({
          ht: amounts.forecast,
          currency,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
      </TableCell>
      <TableCell>
        {amounts.overrun > 0 ? (
          <TableToneAmount tone="danger" className="font-semibold">
            {`+${formatDashboardAmount({
              ht: amounts.overrun,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })}`}
          </TableToneAmount>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="min-w-[9rem]">
        <PortfolioProgressBar
          value={amounts.executionRate * 100}
          variant="consumption"
          showPercent
          label={`Exécution ${formatPercent(amounts.executionRate)}`}
        />
      </TableCell>
    </>
  );
}

/**
 * Onglet « Vue d'ensemble » de la fiche budget.
 * Les KPI agrégés sont portés par la bande persistante du cockpit : ce panneau ne les répète pas.
 * Les lignes critiques proviennent du widget `ALERT_LIST` de l'API — aucune analyse fabriquée
 * côté client.
 */
export function BudgetDetailDashboard({
  kpi,
  dashboard,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  envelopes,
  lines,
  exerciseStartDateIso,
  exerciseEndDateIso,
  plannedAmounts12,
  budgetId,
  onBudgetLineClick,
}: {
  kpi: BudgetSummaryKpi;
  dashboard?: BudgetCockpitResponse | null;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
  /** Début / fin d’exercice ISO — colonnes = mois civils inclusifs de la période. */
  exerciseStartDateIso?: string | null;
  exerciseEndDateIso?: string | null;
  /** Planning mensuel agrégé (somme des lignes, index 1..12) — optionnel. */
  plannedAmounts12?: readonly number[] | null;
  budgetId: string;
  onBudgetLineClick?: (lineId: string) => void;
}) {
  const [expandedEnvelopeIds, setExpandedEnvelopeIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleEnvelope = useCallback((envelopeId: string) => {
    setExpandedEnvelopeIds((prev) => {
      const next = new Set(prev);
      if (next.has(envelopeId)) next.delete(envelopeId);
      else next.add(envelopeId);
      return next;
    });
  }, []);

  const envelopeRows = useMemo<EnvelopeSummaryRow[]>(() => {
    if (envelopes.length === 0) return [];

    const childrenByParent = new Map<string | null, BudgetEnvelope[]>();
    for (const envelope of envelopes) {
      const key = envelope.parentId ?? null;
      const list = childrenByParent.get(key) ?? [];
      list.push(envelope);
      childrenByParent.set(key, list);
    }

    const descendantIds = (rootId: string): string[] => {
      const directChildren = childrenByParent.get(rootId) ?? [];
      return directChildren.flatMap((child) => [child.id, ...descendantIds(child.id)]);
    };

    return envelopes
      .filter((envelope) => envelope.parentId == null)
      .map((envelope) => {
        const scopedIds = new Set([envelope.id, ...descendantIds(envelope.id)]);
        const scopedLines = lines
          .filter((line) => scopedIds.has(line.envelopeId))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        const initial = scopedLines.reduce((sum, line) => sum + line.initialAmount, 0);
        return {
          envelopeId: envelope.id,
          name: envelope.name,
          code: envelope.code,
          type: envelope.type,
          scopedLines,
          ...summarizeAmounts(scopedLines, initial),
        };
      })
      .sort((a, b) => b.initial - a.initial);
  }, [envelopes, lines]);

  const monthlyTrend = useMemo(() => {
    const chartWidget = dashboard?.widgets.find(
      (widget) => widget.type === 'CHART' && widget.data?.chartType === 'CONSUMPTION_TREND',
    );
    if (
      chartWidget?.type === 'CHART' &&
      chartWidget.data?.chartType === 'CONSUMPTION_TREND'
    ) {
      return chartWidget.data.series;
    }
    return [];
  }, [dashboard]);

  const monthlyChartRows = useMemo(() => {
    const totalPlannedFallback =
      plannedAmounts12?.reduce((sum, amount) => sum + (amount ?? 0), 0) ??
      kpi.totalLandingAmount ??
      kpi.totalForecastAmount;
    return buildRealizedVsPlannedChartRows({
      exerciseStartDateIso,
      exerciseEndDateIso,
      totalForecastAmount: totalPlannedFallback,
      monthlyTrend,
      plannedAmounts12,
    });
  }, [
    exerciseStartDateIso,
    exerciseEndDateIso,
    kpi.totalLandingAmount,
    kpi.totalForecastAmount,
    monthlyTrend,
    plannedAmounts12,
  ]);

  const hasChartSignal = monthlyChartRows.some(
    (row) => row.planned > 0 || row.realized > 0,
  );

  const criticalLines = useMemo<BudgetDashboardLineRow[]>(() => {
    const alertWidget = dashboard?.widgets.find((widget) => widget.type === 'ALERT_LIST');
    if (alertWidget?.type === 'ALERT_LIST' && alertWidget.data?.items) {
      return alertWidget.data.items.slice(0, MAX_CRITICAL_LINES);
    }
    return [];
  }, [dashboard]);

  return (
    <div className="space-y-6" data-testid="budget-detail-dashboard">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <Card className="starium-panel overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold text-foreground">
                Réalisé vs prévu par mois
              </CardTitle>
              <ul className="flex items-center gap-3 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-sm bg-muted-foreground/35"
                    aria-hidden
                  />
                  Prévu
                </li>
                <li className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-sm bg-[color:var(--state-danger)]"
                    aria-hidden
                  />
                  Réalisé
                </li>
              </ul>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-5">
            {!hasChartSignal ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune prévision ni consommation à afficher sur l’exercice.
              </p>
            ) : (
              <RealizedVsPlannedBarChart
                rows={monthlyChartRows}
                budgetId={budgetId}
                onBudgetLineClick={onBudgetLineClick}
                formatAmount={(value) =>
                  formatDashboardAmount({
                    ht: value,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="starium-panel">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <AlertTriangle className="size-4" aria-hidden />
              Analyse & recommandations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 sm:p-5">
            {criticalLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune ligne en alerte sur ce budget.
              </p>
            ) : (
              <ul className="space-y-2">
                {criticalLines.map((line) => (
                  <li key={line.lineId}>
                    <button
                      type="button"
                      onClick={() => onBudgetLineClick?.(line.lineId)}
                      disabled={!onBudgetLineClick}
                      className="w-full rounded-[var(--radius-md)] border border-border/70 bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                          {line.name}
                        </span>
                        <Badge variant={line.lineRiskLevel === 'CRITICAL' ? 'destructive' : 'outline'}>
                          {line.lineRiskLevel === 'CRITICAL' ? 'Critique' : 'À surveiller'}
                        </Badge>
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {line.envelopeName ?? 'Enveloppe non renseignée'} ·{' '}
                        {BUDGET_LABELS.remaining}{' '}
                        <span className="tabular-nums">
                          {formatDashboardAmount({
                            ht: line.remaining,
                            currency,
                            mode: taxDisplayMode,
                            defaultTaxRate,
                          })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="starium-panel">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold text-foreground">
            Enveloppes et lignes budgétaires
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <StariumTableWrap scrollLabel="Tableau des enveloppes et lignes budgétaires">
            <Table noWrapper>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[18rem]">Enveloppe / ligne</TableHead>
                  <TableHead>{BUDGET_LABELS.budget}</TableHead>
                  <TableHead>{BUDGET_LABELS.committed}</TableHead>
                  <TableHead>{BUDGET_LABELS.consumed}</TableHead>
                  <TableHead>{BUDGET_LABELS.landing}</TableHead>
                  <TableHead>Dépassement</TableHead>
                  <TableHead>Exécution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envelopeRows.map((row) => {
                  const isExpanded = expandedEnvelopeIds.has(row.envelopeId);
                  const hasLines = row.scopedLines.length > 0;

                  return (
                    <React.Fragment key={row.envelopeId}>
                      <TableRow className="bg-card">
                        <TableCell className="min-w-[18rem]">
                          <div className="flex items-start gap-2">
                            {hasLines ? (
                              <button
                                type="button"
                                className="mt-0.5 inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded
                                    ? `Réduire ${row.name}`
                                    : `Développer les lignes de ${row.name}`
                                }
                                onClick={() => toggleEnvelope(row.envelopeId)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="size-4" aria-hidden />
                                ) : (
                                  <ChevronRight className="size-4" aria-hidden />
                                )}
                              </button>
                            ) : (
                              <span className="inline-block size-11 shrink-0" aria-hidden />
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="font-medium text-foreground">
                                {row.code ? `${row.code} — ` : ''}
                                {row.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-[11px]">
                                  {normalizeEnvelopeType(row.type)}
                                </Badge>
                                {hasLines ? (
                                  <span className="text-xs text-muted-foreground">
                                    {row.scopedLines.length} ligne
                                    {row.scopedLines.length > 1 ? 's' : ''}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <AmountCells
                          amounts={row}
                          currency={currency}
                          taxDisplayMode={taxDisplayMode}
                          defaultTaxRate={defaultTaxRate}
                        />
                      </TableRow>

                      {isExpanded
                        ? row.scopedLines.map((line) => {
                            const lineAmounts = lineAmountSummary(line);
                            return (
                              <TableRow
                                key={line.id}
                                className="cursor-pointer bg-muted/20 hover:bg-muted/35"
                                onClick={() => onBudgetLineClick?.(line.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onBudgetLineClick?.(line.id);
                                  }
                                }}
                                tabIndex={onBudgetLineClick ? 0 : undefined}
                                data-testid={`budget-detail-line-${line.id}`}
                              >
                                <TableCell className="min-w-[18rem] pl-14">
                                  <div className="space-y-1">
                                    <div className="font-medium text-foreground">
                                      {line.code ? `${line.code} — ` : ''}
                                      {line.name}
                                    </div>
                                    <Badge variant="outline" className="text-[11px]">
                                      {line.expenseType}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <AmountCells
                                  amounts={lineAmounts}
                                  currency={currency}
                                  taxDisplayMode={taxDisplayMode}
                                  defaultTaxRate={defaultTaxRate}
                                />
                              </TableRow>
                            );
                          })
                        : null}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </StariumTableWrap>
          <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground sm:px-5">
            Ouvrez une enveloppe pour afficher ses lignes budgétaires, puis une ligne pour en
            consulter le détail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
