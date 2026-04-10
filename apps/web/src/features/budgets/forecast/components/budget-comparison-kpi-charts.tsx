'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import type {
  BudgetComparisonResponse,
  ForecastLineStatus,
} from '@/features/budgets/types/budget-forecast.types';
import {
  SvgDonutChart,
  SvgDualLineChart,
  SvgGroupedBarChart,
  SvgHorizontalDiffBars,
  type DonutSlice,
  type GroupedBarRow,
  type LinePoint,
} from '@/features/budgets/forecast/components/comparison-charts-svg';

const C = {
  left: '#6F4BB8',
  right: '#2563EB',
  ok: '#22C55E',
  warn: '#F59E0B',
  crit: '#EF4444',
  pie: ['#6F4BB8', '#2563EB', '#0EA5E9', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6', '#64748B'],
} as const;

const TOP_LINES_PIE = 7;
const TOP_LINES_LINE = 14;
const TOP_LINES_DIFF = 10;

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

function aggregateSides(data: BudgetComparisonResponse) {
  let lr = 0;
  let lf = 0;
  let lc = 0;
  let rr = 0;
  let rf = 0;
  let rc = 0;
  for (const row of data.lines) {
    lr += row.left.revisedAmount;
    lf += row.left.forecastAmount;
    lc += row.left.consumedAmount;
    rr += row.right.revisedAmount;
    rf += row.right.forecastAmount;
    rc += row.right.consumedAmount;
  }
  return { lr, lf, lc, rr, rf, rc };
}

export interface BudgetComparisonKpiChartsProps {
  data: BudgetComparisonResponse;
  leftTitle: string;
  rightTitle: string;
}

/**
 * Synthèse graphique sous le tableau : totaux comparés, répartition, statuts, courbes et écarts (SVG, sans dépendance charting).
 */
export function BudgetComparisonKpiCharts({
  data,
  leftTitle,
  rightTitle,
}: BudgetComparisonKpiChartsProps) {
  const cur = data.currency;
  const shortLeft = truncate(leftTitle, 22);
  const shortRight = truncate(rightTitle, 22);

  const { barRows, pieLeftSlices, statusSlices, linePoints, diffRows } = useMemo(() => {
    const agg = aggregateSides(data);

    const barRowsLocal: GroupedBarRow[] = [
      { label: 'Révisé', left: agg.lr, right: agg.rr },
      { label: 'Prévi.', left: agg.lf, right: agg.rf },
      { label: 'Conso.', left: agg.lc, right: agg.rc },
    ];

    const sortedByLeft = [...data.lines].sort(
      (a, b) => b.left.revisedAmount - a.left.revisedAmount,
    );
    const top = sortedByLeft.slice(0, TOP_LINES_PIE);
    const restSum = sortedByLeft
      .slice(TOP_LINES_PIE)
      .reduce((s, r) => s + r.left.revisedAmount, 0);
    const pieLeftSlicesLocal: DonutSlice[] = top.map((r, i) => ({
      name: truncate(r.name, 26),
      value: r.left.revisedAmount,
      fill: C.pie[i % C.pie.length],
    }));
    if (restSum > 0) {
      pieLeftSlicesLocal.push({
        name: 'Autres lignes',
        value: restSum,
        fill: C.pie[pieLeftSlicesLocal.length % C.pie.length],
      });
    }

    const statusCount: Record<ForecastLineStatus, number> = {
      OK: 0,
      WARNING: 0,
      CRITICAL: 0,
    };
    for (const row of data.lines) {
      statusCount[row.status] += 1;
    }
    const statusSlicesLocal: DonutSlice[] = [
      { name: 'OK', value: statusCount.OK, fill: C.ok },
      { name: 'Attention', value: statusCount.WARNING, fill: C.warn },
      { name: 'Critique', value: statusCount.CRITICAL, fill: C.crit },
    ].filter((d) => d.value > 0);

    const sortedForLine = [...data.lines]
      .sort(
        (a, b) =>
          Math.max(b.left.revisedAmount, b.right.revisedAmount) -
          Math.max(a.left.revisedAmount, a.right.revisedAmount),
      )
      .slice(0, TOP_LINES_LINE);

    const linePointsLocal: LinePoint[] = sortedForLine.map((r, i) => ({
      x: i + 1,
      label: truncate(r.name, 18),
      a: r.left.revisedAmount,
      b: r.right.revisedAmount,
    }));

    const diffRowsLocal = [...data.lines]
      .map((r) => ({
        name: truncate(r.name, 36),
        value: r.right.revisedAmount - r.left.revisedAmount,
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, TOP_LINES_DIFF);

    return {
      barRows: barRowsLocal,
      pieLeftSlices: pieLeftSlicesLocal,
      statusSlices: statusSlicesLocal,
      linePoints: linePointsLocal,
      diffRows: diffRowsLocal,
    };
  }, [data]);

  /** Clé stable pour ré-animer courbes / anneaux quand la comparaison chargée change (baseline ↔ version figée, autre cible, autre budget). */
  const chartAnimKey = useMemo(() => {
    const head = data.lines
      .slice(0, 8)
      .map((l) => `${l.lineKey}:${l.left.revisedAmount}:${l.right.revisedAmount}`)
      .join('|');
    return [
      data.budgetId ?? '',
      data.compareTo ?? '',
      String(data.diff.revisedAmount),
      String(data.lines.length),
      data.leftSnapshotId ?? '',
      data.rightSnapshotId ?? '',
      head,
    ].join('§');
  }, [data]);

  const hasPie = pieLeftSlices.some((d) => d.value > 0);
  const hasStatus = statusSlices.length > 0;
  const hasDiff = diffRows.some((d) => d.value !== 0);
  const fmtY = (n: number) => formatAxisAmount(n, cur);
  const fmtX = (n: number) => formatCurrency(n, cur);

  return (
    <section
      className="space-y-6 border-t border-border/70 pt-8"
      aria-label="Synthèse graphique de la comparaison"
    >
      <div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Vue graphique
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Même périmètre que le tableau : les graphiques <strong>réagissent</strong> quand vous changez
          baseline / version figée ou la cible — barres et points en transition, courbes tracées en
          animation. Survolez pour les montants.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Totaux comparés</CardTitle>
            <CardDescription>
              Barres groupées — gauche : {shortLeft} · droite : {shortRight}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-0">
            <SvgGroupedBarChart
              className="h-full w-full"
              rows={barRows}
              leftName={shortLeft}
              rightName={shortRight}
              leftColor={C.left}
              rightColor={C.right}
              formatY={fmtY}
              animateKey={chartAnimKey}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition du révisé (gauche)</CardTitle>
            <CardDescription>
              Anneau — parts des principales lignes (« {shortLeft} »)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 pt-0">
            {hasPie ? (
              <>
                <SvgDonutChart
                  slices={pieLeftSlices}
                  currency={cur}
                  className="h-44 w-44 shrink-0"
                  animateKey={chartAnimKey}
                />
                <ul className="flex max-w-full flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {pieLeftSlices.map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-sm"
                        style={{ backgroundColor: s.fill }}
                      />
                      <span className="max-w-[10rem] truncate" title={s.name}>
                        {s.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Pas de montant révisé à afficher</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Statut des lignes (pilotage)</CardTitle>
            <CardDescription>OK / attention / critique sur le périmètre comparé</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-2 pt-0">
            {hasStatus ? (
              <>
                <SvgDonutChart
                  slices={statusSlices}
                  formatSliceTitle={(sl, pct) =>
                    `${sl.name}: ${sl.value} ligne(s) (${pct.toFixed(1)} %)`
                  }
                  className="h-40 w-40 shrink-0"
                  animateKey={chartAnimKey}
                />
                <p className="text-center text-xs text-muted-foreground">
                  Survolez les segments pour les effectifs.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun statut</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Courbes — révisé par ligne (top {TOP_LINES_LINE})</CardTitle>
            <CardDescription>
              Lignes triées par volume max — points survolables pour le libellé et les montants
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] pt-0">
            <SvgDualLineChart
              className="h-full w-full"
              points={linePoints}
              colorA={C.left}
              colorB={C.right}
              nameA={shortLeft}
              nameB={shortRight}
              formatY={fmtY}
              animateKey={chartAnimKey}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plus gros écarts sur le révisé (droite − gauche)</CardTitle>
          <CardDescription>
            Les {TOP_LINES_DIFF} lignes au plus fort écart en valeur absolue — rouge : hausse côté
            droit, vert : baisse (barres depuis le centre)
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[220px] pt-0">
          {hasDiff ? (
            <SvgHorizontalDiffBars
              className="h-auto w-full max-w-full"
              rows={diffRows}
              formatX={fmtX}
              posColor="rgb(220 38 38 / 0.88)"
              negColor="rgb(34 197 94 / 0.88)"
              animateKey={chartAnimKey}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun écart sur le révisé
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
