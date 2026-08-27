'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RealizedVsPlannedMonthRow } from '@/features/budgets/lib/build-realized-vs-planned-chart';
import { formatPercent } from '@/features/budgets/lib/budget-formatters';
import { MonthEnvelopeDrilldown } from '@/features/budgets/components/month-envelope-drilldown';
import { Button } from '@/components/ui/button';

const PLANNED_FILL = 'var(--neutral-300)';
const REALIZED_FILL = 'var(--state-danger)';
const GRID_STROKE = 'var(--border)';
const TICK_FILL = 'var(--color-text-muted)';

/** Nombre de mois visibles à l’écran (flèches pour le reste de l’exercice). */
const CHART_WINDOW_SIZE = 12;

type ChartDatum = RealizedVsPlannedMonthRow & {
  écart: number;
  taux: number | null;
};

type Props = {
  rows: RealizedVsPlannedMonthRow[];
  formatAmount: (value: number) => string;
  budgetId: string;
  onBudgetLineClick?: (lineId: string) => void;
  className?: string;
};

function formatAxisTick(value: number): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 1,
    }).format(value / 1_000_000)}\u00a0M`;
  }
  if (abs >= 1_000) {
    return `${new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(value / 1_000)}\u00a0k`;
  }
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

function MonthTooltip({
  active,
  payload,
  formatAmount,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartDatum }>;
  formatAmount: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div
      className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 shadow-[var(--shadow-3)]"
      role="status"
    >
      <p className="text-sm font-semibold text-foreground">{row.monthLabel}</p>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
        Prévu :{' '}
        <span className="font-medium text-foreground">{formatAmount(row.planned)}</span>
      </p>
      <p className="text-xs tabular-nums text-muted-foreground">
        Réalisé :{' '}
        <span className="font-medium text-foreground">{formatAmount(row.realized)}</span>
      </p>
      <p className="text-xs tabular-nums text-muted-foreground">
        Écart :{' '}
        <span className="font-medium text-foreground">
          {row.écart >= 0 ? '+' : ''}
          {formatAmount(row.écart)}
        </span>
        {row.taux != null ? (
          <span className="text-muted-foreground"> · {formatPercent(row.taux)}</span>
        ) : null}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">Cliquez pour le détail par enveloppe</p>
    </div>
  );
}

function clampWindowStart(start: number, total: number, windowSize: number): number {
  const maxStart = Math.max(0, total - windowSize);
  return Math.min(Math.max(0, start), maxStart);
}

export function RealizedVsPlannedBarChart({
  rows,
  formatAmount,
  budgetId,
  onBudgetLineClick,
  className,
}: Props) {
  const chartId = useId();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState(0);

  const data = useMemo<ChartDatum[]>(
    () =>
      rows.map((row) => {
        const écart = row.realized - row.planned;
        const taux = row.planned > 0 ? row.realized / row.planned : null;
        return { ...row, écart, taux };
      }),
    [rows],
  );

  const windowSize = Math.min(CHART_WINDOW_SIZE, Math.max(1, data.length));
  const canNavigate = data.length > windowSize;
  const maxWindowStart = Math.max(0, data.length - windowSize);

  useEffect(() => {
    setWindowStart(0);
    setSelectedKey(null);
  }, [rows]);

  useEffect(() => {
    setWindowStart((prev) => clampWindowStart(prev, data.length, windowSize));
  }, [data.length, windowSize]);

  const visibleData = useMemo(
    () => data.slice(windowStart, windowStart + windowSize),
    [data, windowStart, windowSize],
  );

  const selected = useMemo(
    () => data.find((row) => row.monthKey === selectedKey) ?? null,
    [data, selectedKey],
  );

  const windowRangeLabel = useMemo(() => {
    if (visibleData.length === 0) return 'Aucun mois';
    const first = visibleData[0];
    const last = visibleData[visibleData.length - 1];
    if (first.monthKey === last.monthKey) {
      return first.monthLabel;
    }
    return `${first.monthLabel} → ${last.monthLabel}`;
  }, [visibleData]);

  const selectMonth = (monthKey: string) => {
    setSelectedKey((prev) => (prev === monthKey ? null : monthKey));
    const index = data.findIndex((row) => row.monthKey === monthKey);
    if (index < 0) return;
    if (index < windowStart) {
      setWindowStart(clampWindowStart(index, data.length, windowSize));
    } else if (index >= windowStart + windowSize) {
      setWindowStart(
        clampWindowStart(index - windowSize + 1, data.length, windowSize),
      );
    }
  };

  const goPrev = () => {
    setWindowStart((prev) => clampWindowStart(prev - 1, data.length, windowSize));
  };

  const goNext = () => {
    setWindowStart((prev) => clampWindowStart(prev + 1, data.length, windowSize));
  };

  const pageLabel = canNavigate
    ? `${windowStart + 1}–${windowStart + visibleData.length} / ${data.length}`
    : `${data.length} mois`;

  return (
    <div className={cn('space-y-3', className)}>
      {canNavigate ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Afficher le mois précédent"
            disabled={windowStart <= 0}
            onClick={goPrev}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <div className="min-w-0 flex-1 text-center" aria-live="polite">
            <p className="truncate text-sm font-semibold text-foreground">
              {windowRangeLabel}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">{pageLabel}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Afficher le mois suivant"
            disabled={windowStart >= maxWindowStart}
            onClick={goNext}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}

      <div
        className="h-64 w-full min-w-0 sm:h-72 [&_svg]:outline-none [&_svg_*]:outline-none"
        role="img"
        aria-labelledby={`${chartId}-title`}
      >
        <p id={`${chartId}-title`} className="sr-only">
          Histogramme Réalisé versus prévu sur la durée de l’exercice ({pageLabel}). Fenêtre
          affichée : {windowRangeLabel}. Cliquez une barre pour ouvrir le détail par enveloppe.
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
            barGap={2}
            barCategoryGap="18%"
          >
            <CartesianGrid
              strokeDasharray="4 4"
              stroke={GRID_STROKE}
              vertical={false}
              strokeOpacity={0.85}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: TICK_FILL, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
              interval={0}
            />
            <YAxis
              tick={{ fill: TICK_FILL, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={formatAxisTick}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', fillOpacity: 0.35 }}
              content={({ active, payload }) => (
                <MonthTooltip
                  active={active}
                  payload={payload as ReadonlyArray<{ payload?: ChartDatum }> | undefined}
                  formatAmount={formatAmount}
                />
              )}
            />
            <Bar
              dataKey="planned"
              name="Prévu"
              fill={PLANNED_FILL}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive
              animationDuration={550}
              activeBar={false}
              onClick={(item) => {
                const payload = item?.payload as ChartDatum | undefined;
                if (payload?.monthKey) selectMonth(payload.monthKey);
              }}
              style={{ cursor: 'pointer' }}
              aria-label="Prévu"
            >
              {visibleData.map((row) => (
                <Cell
                  key={`planned-${row.monthKey}`}
                  fill={PLANNED_FILL}
                  fillOpacity={
                    selectedKey == null || selectedKey === row.monthKey ? 1 : 0.35
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="realized"
              name="Réalisé"
              fill={REALIZED_FILL}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive
              animationDuration={550}
              activeBar={false}
              onClick={(item) => {
                const payload = item?.payload as ChartDatum | undefined;
                if (payload?.monthKey) selectMonth(payload.monthKey);
              }}
              style={{ cursor: 'pointer' }}
              aria-label="Réalisé"
            >
              {visibleData.map((row) => (
                <Cell
                  key={`realized-${row.monthKey}`}
                  fill={REALIZED_FILL}
                  fillOpacity={
                    selectedKey == null || selectedKey === row.monthKey ? 1 : 0.35
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        className="flex flex-wrap justify-center gap-1.5"
        role="listbox"
        aria-label="Mois visibles de l’exercice"
      >
        {visibleData.map((row) => {
          const active = selectedKey === row.monthKey;
          return (
            <button
              key={row.monthKey}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => selectMonth(row.monthKey)}
              className={cn(
                'min-h-11 min-w-11 rounded-[var(--control-radius)] border px-2.5 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-transparent bg-[color:var(--control-active-bg)] text-white'
                  : 'border-border bg-card text-foreground hover:bg-muted/40',
              )}
            >
              {row.monthLabel}
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {selected ? (
          <div className="rounded-[var(--radius-md)] border border-border/70 bg-muted/30 p-3 sm:p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="starium-overline text-muted-foreground">Mois sélectionné</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {selected.monthLabel}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  Prévu {formatAmount(selected.planned)} · Réalisé{' '}
                  {formatAmount(selected.realized)}
                  {selected.écart !== 0 ? (
                    <>
                      {' '}
                      · Écart {selected.écart >= 0 ? '+' : ''}
                      {formatAmount(selected.écart)}
                      {selected.taux != null
                        ? ` (${formatPercent(selected.taux)})`
                        : ''}
                    </>
                  ) : null}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Fermer le détail du mois"
                onClick={() => setSelectedKey(null)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
            <MonthEnvelopeDrilldown
              budgetId={budgetId}
              monthKey={selected.monthKey}
              monthLabel={selected.monthLabel}
              formatAmount={formatAmount}
              onLineClick={onBudgetLineClick}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Cliquez une barre ou un mois pour le drill-down par enveloppe.
            {canNavigate
              ? ' Utilisez les flèches pour parcourir toute la durée de l’exercice.'
              : null}
          </p>
        )}
      </div>
    </div>
  );
}
