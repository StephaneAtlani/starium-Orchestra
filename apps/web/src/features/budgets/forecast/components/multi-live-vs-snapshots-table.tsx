'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import { ForecastStatusBadge } from '@/features/budgets/forecast/components/forecast-status-badge';
import { cn } from '@/lib/utils';
import { comparisonDiffClass } from '@/features/budgets/forecast/lib/comparison-diff';
import type { MergedLiveVsManySnapshots } from '@/features/budgets/forecast/lib/merge-live-vs-snapshot-responses';
import { BudgetComparisonMultiKpiCharts } from '@/features/budgets/forecast/components/budget-comparison-multi-kpi-charts';

export interface MultiLiveVsSnapshotsTableProps {
  merged: MergedLiveVsManySnapshots;
}

export function MultiLiveVsSnapshotsTable({ merged }: MultiLiveVsSnapshotsTableProps) {
  const cur = merged.currency;
  const pr = merged.primaryResponse;
  const n = merged.rightLabels.length;
  const colCount = 5 + n;

  return (
    <div className="space-y-0">
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Ligne</TableHead>
            <TableHead className="max-w-[12rem] text-right">
              <span className="line-clamp-2 whitespace-normal break-words">
                {merged.leftLabel}
              </span>
            </TableHead>
            {merged.rightLabels.map((label, i) => (
              <TableHead key={i} className="max-w-[12rem] text-right">
                <span className="line-clamp-2 whitespace-normal break-words">{label}</span>
              </TableHead>
            ))}
            <TableHead className="text-right">Diff. budget (1ʳᵉ cible)</TableHead>
            <TableHead className="text-right">Écart prévi. (1ʳᵉ)</TableHead>
            <TableHead>Statut (1ʳᵉ)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merged.lines.map((row) => {
            const d =
              row.rightRevised[0] !== undefined
                ? row.rightRevised[0] - row.leftRevised
                : 0;
            return (
              <TableRow key={row.lineKey} className="hover:bg-muted/50">
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.leftRevised, cur)}
                </TableCell>
                {row.rightRevised.map((amt, i) => (
                  <TableCell key={i} className="text-right tabular-nums">
                    {formatCurrency(amt, cur)}
                  </TableCell>
                ))}
                <TableCell
                  className={cn('text-right tabular-nums', comparisonDiffClass(d))}
                >
                  {formatCurrency(d, cur)}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    comparisonDiffClass(row.forecastDiffFirst),
                  )}
                >
                  {formatCurrency(row.forecastDiffFirst, cur)}
                </TableCell>
                <TableCell>
                  <ForecastStatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/30 font-medium hover:bg-muted/30">
            <TableCell>Totaux</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(merged.totalsLeft, cur)}
            </TableCell>
            {merged.totalsRight.map((sum, i) => (
              <TableCell key={i} className="text-right tabular-nums">
                {formatCurrency(sum, cur)}
              </TableCell>
            ))}
            <TableCell
              className={cn(
                'text-right tabular-nums',
                comparisonDiffClass(
                  (merged.totalsRight[0] ?? 0) - merged.totalsLeft,
                ),
              )}
            >
              {formatCurrency(
                (merged.totalsRight[0] ?? 0) - merged.totalsLeft,
                cur,
              )}
            </TableCell>
            <TableCell
              className={cn(
                'text-right tabular-nums',
                comparisonDiffClass(pr.diff.forecastAmount),
              )}
            >
              {formatCurrency(pr.diff.forecastAmount, cur)}
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow className="text-xs text-muted-foreground hover:bg-muted/20">
            <TableCell colSpan={colCount}>
              <p className="max-w-3xl">
                Plusieurs versions figées : les colonnes <strong>écarts</strong> et{' '}
                <strong>Statut</strong> concernent la <strong>première cible</strong> sélectionnée
                (ordre de la liste). Comparez les montants budgétaires colonne par colonne pour les
                autres.
              </p>
              <p className="mt-1">
                Forecast (1ʳᵉ cible) : {formatCurrency(pr.totals.forecast, cur)} · Engagé :{' '}
                {formatCurrency(pr.totals.committed, cur)} · Consommé :{' '}
                {formatCurrency(pr.totals.consumed, cur)} · Variance consommation :{' '}
                {formatCurrency(pr.variance.consumed, cur)} · Diff. forecast :{' '}
                {formatCurrency(pr.diff.forecastAmount, cur)} · Diff. engagé :{' '}
                {formatCurrency(pr.diff.committedAmount, cur)} · Diff. consommé :{' '}
                {formatCurrency(pr.diff.consumedAmount, cur)}
              </p>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
    <BudgetComparisonMultiKpiCharts merged={merged} />
    </div>
  );
}
