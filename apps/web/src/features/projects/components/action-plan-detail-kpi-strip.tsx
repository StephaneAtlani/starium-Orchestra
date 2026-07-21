'use client';

import { useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Clock,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SynthesisListKpi,
  SynthesisListKpis,
} from '@/features/projects/components/synthesis-ds-kpi';
import type { ActionPlanTaskApi } from '../types/project.types';

export type ActionPlanDetailTaskStats = {
  open: number;
  inProgress: number;
  late: number;
  doneRate: number;
  total: number;
};

export function computeActionPlanTaskStats(
  items: ActionPlanTaskApi[],
): ActionPlanDetailTaskStats {
  const total = items.length;
  const done = items.filter((t) => t.status === 'DONE').length;
  const inProgress = items.filter((t) => t.status === 'IN_PROGRESS').length;
  const late = items.filter(
    (t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && Boolean(t.isLate),
  ).length;
  const open = total - done;
  const doneRate = total > 0 ? Math.round((done / total) * 100) : 0;
  return { open, inProgress, late, doneRate, total };
}

export function ActionPlanDetailKpiStrip({
  items,
  isLoading,
}: {
  items: ActionPlanTaskApi[] | undefined;
  isLoading: boolean;
}) {
  const stats = useMemo(
    () => computeActionPlanTaskStats(items ?? []),
    [items],
  );

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-[var(--radius-lg,14px)]" />
        ))}
      </div>
    );
  }

  const inProgressShare =
    stats.open > 0 ? Math.round((stats.inProgress / stats.open) * 100) : 0;

  return (
    <SynthesisListKpis columns={4} aria-label="Synthèse des actions du plan">
      <SynthesisListKpi
        icon={<ClipboardList />}
        iconClassName="starium-list-kpi__ico--neutral"
        label="Actions ouvertes"
        value={String(stats.open)}
        sub={`sur ${stats.total} au total`}
        subClassName="text-[color:var(--neutral-500)]"
      />
      <SynthesisListKpi
        icon={<Activity />}
        iconClassName="starium-list-kpi__ico--info"
        label="En cours"
        value={String(stats.inProgress)}
        sub={stats.open > 0 ? `${inProgressShare}% des actions ouvertes` : '—'}
        subClassName="text-[color:var(--state-info)]"
      />
      <SynthesisListKpi
        icon={<Clock />}
        iconClassName="starium-list-kpi__ico--danger"
        label="En retard"
        value={String(stats.late)}
        sub={stats.late > 0 ? 'à traiter en priorité' : 'aucune'}
        subClassName="text-[color:var(--state-danger)]"
      />
      <SynthesisListKpi
        icon={<CheckCircle2 />}
        iconClassName="starium-list-kpi__ico--success"
        label="Taux de réalisation"
        value={`${stats.doneRate}%`}
        sub={stats.total > 0 ? `${stats.total - stats.open} terminée(s)` : '—'}
        subClassName="text-[color:var(--state-success)]"
      />
    </SynthesisListKpis>
  );
}
