'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import { KpiCard, type KpiCardFooterTone } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';

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

type KpiDef = {
  id: string;
  title: string;
  icon: React.ReactNode;
  iconWrapperClassName: string;
  footerTone: KpiCardFooterTone;
  value: (stats: ReturnType<typeof computeStats>, loading: boolean) => string;
  footer?: (stats: ReturnType<typeof computeStats>) => string | undefined;
};

const KPI_CARDS: KpiDef[] = [
  {
    id: 'total',
    title: 'Total',
    icon: <ShieldAlert aria-hidden />,
    iconWrapperClassName: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
    footerTone: 'info',
    value: (s, loading) => (loading ? '—' : String(s.total)),
    footer: (s) => (s.total > 0 ? 'Registre chargé' : 'Aucun risque'),
  },
  {
    id: 'open',
    title: 'Ouverts',
    icon: <AlertTriangle aria-hidden />,
    iconWrapperClassName: 'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
    footerTone: 'warning',
    value: (s, loading) => (loading ? '—' : String(s.open)),
    footer: (s) =>
      s.total > 0 ? `${Math.round((s.open / s.total) * 100)} % du total` : undefined,
  },
  {
    id: 'closed',
    title: 'Clôturés',
    icon: <CheckCircle2 aria-hidden />,
    iconWrapperClassName: 'bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]',
    footerTone: 'success',
    value: (s, loading) => (loading ? '—' : String(s.closed)),
  },
  {
    id: 'high-critical',
    title: 'Haute / critique',
    icon: <Flame aria-hidden />,
    iconWrapperClassName: 'bg-destructive/10 text-destructive',
    footerTone: 'danger',
    value: (s, loading) => (loading ? '—' : String(s.highCriticalOpen)),
    footer: () => 'Ouverts uniquement',
  },
  {
    id: 'overdue',
    title: 'Échéance dépassée',
    icon: <Clock3 aria-hidden />,
    iconWrapperClassName: 'bg-amber-500/12 text-amber-800 dark:text-amber-400',
    footerTone: 'warning',
    value: (s, loading) => (loading ? '—' : String(s.overdue)),
    footer: () => 'Non clôturés',
  },
  {
    id: 'monitored',
    title: 'Sous surveillance',
    icon: <Eye aria-hidden />,
    iconWrapperClassName: 'bg-violet-500/12 text-violet-700 dark:text-violet-400',
    footerTone: 'violet',
    value: (s, loading) => (loading ? '—' : String(s.monitored)),
  },
];

function KpiCardSkeleton() {
  return (
    <div className="starium-kpi-card !p-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-full max-w-[5.5rem]" />
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

type Props = {
  rows: ProjectRiskRegistryRow[];
  isLoading: boolean;
};

/**
 * Synthèse registre risques — grille KpiCard dense (FRONTEND_UI-UX §6.1).
 */
export function RisksRegistryKpi({ rows, isLoading }: Props) {
  const stats = computeStats(rows);

  return (
    <section className="starium-module space-y-2" data-testid="risks-registry-kpi" aria-labelledby="risks-kpi-heading">
      <div>
        <h2 id="risks-kpi-heading" className="text-sm font-semibold text-foreground">
          Synthèse du registre
        </h2>
        <p className="text-xs text-muted-foreground">
          Chiffres sur la sélection courante (filtres appliqués).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
        {isLoading
          ? KPI_CARDS.map((card) => <KpiCardSkeleton key={card.id} />)
          : KPI_CARDS.map((card) => {
              const footer = card.footer?.(stats);
              return (
                <KpiCard
                  key={card.id}
                  variant="dense"
                  iconShape="circle"
                  title={card.title}
                  value={card.value(stats, isLoading)}
                  footer={footer}
                  footerTone={card.footerTone}
                  iconWrapperClassName={card.iconWrapperClassName}
                  icon={card.icon}
                />
              );
            })}
      </div>
    </section>
  );
}
