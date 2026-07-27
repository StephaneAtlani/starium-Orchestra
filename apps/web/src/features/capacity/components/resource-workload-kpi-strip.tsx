'use client';

import { useMemo } from 'react';
import { AlertTriangle, CircleCheck, Gauge, Users } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumberFr } from '@/lib/currency-format';
import { computeResourceWorkloadStats } from '../lib/resource-workload';
import type { ResourceProjectLoadRow } from '../types/capacity.types';

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count > 1 ? plural : singular;
}

function days(value: number): string {
  return `${formatNumberFr(value, { maxFraction: 1 })} j`;
}

export function ResourceWorkloadKpiStrip({
  rows,
  isLoading,
  periodLabel,
}: {
  rows: ResourceProjectLoadRow[] | undefined;
  isLoading: boolean;
  /** Fenêtre couverte, affichée en sous-titre (ex. « juin 2026 »). */
  periodLabel: string;
}) {
  const stats = useMemo(() => computeResourceWorkloadStats(rows ?? []), [rows]);

  if (isLoading || !rows) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-2" aria-labelledby="resources-workload-kpi-heading">
      <div>
        <h2
          id="resources-workload-kpi-heading"
          className="text-sm font-semibold text-foreground"
        >
          Plan de charge
        </h2>
        <p className="text-xs text-muted-foreground">
          Capacité et allocations sur {periodLabel}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Ressources"
          value={String(stats.resourceCount)}
          footer={
            stats.allocatedResourceCount > 0
              ? `${stats.allocatedResourceCount} ${pluralize(stats.allocatedResourceCount, 'allouée', 'allouées')}`
              : 'aucune allocation'
          }
          footerTone="brand"
          icon={<Users aria-hidden />}
          iconWrapperClassName="bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Taux d'occupation"
          value={stats.occupancyPercent == null ? '—' : `${stats.occupancyPercent} %`}
          footer={
            stats.totalCapacityDays > 0
              ? `${days(stats.totalAllocatedDays)} sur ${days(stats.totalCapacityDays)}`
              : 'capacité non paramétrée'
          }
          footerTone={stats.occupancyPercent == null ? 'muted' : 'info'}
          icon={<Gauge aria-hidden />}
          iconWrapperClassName="bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="En surcharge"
          value={String(stats.overloadedCount)}
          footer={stats.overloadedCount > 0 ? 'au-delà de 100 %' : 'aucune surcharge'}
          footerTone={stats.overloadedCount > 0 ? 'danger' : 'muted'}
          icon={<AlertTriangle aria-hidden />}
          iconWrapperClassName="bg-destructive/10 text-destructive"
        />
        <KpiCard
          variant="dense"
          iconShape="circle"
          title="Capacité disponible"
          value={days(stats.availableDays)}
          footer="jours mobilisables"
          footerTone="success"
          icon={<CircleCheck aria-hidden />}
          iconWrapperClassName="bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]"
        />
      </div>
    </section>
  );
}
