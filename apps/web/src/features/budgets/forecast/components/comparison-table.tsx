'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import type {
  BudgetComparisonLineItem,
  BudgetComparisonResponse,
  ForecastLineStatus,
} from '@/features/budgets/types/budget-forecast.types';
import { ForecastStatusBadge } from './forecast-status-badge';
import { cn } from '@/lib/utils';
import { comparisonDiffClass } from '@/features/budgets/forecast/lib/comparison-diff';

function comparisonModeDescription(data: BudgetComparisonResponse): string {
  const { compareTo } = data;
  if (data.leftSnapshotId && data.rightSnapshotId && compareTo == null) {
    return 'Comparaison de deux snapshots : montants révisés alignés par ligne budgétaire.';
  }
  if (
    data.left?.kind === 'version' &&
    data.right?.kind === 'version' &&
    compareTo == null
  ) {
    return 'Comparaison de deux versions : montants révisés alignés par ligne budgétaire.';
  }
  switch (compareTo) {
    case 'baseline':
      return 'Budget actuel comparé à la baseline du jeu de versions.';
    case 'snapshot':
      return 'Budget actuel comparé à un instantané figé (snapshot).';
    case 'version':
      return 'Budget actuel comparé à une autre révision du même jeu de versions.';
    default:
      return 'Comparaison des montants révisés ligne à ligne.';
  }
}

function fallbackSideLabel(
  side: 'left' | 'right',
  data: BudgetComparisonResponse,
): string {
  const meta = side === 'left' ? data.left : data.right;
  const kind = meta?.kind;
  if (side === 'left') {
    if (kind === 'live') return 'Budget actuel (live)';
    if (kind === 'version') return 'Version (gauche)';
    return 'Référence (gauche)';
  }
  if (kind === 'baseline') return 'Baseline (référence versionnement)';
  if (kind === 'snapshot') return 'Snapshot (cible)';
  if (kind === 'version') return 'Autre version (cible)';
  return 'Comparé (droite)';
}

function resolvePilotageColumn(data: BudgetComparisonResponse): 'left' | 'right' {
  if (data.pilotageColumn) return data.pilotageColumn;
  return data.compareTo != null ? 'left' : 'right';
}

function pilotAmounts(row: BudgetComparisonLineItem, col: 'left' | 'right') {
  return col === 'left' ? row.left : row.right;
}

function statusExplanation(
  status: ForecastLineStatus,
  pilotLabel: string,
): string {
  if (status === 'CRITICAL') {
    return `CRITICAL : consommé > budgétaire révisé sur la colonne pilotage « ${pilotLabel} ».`;
  }
  if (status === 'WARNING') {
    return `WARNING : prévisionnel > budgétaire révisé (consommé ≤ budgétaire) — colonne « ${pilotLabel} ».`;
  }
  return `OK : consommé et prévisionnel cohérents avec le budgétaire révisé — « ${pilotLabel} ».`;
}

function ComparisonContextBanner({ data }: { data: BudgetComparisonResponse }) {
  const leftName =
    data.leftLabel?.trim() || fallbackSideLabel('left', data);
  const rightName =
    data.rightLabel?.trim() || fallbackSideLabel('right', data);
  const modeHint = comparisonModeDescription(data);
  const pilotCol = resolvePilotageColumn(data);
  const pilotName = pilotCol === 'left' ? leftName : rightName;

  return (
    <div
      className="mb-3 rounded-lg border border-border/80 bg-muted/35 px-3 py-2.5 text-sm leading-snug text-foreground"
      data-testid="comparison-context-banner"
    >
      <p className="font-medium text-foreground">{modeHint}</p>
      <p className="mt-1.5 text-muted-foreground">
        <span className="text-foreground">Gauche :</span> {leftName}
        <span className="mx-1.5 text-border">·</span>
        <span className="text-foreground">Droite :</span> {rightName}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="text-foreground">Pilotage (statut / variance) :</span> colonne{' '}
        <strong>{pilotCol === 'left' ? 'gauche' : 'droite'}</strong> (« {pilotName} »). Les colonnes
        supplémentaires montrent le <strong>consommé</strong> et le <strong>prévisionnel</strong> sur
        ce même périmètre pour expliquer OK / WARNING / CRITICAL.
      </p>
    </div>
  );
}

function AmountColumnHeader({
  title,
  subtitle = 'Montant révisé',
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className="line-clamp-2 whitespace-normal break-words text-right font-medium leading-tight">
        {title}
      </span>
      <span className="text-[0.7rem] font-normal uppercase tracking-wide text-muted-foreground">
        {subtitle}
      </span>
    </span>
  );
}

function lineDiff(
  left: number,
  right: number,
): number {
  return right - left;
}

/** En-tête figé en haut + 1ʳᵉ colonne figée à gauche dans le scroll. */
const STICKY_HEAD = 'sticky top-0 z-20 bg-muted/95 backdrop-blur-sm';
const STICKY_CORNER =
  'sticky left-0 top-0 z-30 border-r border-border bg-muted/95 backdrop-blur-sm shadow-[4px_0_14px_-6px_rgba(0,0,0,0.12)]';
const STICKY_LINE_COL =
  'sticky left-0 z-10 border-r border-border bg-card shadow-[4px_0_14px_-6px_rgba(0,0,0,0.08)]';
const STICKY_LINE_COL_FOOT = 'sticky left-0 z-10 border-r border-border bg-muted/30';

/** Groupes de colonnes affichables (la comparaison API est inchangée). */
export type ComparisonColumnGroups = {
  revised: boolean;
  pilotage: boolean;
  ecarts: boolean;
  statut: boolean;
};

const DEFAULT_COLUMN_GROUPS: ComparisonColumnGroups = {
  revised: true,
  pilotage: true,
  ecarts: true,
  statut: true,
};

function ComparisonColumnToggles({
  value,
  onChange,
}: {
  value: ComparisonColumnGroups;
  onChange: (next: ComparisonColumnGroups) => void;
}) {
  const toggle = (key: keyof ComparisonColumnGroups) => {
    const next = { ...value, [key]: !value[key] };
    const anyVisible =
      next.revised || next.pilotage || next.ecarts || next.statut;
    if (!anyVisible) return;
    onChange(next);
  };

  const groups: {
    key: keyof ComparisonColumnGroups;
    label: string;
    hint: string;
  }[] = [
    {
      key: 'revised',
      label: 'Montants révisés',
      hint: 'Gauche / droite (budgets comparés)',
    },
    {
      key: 'pilotage',
      label: 'Pilotage',
      hint: 'Consommé et prévisionnel (périmètre statut)',
    },
    {
      key: 'ecarts',
      label: 'Écarts',
      hint: 'Écart révisé et variance forecast',
    },
    {
      key: 'statut',
      label: 'Statut ligne',
      hint: 'OK / WARNING / CRITICAL',
    },
  ];

  return (
    <div
      className="mb-3 rounded-lg border border-border/70 bg-card px-3 py-2.5"
      data-testid="comparison-column-toggles"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Colonnes affichées
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {groups.map(({ key, label, hint }) => (
          <label
            key={key}
            className="flex cursor-pointer items-start gap-2 text-sm leading-snug"
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border border-input"
              checked={value[key]}
              onChange={() => toggle(key)}
            />
            <span>
              <span className="font-medium text-foreground">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ComparisonTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" data-testid="comparison-table-skeleton">
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted/70" />
      ))}
    </div>
  );
}

export interface ComparisonTableProps {
  data: BudgetComparisonResponse | null | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function ComparisonTable({ data, isLoading, error }: ComparisonTableProps) {
  const [cols, setCols] = useState<ComparisonColumnGroups>(DEFAULT_COLUMN_GROUPS);

  if (isLoading) {
    return <ComparisonTableSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="comparison-table-error">
        <AlertTitle>Comparaison impossible</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="comparison-table-empty">
        Aucune donnée disponible
      </p>
    );
  }

  if (data.lines.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="comparison-table-no-result"
      >
        Aucune ligne à comparer pour ce périmètre
      </p>
    );
  }

  const cur = data.currency;
  const sumLeftBudget = data.lines.reduce((s, r) => s + r.left.revisedAmount, 0);
  const leftColTitle = data.leftLabel?.trim() || fallbackSideLabel('left', data);
  const rightColTitle = data.rightLabel?.trim() || fallbackSideLabel('right', data);
  const pilotCol = resolvePilotageColumn(data);
  const pilotLabelForHeader =
    pilotCol === 'left' ? leftColTitle : rightColTitle;
  const sumPilotConsumed = data.lines.reduce(
    (s, r) => s + pilotAmounts(r, pilotCol).consumedAmount,
    0,
  );
  const sumPilotForecast = data.lines.reduce(
    (s, r) => s + pilotAmounts(r, pilotCol).forecastAmount,
    0,
  );

  const visibleColCount =
    1 +
    (cols.revised ? 2 : 0) +
    (cols.pilotage ? 2 : 0) +
    (cols.ecarts ? 2 : 0) +
    (cols.statut ? 1 : 0);

  const tableMinW =
    visibleColCount >= 8
      ? 'min-w-[56rem]'
      : visibleColCount >= 5
        ? 'min-w-[36rem]'
        : 'min-w-[20rem]';

  return (
    <div className="space-y-0">
      <ComparisonContextBanner data={data} />
      <ComparisonColumnToggles value={cols} onChange={setCols} />
      <div className="max-h-[min(70vh,560px)] overflow-auto rounded-md border border-border">
      <Table noWrapper className={tableMinW}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              className={cn(
                STICKY_CORNER,
                'min-w-[10rem] max-w-[18rem] align-bottom text-left',
              )}
            >
              Ligne budgétaire
            </TableHead>
            {cols.revised ? (
              <>
                <TableHead className={cn(STICKY_HEAD, 'max-w-[14rem] text-right align-bottom')}>
                  <AmountColumnHeader title={leftColTitle} />
                </TableHead>
                <TableHead className={cn(STICKY_HEAD, 'max-w-[14rem] text-right align-bottom')}>
                  <AmountColumnHeader title={rightColTitle} />
                </TableHead>
              </>
            ) : null}
            {cols.pilotage ? (
              <>
                <TableHead className={cn(STICKY_HEAD, 'max-w-[11rem] text-right align-bottom')}>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="line-clamp-2 text-right font-medium leading-tight">
                      Consommé (pilotage)
                    </span>
                    <span className="text-[0.7rem] font-normal uppercase tracking-wide text-muted-foreground">
                      {pilotLabelForHeader}
                    </span>
                  </span>
                </TableHead>
                <TableHead className={cn(STICKY_HEAD, 'max-w-[11rem] text-right align-bottom')}>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="line-clamp-2 text-right font-medium leading-tight">
                      Prévisionnel (pilotage)
                    </span>
                    <span className="text-[0.7rem] font-normal uppercase tracking-wide text-muted-foreground">
                      {pilotLabelForHeader}
                    </span>
                  </span>
                </TableHead>
              </>
            ) : null}
            {cols.ecarts ? (
              <>
                <TableHead className={cn(STICKY_HEAD, 'text-right align-bottom')}>
                  <span className="flex flex-col items-end gap-0.5">
                    <span>Écart révisé</span>
                    <span className="text-[0.7rem] font-normal text-muted-foreground">
                      (droite − gauche)
                    </span>
                  </span>
                </TableHead>
                <TableHead className={cn(STICKY_HEAD, 'max-w-[10rem] text-right align-bottom')}>
                  <span className="flex flex-col items-end gap-0.5">
                    <span>Variance forecast</span>
                    <span className="text-[0.7rem] font-normal text-muted-foreground">
                      ({pilotLabelForHeader})
                    </span>
                  </span>
                </TableHead>
              </>
            ) : null}
            {cols.statut ? (
              <TableHead className={cn(STICKY_HEAD, 'align-bottom')}>Statut ligne</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.lines.map((row) => {
            const d = lineDiff(row.left.revisedAmount, row.right.revisedAmount);
            const pil = pilotAmounts(row, pilotCol);
            return (
              <TableRow key={row.lineKey} className="group hover:bg-muted/50">
                <TableCell
                  className={cn(
                    STICKY_LINE_COL,
                    'max-w-[18rem] whitespace-normal group-hover:bg-muted/50',
                  )}
                >
                  {row.name}
                </TableCell>
                {cols.revised ? (
                  <>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.left.revisedAmount, cur)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.right.revisedAmount, cur)}
                    </TableCell>
                  </>
                ) : null}
                {cols.pilotage ? (
                  <>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(pil.consumedAmount, cur)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(pil.forecastAmount, cur)}
                    </TableCell>
                  </>
                ) : null}
                {cols.ecarts ? (
                  <>
                    <TableCell className={cn('text-right tabular-nums', comparisonDiffClass(d))}>
                      {formatCurrency(d, cur)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.varianceForecast, cur)}
                    </TableCell>
                  </>
                ) : null}
                {cols.statut ? (
                  <TableCell>
                    <ForecastStatusBadge
                      status={row.status}
                      title={statusExplanation(row.status, pilotLabelForHeader)}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/30 font-medium hover:bg-muted/30">
            <TableCell className={cn(STICKY_LINE_COL_FOOT, 'font-medium')}>
              Totaux
            </TableCell>
            {cols.revised ? (
              <>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(sumLeftBudget, cur)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(data.totals.budget, cur)}
                </TableCell>
              </>
            ) : null}
            {cols.pilotage ? (
              <>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(sumPilotConsumed, cur)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(sumPilotForecast, cur)}
                </TableCell>
              </>
            ) : null}
            {cols.ecarts ? (
              <>
                <TableCell
                  className={cn(
                    'text-right tabular-nums',
                    comparisonDiffClass(data.diff.revisedAmount),
                  )}
                >
                  {formatCurrency(data.diff.revisedAmount, cur)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(data.variance.forecast, cur)}
                </TableCell>
              </>
            ) : null}
            {cols.statut ? <TableCell /> : null}
          </TableRow>
          <TableRow className="text-xs text-muted-foreground hover:bg-muted/20">
            <TableCell colSpan={visibleColCount}>
              <span className="font-medium text-foreground">Totaux et écarts (colonne droite = « {rightColTitle} »)</span>
              {' — '}
              Forecast agrégé : {formatCurrency(data.totals.forecast, cur)} · Consommé :{' '}
              {formatCurrency(data.totals.consumed, cur)} · Variance consommation :{' '}
              {formatCurrency(data.variance.consumed, cur)} · Diff. forecast :{' '}
              {formatCurrency(data.diff.forecastAmount, cur)} · Diff. consommé :{' '}
              {formatCurrency(data.diff.consumedAmount, cur)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      </div>
    </div>
  );
}
