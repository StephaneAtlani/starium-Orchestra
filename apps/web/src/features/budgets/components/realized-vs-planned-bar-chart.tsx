'use client';

import React, { useId, useMemo, useState } from 'react';
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
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RealizedVsPlannedMonthRow } from '@/features/budgets/lib/build-realized-vs-planned-chart';
import { formatPercent } from '@/features/budgets/lib/budget-formatters';
import { Button } from '@/components/ui/button';

const PLANNED_FILL = 'var(--neutral-300)';
const REALIZED_FILL = 'var(--state-danger)';
const GRID_STROKE = 'var(--border)';
const TICK_FILL = 'var(--color-text-muted)';

type ChartDatum = RealizedVsPlannedMonthRow & {
  écart: number;
  taux: number | null;
};

type Props = {
  rows: RealizedVsPlannedMonthRow[];
  formatAmount: (value: number) => string;
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
    </div>
  );
}

export function RealizedVsPlannedBarChart({ rows, formatAmount, className }: Props) {
  const chartId = useId();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const data = useMemo<ChartDatum[]>(
    () =>
      rows.map((row) => {
        const écart = row.realized - row.planned;
        const taux = row.planned > 0 ? row.realized / row.planned : null;
        return { ...row, écart, taux };
      }),
    [rows],
  );

  const selected = useMemo(
    () => data.find((row) => row.monthKey === selectedKey) ?? null,
    [data, selectedKey],
  );

  const selectMonth = (monthKey: string) => {
    setSelectedKey((prev) => (prev === monthKey ? null : monthKey));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="h-64 w-full min-w-0 sm:h-72" role="img" aria-labelledby={`${chartId}-title`}>
        <p id={`${chartId}-title`} className="sr-only">
          Histogramme Réalisé versus prévu sur 12 mois. Cliquez une barre pour sélectionner un mois.
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
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
              onClick={(item) => {
                const payload = item?.payload as ChartDatum | undefined;
                if (payload?.monthKey) selectMonth(payload.monthKey);
              }}
              style={{ cursor: 'pointer' }}
              aria-label="Prévu"
            >
              {data.map((row) => (
                <Cell
                  key={`planned-${row.monthKey}`}
                  fill={PLANNED_FILL}
                  fillOpacity={
                    selectedKey == null || selectedKey === row.monthKey ? 1 : 0.35
                  }
                  stroke={
                    selectedKey === row.monthKey ? 'var(--brand-ink)' : undefined
                  }
                  strokeWidth={selectedKey === row.monthKey ? 1.5 : 0}
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
              onClick={(item) => {
                const payload = item?.payload as ChartDatum | undefined;
                if (payload?.monthKey) selectMonth(payload.monthKey);
              }}
              style={{ cursor: 'pointer' }}
              aria-label="Réalisé"
            >
              {data.map((row) => (
                <Cell
                  key={`realized-${row.monthKey}`}
                  fill={REALIZED_FILL}
                  fillOpacity={
                    selectedKey == null || selectedKey === row.monthKey ? 1 : 0.35
                  }
                  stroke={
                    selectedKey === row.monthKey ? 'var(--brand-ink)' : undefined
                  }
                  strokeWidth={selectedKey === row.monthKey ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5" role="listbox" aria-label="Mois de l’exercice">
        {data.map((row) => {
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="starium-overline text-muted-foreground">Mois sélectionné</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {selected.monthLabel}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Désélectionner le mois"
                onClick={() => setSelectedKey(null)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Prévu</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(selected.planned)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Réalisé</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {formatAmount(selected.realized)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Écart</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {selected.écart >= 0 ? '+' : ''}
                  {formatAmount(selected.écart)}
                  {selected.taux != null ? (
                    <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                      ({formatPercent(selected.taux)})
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Survolez une barre pour le détail · cliquez une barre ou un mois pour le
            figer.
          </p>
        )}
      </div>
    </div>
  );
}
