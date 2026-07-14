'use client';

import {
  CheckCircle2,
  CircleCheckBig,
  Clock3,
  Users,
} from 'lucide-react';
import { KpiCard, type KpiCardFooterTone } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  computeInstanceCompletionRate,
  findNextInstance,
  formatGovernanceRelativeDaysFr,
  getCycleShortLabel,
  getEnrichedCycleShortLabel,
  getInstanceScheduledAt,
  isActiveGovernanceCycle,
  sumPendingDecisions,
  type GovernanceCycleEnrichedInstance,
} from '../lib/governance-cycles-cockpit-data';
import { formatGovernanceCycleDate } from '../lib/governance-cycle-formatters';
import type { GovernanceCycleGlobalSummaryDto } from '../types/governance-cycle.types';
import type { GovernanceCycleResponseDto } from '../types/governance-cycle.types';

function KpiSkeleton() {
  return (
    <div className="starium-kpi-card !p-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-full max-w-[5.5rem]" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

type Props = {
  cycles: GovernanceCycleResponseDto[];
  enrichedInstances: GovernanceCycleEnrichedInstance[];
  summaries: Array<GovernanceCycleGlobalSummaryDto | undefined>;
  isLoading: boolean;
};

export function GovernanceCyclesCockpitKpi({
  cycles,
  enrichedInstances,
  summaries,
  isLoading,
}: Props) {
  const activeCycles = cycles.filter(isActiveGovernanceCycle);
  const nextInstance = findNextInstance(enrichedInstances);
  const nextDate = nextInstance ? getInstanceScheduledAt(nextInstance.instance) : null;
  const pending = sumPendingDecisions(summaries);
  const completionRate = computeInstanceCompletionRate(enrichedInstances);

  const activeLabels = activeCycles
    .map((c) => getCycleShortLabel(c))
    .slice(0, 4)
    .join(' · ');

  if (isLoading && cycles.length === 0) {
    return (
      <section className="starium-module" data-testid="governance-cycles-cockpit-kpi">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  const cards: Array<{
    id: string;
    title: string;
    value: string;
    footer?: string;
    footerTone: KpiCardFooterTone;
    icon: React.ReactNode;
    iconWrapperClassName: string;
  }> = [
    {
      id: 'next',
      title: 'Prochaine instance',
      value: nextInstance ? getEnrichedCycleShortLabel(nextInstance) : '—',
      footer: nextDate
        ? `${formatGovernanceCycleDate(nextDate.toISOString())} · ${formatGovernanceRelativeDaysFr(nextDate)}`
        : 'Aucune séance planifiée',
      footerTone: 'warning',
      icon: <Clock3 aria-hidden />,
      iconWrapperClassName:
        'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
    },
    {
      id: 'active',
      title: 'Cycles actifs',
      value: String(activeCycles.length),
      footer: activeLabels || 'Aucun cycle actif',
      footerTone: 'info',
      icon: <Users aria-hidden />,
      iconWrapperClassName: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
    },
    {
      id: 'pending',
      title: 'Décisions en attente',
      value: String(pending.total),
      footer:
        pending.arbitrationsRequired > 0
          ? `${pending.arbitrationsRequired} arbitrage${pending.arbitrationsRequired > 1 ? 's' : ''} requis`
          : 'Aucun arbitrage bloquant',
      footerTone: pending.total > 0 ? 'warning' : 'muted',
      icon: <CircleCheckBig aria-hidden />,
      iconWrapperClassName: 'bg-amber-500/12 text-amber-800 dark:text-amber-400',
    },
    {
      id: 'presence',
      title: 'Taux de complétion',
      value: completionRate != null ? `${completionRate}%` : '—',
      footer: completionRate != null ? '12 dernières séances clôturées' : 'Pas encore de séance clôturée',
      footerTone: 'success',
      icon: <CheckCircle2 aria-hidden />,
      iconWrapperClassName: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
    },
  ];

  return (
    <section className="starium-module" data-testid="governance-cycles-cockpit-kpi">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <KpiCard
            key={card.id}
            variant="dense"
            iconShape="circle"
            title={card.title}
            value={card.value}
            footer={card.footer}
            footerTone={card.footerTone}
            icon={card.icon}
            iconWrapperClassName={card.iconWrapperClassName}
          />
        ))}
      </div>
    </section>
  );
}
