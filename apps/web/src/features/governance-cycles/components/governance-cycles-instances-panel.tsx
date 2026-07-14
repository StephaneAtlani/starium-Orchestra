'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  cockpitCardClass,
} from '@/features/budgets/dashboard/components/budget-cockpit-primitives';
import {
  formatInstanceDayMonth,
  formatInstanceTimeLabel,
  getCycleShortLabel,
  getEnrichedCycleShortLabel,
  getInstanceDisplayTitle,
  getInstanceLocationLabel,
  getInstanceReadinessLabel,
  getInstanceScheduledAt,
  partitionInstancesByHorizon,
  type GovernanceCycleEnrichedInstance,
} from '../lib/governance-cycles-cockpit-data';
import { getGovernanceCycleCadenceLabel } from '../lib/governance-cycle-labels';
import { GovernanceCyclesCockpitPill } from './governance-cycles-cockpit-pill';
import type { GovernanceCycleGlobalSummaryDto } from '../types/governance-cycle.types';

function InstanceDateBlock({
  date,
  variant,
}: {
  date: Date | null;
  variant: 'upcoming' | 'past';
}) {
  if (!date) {
    return (
      <div
        className={cn(
          'flex w-14 shrink-0 flex-col overflow-hidden rounded-xl border text-center',
          variant === 'upcoming'
            ? 'border-amber-500/25 bg-amber-500/10'
            : 'border-border bg-muted/40',
        )}
        aria-hidden
      >
        <span className="py-2 text-lg font-bold leading-none text-foreground">—</span>
        <span className="border-t border-inherit py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          —
        </span>
      </div>
    );
  }

  const { day, month } = formatInstanceDayMonth(date);
  return (
    <div
      className={cn(
        'flex w-14 shrink-0 flex-col overflow-hidden rounded-xl border text-center',
        variant === 'upcoming'
          ? 'border-amber-500/25 bg-amber-500/10'
          : 'border-border bg-muted/40',
      )}
      aria-hidden
    >
      <span className="py-2 text-lg font-bold leading-none text-foreground">{day}</span>
      <span
        className={cn(
          'border-t border-inherit py-1 text-[10px] font-semibold uppercase tracking-wide',
          variant === 'upcoming' ? 'text-amber-800 dark:text-amber-300' : 'text-muted-foreground',
        )}
      >
        {month}
      </span>
    </div>
  );
}

function InstanceRow({
  row,
  variant,
  arbitrationsPending,
}: {
  row: GovernanceCycleEnrichedInstance;
  variant: 'upcoming' | 'past';
  arbitrationsPending: number;
}) {
  const scheduled = getInstanceScheduledAt(row.instance);
  const title = getInstanceDisplayTitle(row);
  const location = getInstanceLocationLabel(row);
  const readiness = getInstanceReadinessLabel(row);
  const cycleLabel = getEnrichedCycleShortLabel(row);

  const readinessIcon =
    readiness.tone === 'success' ? (
      <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
    ) : readiness.tone === 'danger' ? (
      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
    ) : (
      <Clock3 className="size-3.5 shrink-0" aria-hidden />
    );

  return (
    <article className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <InstanceDateBlock date={scheduled} variant={variant} />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <GovernanceCyclesCockpitPill label={cycleLabel} tone="warning" />
          <GovernanceCyclesCockpitPill
            label={getGovernanceCycleCadenceLabel(row.cycleCadence)}
            tone="info"
          />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {scheduled ? formatInstanceTimeLabel(scheduled) : 'Horaire à confirmer'}
          {location ? ` · ${location}` : ''}
          {row.instance.agendaCount > 0
            ? ` · ${row.instance.agendaCount} point${row.instance.agendaCount > 1 ? 's' : ''} à l'ordre du jour`
            : ''}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {row.sponsorLabel ? (
            <UserInitialsAvatar displayName={row.sponsorLabel} size="sm" />
          ) : null}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium',
              readiness.tone === 'success' && 'text-emerald-700 dark:text-emerald-400',
              readiness.tone === 'warning' && 'text-amber-800 dark:text-amber-400',
              readiness.tone === 'danger' && 'text-red-800 dark:text-red-400',
              readiness.tone === 'muted' && 'text-muted-foreground',
            )}
          >
            {readinessIcon}
            {readiness.label}
          </span>
          {variant === 'upcoming' && arbitrationsPending > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-400">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
              {arbitrationsPending} arbitrage{arbitrationsPending > 1 ? 's' : ''} requis
            </span>
          ) : null}
        </div>
      </div>

      <Button
        variant="link"
        size="sm"
        className="h-11 shrink-0 self-start px-0 text-[color:var(--brand-gold)] sm:self-center"
        asChild
      >
        <Link href={`/cycles/${row.cycleId}`}>
          {variant === 'upcoming' ? 'Préparer' : 'Consulter'}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </article>
  );
}

type Props = {
  instances: GovernanceCycleEnrichedInstance[];
  summariesByCycleId: Map<string, GovernanceCycleGlobalSummaryDto>;
  isLoading: boolean;
  id?: string;
};

export function GovernanceCyclesInstancesPanel({
  instances,
  summariesByCycleId,
  isLoading,
  id = 'cycles-instances',
}: Props) {
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const { upcoming, past } = useMemo(
    () => partitionInstancesByHorizon(instances),
    [instances],
  );
  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <section
      id={id}
      className={cn(cockpitCardClass, 'overflow-hidden')}
      aria-labelledby="governance-instances-heading"
      data-testid="governance-cycles-instances-panel"
    >
      <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <h2 id="governance-instances-heading" className="starium-section-title">
          Instances à venir & passées
        </h2>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab((v as 'upcoming' | 'history') ?? 'upcoming')}
        >
          <TabsList className="h-9 w-full sm:w-auto">
            <TabsTrigger value="upcoming" className="min-h-9 px-4">
              À venir
            </TabsTrigger>
            <TabsTrigger value="history" className="min-h-9 px-4">
              Historique
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="p-5">
          <LoadingState rows={4} />
        </div>
      ) : visible.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title={tab === 'upcoming' ? 'Aucune instance à venir' : 'Aucun historique'}
            description={
              tab === 'upcoming'
                ? 'Planifiez une séance de décision depuis un cycle actif.'
                : 'Les séances clôturées apparaîtront ici.'
            }
          />
        </div>
      ) : (
        <div role="list" aria-label={tab === 'upcoming' ? 'Instances à venir' : 'Historique des instances'}>
          {visible.map((row) => (
            <div key={`${row.cycleId}-${row.instance.id}`} role="listitem">
              <InstanceRow
                row={row}
                variant={tab === 'upcoming' ? 'upcoming' : 'past'}
                arbitrationsPending={
                  summariesByCycleId.get(row.cycleId)?.toArbitrateCount ?? 0
                }
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
