'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetSummaryKpi } from '@/features/budgets/types/budget-reporting.types';
import type { BudgetCockpitResponse } from '@/features/budgets/types/budget-dashboard.types';
import { formatPercent } from '@/features/budgets/lib/budget-formatters';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { BudgetKpiGrid } from '@/features/budgets/dashboard/components/budget-kpi-grid';
import { BudgetMonthlyTrendCard } from '@/features/budgets/dashboard/components/budget-monthly-trend-card';
import { BudgetLinesProgress } from '@/features/budgets/components/budget-lines-progress';
import type { BudgetEnvelope, BudgetLine } from '@/features/budgets/types/budget-management.types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function summarizeAmounts(
  scopedLines: BudgetLine[],
  initial: number,
): AmountSummary {
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
      <TableCell className="tabular-nums">
        {formatDashboardAmount({
          ht: amounts.committed,
          currency,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
      </TableCell>
      <TableCell className="tabular-nums text-[color:var(--state-info)]">
        {formatDashboardAmount({
          ht: amounts.consumed,
          currency,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
      </TableCell>
      <TableCell className="tabular-nums">
        {formatDashboardAmount({
          ht: amounts.forecast,
          currency,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}
      </TableCell>
      <TableCell className="tabular-nums font-semibold text-destructive">
        {amounts.overrun > 0
          ? formatDashboardAmount({
              ht: amounts.overrun,
              currency,
              mode: taxDisplayMode,
              defaultTaxRate,
            })
          : '—'}
      </TableCell>
      <TableCell className="min-w-[10rem]">
        <div className="space-y-1">
          <BudgetLinesProgress
            budgetAmount={amounts.initial}
            consumedAmount={amounts.consumed}
            remainingAmount={Math.max(0, amounts.remaining)}
            currency={currency}
          />
          <div className="text-right text-xs font-semibold tabular-nums text-foreground">
            {formatPercent(amounts.executionRate)}
          </div>
        </div>
      </TableCell>
    </>
  );
}

export function BudgetDetailDashboard({
  kpi,
  dashboard,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  envelopes,
  lines,
  onBudgetLineClick,
}: {
  kpi: BudgetSummaryKpi;
  dashboard?: BudgetCockpitResponse | null;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
  onBudgetLineClick?: (lineId: string) => void;
}) {
  const [expandedEnvelopeIds, setExpandedEnvelopeIds] = useState<Set<string>>(() => new Set());

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
    if (chartWidget?.type === 'CHART' && chartWidget.data?.chartType === 'CONSUMPTION_TREND') {
      return chartWidget.data.series;
    }
    return [];
  }, [dashboard]);

  const dashboardKpis = useMemo(() => {
    const kpiWidget = dashboard?.widgets.find((widget) => widget.type === 'KPI');
    if (kpiWidget?.type === 'KPI' && kpiWidget.data) {
      return kpiWidget.data.kpis;
    }
    return {
      totalBudget: kpi.totalInitialAmount,
      committed: kpi.totalCommittedAmount,
      consumed: kpi.totalConsumedAmount,
      forecast: kpi.totalForecastAmount,
      remaining: kpi.totalRemainingAmount,
      consumptionRate: kpi.consumptionRate ?? 0,
      totalBudgetTtc: kpi.totalInitialAmountTtc,
      committedTtc: kpi.totalCommittedAmountTtc,
      consumedTtc: kpi.totalConsumedAmountTtc,
      forecastTtc: kpi.totalForecastAmountTtc,
      remainingTtc: kpi.totalRemainingAmountTtc,
    };
  }, [dashboard, kpi]);

  const recommendations = useMemo(() => {
    const items: { tone: 'danger' | 'warning' | 'success'; title: string; body: string }[] = [];
    const worstOverrun = [...envelopeRows].sort((a, b) => b.overrun - a.overrun)[0];

    if (worstOverrun && worstOverrun.overrun > 0) {
      items.push({
        tone: 'danger',
        title: `${worstOverrun.name} depasse son budget`,
        body: `Prevision superieure au budget de ${formatDashboardAmount({
          ht: worstOverrun.overrun,
          currency,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}. Une reaffectation ou une reduction de charge est a arbitrer.`,
      });
    }

    if ((kpi.totalRemainingAmount ?? 0) > 0) {
      items.push({
        tone: 'success',
        title: 'Marge encore mobilisable',
        body: `Reste disponible ${formatDashboardAmount({
          ht: kpi.totalRemainingAmount,
          currency,
          mode: taxDisplayMode,
          defaultTaxRate,
        })}. Ce solde peut absorber un depassement prioritaire.`,
      });
    }

    items.push({
      tone: 'warning',
      title: 'Execution a surveiller',
      body: `Consommation ${formatPercent(kpi.consumptionRate ?? 0)} pour un forecast de ${formatDashboardAmount({
        ht: kpi.totalForecastAmount,
        currency,
        mode: taxDisplayMode,
        defaultTaxRate,
      })}.`,
    });

    return items.slice(0, 3);
  }, [currency, defaultTaxRate, envelopeRows, kpi, taxDisplayMode]);

  return (
    <div className="space-y-6" data-testid="budget-detail-dashboard">
      <BudgetKpiGrid
        kpis={dashboardKpis}
        currency={currency}
        taxDisplayMode={taxDisplayMode}
        defaultTaxRate={defaultTaxRate}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <Card className="overflow-hidden border-border/70 shadow-[var(--shadow-1)]">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              Realise vs prevu par mois
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <BudgetMonthlyTrendCard
              monthlyTrend={monthlyTrend}
              currency={currency}
              taxDisplayMode={taxDisplayMode}
              defaultTaxRate={defaultTaxRate}
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-1)]">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Lightbulb className="size-4" aria-hidden />
              Analyse & recommandations
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {recommendations.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="rounded-lg border border-border/70 bg-muted/20 p-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      item.tone === 'danger'
                        ? 'mt-0.5 rounded-full bg-destructive/10 p-1 text-destructive'
                        : item.tone === 'warning'
                          ? 'mt-0.5 rounded-full bg-[color:var(--brand-gold-050)] p-1 text-[color:var(--brand-gold-700)]'
                          : 'mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700'
                    }
                  >
                    {item.tone === 'danger' ? (
                      <AlertTriangle className="size-4" aria-hidden />
                    ) : item.tone === 'warning' ? (
                      <TrendingUp className="size-4" aria-hidden />
                    ) : (
                      <Check className="size-4" aria-hidden />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-[var(--shadow-1)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold text-foreground">
            Enveloppes / lignes budgetaires
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[18rem]">Enveloppe / ligne budgetaire</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Engage</TableHead>
                <TableHead>Consomme</TableHead>
                <TableHead>Prevision</TableHead>
                <TableHead>Depassement</TableHead>
                <TableHead>Execution</TableHead>
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
                                  ? `Reduire ${row.name}`
                                  : `Developper les lignes de ${row.name}`
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
                              {row.code ? `${row.code} - ` : ''}
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
                                    {line.code ? `${line.code} - ` : ''}
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
          <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground sm:px-5">
            Cliquez sur une enveloppe pour afficher ses lignes budgetaires, puis sur une ligne pour
            ouvrir le detail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
