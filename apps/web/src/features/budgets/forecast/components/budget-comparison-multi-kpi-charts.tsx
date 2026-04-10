'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import type { MergedLiveVsManySnapshots } from '@/features/budgets/forecast/lib/merge-live-vs-snapshot-responses';
import {
  SvgMultiLineChart,
  SvgTotalsBarChart,
  type MultiLineSeries,
} from '@/features/budgets/forecast/components/comparison-charts-svg';

const PALETTE = ['#6F4BB8', '#2563EB', '#0EA5E9', '#14B8A6', '#F59E0B', '#EC4899'] as const;

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatAxisAmount(v: number, currency: string | null): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return formatCurrency(v, currency);
}

export function BudgetComparisonMultiKpiCharts({ merged }: { merged: MergedLiveVsManySnapshots }) {
  const cur = merged.currency;
  const shortLeft = truncate(merged.leftLabel, 20);

  const { barLabels, barValues, lineSeries } = useMemo(() => {
    const barLabelsLocal = [truncate(merged.leftLabel, 24), ...merged.rightLabels.map((l) => truncate(l, 24))];
    const barValuesLocal = [merged.totalsLeft, ...merged.totalsRight];

    const TOP = 12;
    const sorted = [...merged.lines]
      .sort(
        (a, b) =>
          Math.max(b.leftRevised, ...b.rightRevised) -
          Math.max(a.leftRevised, ...a.rightRevised),
      )
      .slice(0, TOP);

    const series: MultiLineSeries[] = [
      {
        key: 'L',
        name: shortLeft,
        color: PALETTE[0],
        values: sorted.map((row) => row.leftRevised),
      },
      ...merged.rightLabels.map((lbl, j) => ({
        key: `R${j}`,
        name: truncate(lbl, 14),
        color: PALETTE[(j + 1) % PALETTE.length],
        values: sorted.map((row) => row.rightRevised[j] ?? 0),
      })),
    ];

    return {
      barLabels: barLabelsLocal,
      barValues: barValuesLocal,
      lineSeries: series,
    };
  }, [merged, shortLeft]);

  const chartAnimKey = useMemo(
    () =>
      [
        merged.totalsLeft,
        merged.totalsRight.join(','),
        String(merged.lines.length),
        merged.lines
          .slice(0, 6)
          .map((l) => `${l.lineKey}:${l.leftRevised}`)
          .join('|'),
      ].join('§'),
    [merged],
  );

  const fmtY = (n: number) => formatAxisAmount(n, cur);

  return (
    <section
      className="space-y-6 border-t border-border/70 pt-8"
      aria-label="Synthèse graphique multi-versions figées"
    >
      <div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">Vue graphique</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Totaux et courbes se mettent à jour en douceur quand vous modifiez la sélection des versions
          figées — survol des points pour le détail.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Totaux révisés par colonne</CardTitle>
          <CardDescription>Budget actuel vs chaque version figée sélectionnée</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] pt-0">
          <SvgTotalsBarChart
            key={chartAnimKey}
            className="h-full w-full"
            labels={barLabels}
            values={barValues}
            colors={[...PALETTE]}
            formatY={fmtY}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Courbes — révisé (top 12 lignes)</CardTitle>
          <CardDescription>
            Une courbe par colonne ; rang 1 = ligne au volume max
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] pt-0">
          <SvgMultiLineChart
            key={chartAnimKey}
            className="h-auto w-full"
            series={lineSeries}
            formatY={fmtY}
          />
        </CardContent>
      </Card>
    </section>
  );
}
