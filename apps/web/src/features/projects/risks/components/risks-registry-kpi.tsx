'use client';

import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';

type ValueTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const valueToneClass: Record<ValueTone, string> = {
  default: 'text-foreground',
  info: 'text-primary',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-yellow-800 dark:text-yellow-400',
  danger: 'text-destructive',
};

function val(n: number, loading: boolean) {
  if (loading) return '—';
  return String(n);
}

function Stat({
  label,
  valueStr,
  title,
  valueTone = 'default',
}: {
  label: string;
  valueStr: string;
  title?: string;
  valueTone?: ValueTone;
}) {
  return (
    <div className="min-w-0" title={title}>
      <div className="truncate text-center text-[0.62rem] font-medium leading-tight text-muted-foreground sm:text-left sm:text-[0.65rem]">
        {label}
      </div>
      <div
        className={cn(
          'text-center text-base font-semibold tabular-nums tracking-tight sm:text-left sm:text-lg',
          valueToneClass[valueTone],
        )}
      >
        {valueStr}
      </div>
    </div>
  );
}

function KpiGroup({
  sectionId,
  label,
  children,
}: {
  sectionId: string;
  label: string;
  children: ReactNode;
}) {
  const headingId = `risks-kpi-${sectionId}`;
  return (
    <section
      className="min-w-0 rounded-lg border border-border bg-transparent px-2.5 py-2 sm:px-3 sm:py-2.5"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="mb-1.5 border-b border-border/70 pb-1 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </h2>
      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 sm:gap-x-3">{children}</div>
    </section>
  );
}

function startOfTodayUtc(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isDueOverdue(iso: string | null): boolean {
  if (!iso) return false;
  try {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    return t < startOfTodayUtc();
  } catch {
    return false;
  }
}

function computeStats(rows: ProjectRiskRegistryRow[]) {
  let open = 0;
  let closed = 0;
  let monitored = 0;
  let highCriticalOpen = 0;
  let overdue = 0;

  for (const r of rows) {
    if (r.status === 'OPEN') open += 1;
    if (r.status === 'CLOSED') closed += 1;
    if (r.status === 'MONITORED') monitored += 1;
    if (
      r.status === 'OPEN' &&
      (r.criticalityLevel === 'HIGH' || r.criticalityLevel === 'CRITICAL')
    ) {
      highCriticalOpen += 1;
    }
    if (r.status !== 'CLOSED' && isDueOverdue(r.dueDate)) overdue += 1;
  }

  return {
    total: rows.length,
    open,
    closed,
    monitored,
    highCriticalOpen,
    overdue,
  };
}

type Props = {
  rows: ProjectRiskRegistryRow[];
  isLoading: boolean;
};

/**
 * Synthèse registre risques — grille compacte (FRONTEND_UI-UX §6.1), calcul client.
 */
export function RisksRegistryKpi({ rows, isLoading }: Props) {
  const loading = isLoading;
  const s = computeStats(rows);
  const v = (n: number) => val(n, loading);

  return (
    <Card
      size="sm"
      className="overflow-hidden border-border shadow-sm"
      data-testid="risks-registry-kpi"
    >
      <CardHeader className="border-b border-border/60 pb-2 pt-3 sm:pb-2.5">
        <CardTitle className="text-sm font-medium leading-tight">Synthèse du registre</CardTitle>
        <CardDescription className="text-xs leading-snug text-muted-foreground">
          Chiffres sur la sélection courante (filtres appliqués). Sans filtre, tout le registre chargé pour le client actif.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-3">
          <KpiGroup sectionId="volume" label="Volume">
            <Stat label="Total" valueStr={v(s.total)} valueTone="info" />
            <Stat label="Ouverts" valueStr={v(s.open)} valueTone="info" />
            <Stat label="Clôturés" valueStr={v(s.closed)} valueTone="success" />
          </KpiGroup>

          <KpiGroup sectionId="priority" label="Priorité & échéances">
            <Stat
              label="Haute / critique"
              title="Risques ouverts à criticité haute ou critique"
              valueStr={v(s.highCriticalOpen)}
              valueTone={s.highCriticalOpen > 0 ? 'danger' : 'default'}
            />
            <Stat
              label="Échéance dépassée"
              title="Non clôturés avec date d’échéance avant aujourd’hui"
              valueStr={v(s.overdue)}
              valueTone={s.overdue > 0 ? 'warning' : 'default'}
            />
            <Stat label="Sous surveillance" valueStr={v(s.monitored)} valueTone="info" />
          </KpiGroup>
        </div>
      </CardContent>
    </Card>
  );
}
