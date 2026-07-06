'use client';

import { useMemo } from 'react';
import {
  ClipboardList,
  PauseCircle,
  PlayCircle,
  TrendingUp,
  UserX,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActionPlanApi } from '../types/project.types';
import { computeActionPlanListStats } from '../lib/action-plan-display';

export function ActionPlansListKpiStrip({
  items,
  isLoading,
}: {
  items: ActionPlanApi[] | undefined;
  isLoading: boolean;
}) {
  const stats = useMemo(
    () => computeActionPlanListStats(items ?? []),
    [items],
  );

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-2" aria-labelledby="action-plans-kpi-heading">
      <div>
        <h2 id="action-plans-kpi-heading" className="text-sm font-semibold text-foreground">
          Synthèse de la page affichée
        </h2>
        <p className="text-xs text-muted-foreground">
          Calculée sur les plans visibles après filtrage.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Plans"
          value={String(stats.total)}
          icon={<ClipboardList aria-hidden />}
          iconWrapperClassName="bg-[color:var(--neutral-100)] text-[color:var(--neutral-600)]"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Actifs"
          value={String(stats.active)}
          footer={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)} % de la page` : undefined}
          footerTone="success"
          icon={<PlayCircle aria-hidden />}
          iconWrapperClassName="bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="En pause"
          value={String(stats.onHold)}
          icon={<PauseCircle aria-hidden />}
          iconWrapperClassName="bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]"
          footerTone="warning"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Sans responsable"
          value={String(stats.unassigned)}
          icon={<UserX aria-hidden />}
          iconWrapperClassName="bg-destructive/10 text-destructive"
          footerTone="danger"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Avancement moyen"
          value={`${stats.avgProgress} %`}
          icon={<TrendingUp aria-hidden />}
          iconWrapperClassName="bg-sky-500/12 text-sky-700 dark:text-sky-400"
          footerTone="info"
        />
      </div>
    </section>
  );
}
