'use client';

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { formatPercent } from '@/features/budgets/lib/budget-formatters';
import { useBudgetMonthlyBreakdownQuery } from '@/features/budgets/hooks/use-budget-dashboard';
import { displayLabel } from '@/lib/display-label';

const PLANNED_FILL = 'var(--neutral-300)';
const REALIZED_FILL = 'var(--state-danger)';
const COMMITTED_FILL = 'var(--brand-gold)';
const GRID_STROKE = 'var(--border)';
const TICK_FILL = 'var(--color-text-muted)';

type Props = {
  budgetId: string;
  monthKey: string;
  monthLabel: string;
  formatAmount: (value: number) => string;
  onLineClick?: (lineId: string) => void;
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

function truncateLabel(label: string, max = 18): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

export function MonthEnvelopeDrilldown({
  budgetId,
  monthKey,
  monthLabel,
  formatAmount,
  onLineClick,
}: Props) {
  const query = useBudgetMonthlyBreakdownQuery({ budgetId, month: monthKey });

  const envelopeChartData = useMemo(() => {
    const rows = query.data?.envelopes ?? [];
    return rows.slice(0, 8).map((row) => ({
      ...row,
      shortName: truncateLabel(displayLabel(row.name, 'Enveloppe')),
    }));
  }, [query.data?.envelopes]);

  const chartHeight = Math.max(180, envelopeChartData.length * 36 + 48);

  if (query.isLoading) {
    return <LoadingState rows={4} className="space-y-3 py-2" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof Error
            ? query.error.message
            : 'Impossible de charger le drill-down.'
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  if (!data || (data.envelopes.length === 0 && data.lines.length === 0)) {
    return (
      <EmptyState
        className="px-4 py-6"
        title={`Aucune activité en ${monthLabel}`}
        description="Pas de prévision ni de consommation sur ce mois pour les enveloppes du budget."
      />
    );
  }

  const taux =
    data.total.planned > 0 ? data.total.realized / data.total.planned : null;

  return (
    <div className="space-y-4" aria-live="polite">
      <div>
        <p className="starium-overline text-muted-foreground">Drill-down</p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">
          {monthLabel} — détail par enveloppe
        </h3>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius-md)] border border-border/70 bg-card p-3">
          <dt className="text-xs text-muted-foreground">Prévu</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            {formatAmount(data.total.planned)}
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border/70 bg-card p-3">
          <dt className="text-xs text-muted-foreground">Réalisé</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            {formatAmount(data.total.realized)}
          </dd>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border/70 bg-card p-3">
          <dt className="text-xs text-muted-foreground">Engagé</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            {formatAmount(data.total.committed)}
            {taux != null ? (
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                · {formatPercent(taux)} réalisé
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <ul className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-muted-foreground/35" aria-hidden />
          Prévu
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm bg-[color:var(--state-danger)]"
            aria-hidden
          />
          Réalisé
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-sm bg-[color:var(--brand-gold)]"
            aria-hidden
          />
          Engagé
        </li>
      </ul>

      <div
        className="w-full min-w-0"
        style={{ height: chartHeight }}
        role="img"
        aria-label={`Répartition ${monthLabel} par enveloppe`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={envelopeChartData}
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            barGap={2}
            barCategoryGap="22%"
          >
            <CartesianGrid
              strokeDasharray="4 4"
              stroke={GRID_STROKE}
              horizontal={false}
              strokeOpacity={0.85}
            />
            <XAxis
              type="number"
              tick={{ fill: TICK_FILL, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisTick}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              width={108}
              tick={{ fill: TICK_FILL, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', fillOpacity: 0.35 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as
                  | (typeof envelopeChartData)[number]
                  | undefined;
                if (!row) return null;
                return (
                  <div className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 shadow-[var(--shadow-3)]">
                    <p className="text-sm font-semibold text-foreground">
                      {displayLabel(row.name, 'Enveloppe')}
                    </p>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      Prévu :{' '}
                      <span className="font-medium text-foreground">
                        {formatAmount(row.planned)}
                      </span>
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      Réalisé :{' '}
                      <span className="font-medium text-foreground">
                        {formatAmount(row.realized)}
                      </span>
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      Engagé :{' '}
                      <span className="font-medium text-foreground">
                        {formatAmount(row.committed)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="planned"
              name="Prévu"
              fill={PLANNED_FILL}
              radius={[0, 3, 3, 0]}
              maxBarSize={14}
              isAnimationActive
              animationDuration={480}
            />
            <Bar
              dataKey="realized"
              name="Réalisé"
              fill={REALIZED_FILL}
              radius={[0, 3, 3, 0]}
              maxBarSize={14}
              isAnimationActive
              animationDuration={480}
            />
            <Bar
              dataKey="committed"
              name="Engagé"
              fill={COMMITTED_FILL}
              radius={[0, 3, 3, 0]}
              maxBarSize={14}
              isAnimationActive
              animationDuration={480}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data.lines.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Principales lignes du mois
          </p>
          <ul className="mt-2 divide-y divide-border/60 rounded-[var(--radius-md)] border border-border/70 bg-card">
            {data.lines.map((line) => (
              <li key={line.lineId}>
                <button
                  type="button"
                  disabled={!onLineClick}
                  onClick={() => onLineClick?.(line.lineId)}
                  className="flex w-full min-h-11 flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {displayLabel(line.name, 'Ligne budgétaire')}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {displayLabel(line.envelopeName, 'Enveloppe')}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-right">
                    <span className="text-foreground">
                      {formatAmount(line.realized)}
                    </span>
                    <span aria-hidden> / </span>
                    {formatAmount(line.planned)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
