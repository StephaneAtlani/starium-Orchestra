'use client';

import Link from 'next/link';
import {
  Box,
  CircleDollarSign,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { cockpitCardClass } from '@/features/budgets/dashboard/components/budget-cockpit-primitives';
import {
  getCycleShortLabel,
  isActiveGovernanceCycle,
} from '../lib/governance-cycles-cockpit-data';
import { getGovernanceCycleCadenceLabel } from '../lib/governance-cycle-labels';
import {
  formatGovernanceDecimalAmount,
  getGovernanceCycleItemDisplayLabel,
} from '../lib/governance-cycle-formatters';
import type {
  GovernanceCycleGlobalSummaryDto,
  GovernanceCycleItemResponseDto,
  GovernanceCycleResponseDto,
} from '../types/governance-cycle.types';

const CADENCE_DOT_CLASS = [
  'bg-amber-500',
  'bg-red-500',
  'bg-sky-500',
  'bg-violet-500',
] as const;

const DECISION_ACCENTS = [
  { icon: CircleDollarSign, className: 'border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-300' },
  { icon: Box, className: 'border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300' },
  { icon: UserRound, className: 'border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-300' },
] as const;

type PendingDecisionRow = {
  item: GovernanceCycleItemResponseDto;
  cycleId: string;
  cycleName: string;
  cycleCode: string | null;
};

function PendingDecisionCard({
  row,
  accentIndex,
}: {
  row: PendingDecisionRow;
  accentIndex: number;
}) {
  const accent = DECISION_ACCENTS[accentIndex % DECISION_ACCENTS.length];
  const Icon = accent.icon;
  const cycleLabel = getCycleShortLabel({ name: row.cycleName, code: row.cycleCode });
  const budgetSuffix = row.item.estimatedBudgetAmount
    ? ` · ${formatGovernanceDecimalAmount(row.item.estimatedBudgetAmount)} demandés`
    : '';

  return (
    <Link
      href={`/cycles/${row.cycleId}`}
      className="flex gap-3 rounded-xl border border-border/80 bg-muted/15 p-3 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl border',
          accent.className,
        )}
        aria-hidden
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {getGovernanceCycleItemDisplayLabel(row.item)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {cycleLabel}
          {budgetSuffix}
        </p>
      </div>
    </Link>
  );
}

type Props = {
  cycles: GovernanceCycleResponseDto[];
  pendingDecisions: PendingDecisionRow[];
  pendingTotal: number;
  isLoading: boolean;
};

export function GovernanceCyclesCockpitSidebar({
  cycles,
  pendingDecisions,
  pendingTotal,
  isLoading,
}: Props) {
  const activeCycles = cycles.filter(isActiveGovernanceCycle);

  return (
    <div className="space-y-4" data-testid="governance-cycles-cockpit-sidebar">
      <section
        className={cn(cockpitCardClass, 'overflow-hidden')}
        aria-labelledby="governance-pending-heading"
      >
        <div className="flex items-center gap-2 border-b border-border/80 px-4 py-4 sm:px-5">
          <h2 id="governance-pending-heading" className="starium-section-title">
            Décisions en attente
          </h2>
          {pendingTotal > 0 ? (
            <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-amber-500/15 px-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
              {pendingTotal}
            </span>
          ) : null}
        </div>

        <div className="space-y-2 p-4 sm:p-5">
          {isLoading ? (
            <LoadingState rows={3} />
          ) : pendingDecisions.length === 0 ? (
            <EmptyState
              title="Aucune décision en attente"
              description="Les arbitrages requis apparaîtront ici."
            />
          ) : (
            pendingDecisions.slice(0, 5).map((row, index) => (
              <PendingDecisionCard key={row.item.id} row={row} accentIndex={index} />
            ))
          )}
          <Button variant="outline" className="mt-2 w-full min-h-11" asChild>
            <Link href="/cycles">Voir toutes les décisions</Link>
          </Button>
        </div>
      </section>

      <section
        className={cn(cockpitCardClass, 'overflow-hidden')}
        aria-labelledby="governance-cadence-heading"
      >
        <div className="border-b border-border/80 px-4 py-4 sm:px-5">
          <h2 id="governance-cadence-heading" className="starium-section-title">
            Cadence des cycles
          </h2>
        </div>

        <ul className="divide-y divide-border/70">
          {isLoading ? (
            <li className="p-5">
              <LoadingState rows={3} />
            </li>
          ) : activeCycles.length === 0 ? (
            <li className="p-5">
              <EmptyState
                title="Aucun cycle actif"
                description="Créez un cycle de pilotage pour définir la cadence."
              />
            </li>
          ) : (
            activeCycles.map((cycle, index) => (
              <li key={cycle.id}>
                <Link
                  href={`/cycles/${cycle.id}`}
                  className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                >
                  <span
                    className={cn(
                      'size-2.5 shrink-0 rounded-full',
                      CADENCE_DOT_CLASS[index % CADENCE_DOT_CLASS.length],
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {getCycleShortLabel(cycle)} — {cycle.name}
                    </p>
                    {cycle.objectiveSummary ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {cycle.objectiveSummary}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {getGovernanceCycleCadenceLabel(cycle.cadence)}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export type { PendingDecisionRow };
