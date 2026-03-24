'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Flag,
  Layers,
  PlayCircle,
  Settings2,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { usePortfolioSummaryQuery } from '@/features/projects/hooks/use-portfolio-summary-query';
import { projectsList } from '@/features/projects/constants/project-routes';
import type { ProjectsPortfolioSummary } from '@/features/projects/types/project.types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDashboardWidgets } from '../hooks/use-dashboard-widgets';
import {
  DASHBOARD_PROJECT_KPI_OPTIONS,
  type DashboardProjectKpiKey,
  type DashboardWidgetsConfig,
} from '../types/dashboard-widgets.types';

type ValueTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const valueToneClass: Record<ValueTone, string> = {
  default: 'text-foreground',
  info: 'text-primary',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-yellow-800 dark:text-yellow-400',
  danger: 'text-destructive',
};

const iconForKey: Record<
  DashboardProjectKpiKey,
  React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  totalProjects: Layers,
  inProgressProjects: PlayCircle,
  completedProjects: CheckCircle2,
  lateProjects: Clock,
  criticalProjects: AlertTriangle,
  blockedProjects: Ban,
  noRiskProjects: ShieldAlert,
  noOwnerProjects: UserX,
  noMilestoneProjects: Flag,
};

function toneForKey(key: DashboardProjectKpiKey): ValueTone {
  switch (key) {
    case 'totalProjects':
    case 'inProgressProjects':
      return 'info';
    case 'completedProjects':
      return 'success';
    case 'lateProjects':
    case 'noRiskProjects':
    case 'noOwnerProjects':
    case 'noMilestoneProjects':
      return 'warning';
    case 'criticalProjects':
    case 'blockedProjects':
      return 'danger';
    default:
      return 'default';
  }
}

function ProjectKpiStat({
  label,
  valueStr,
  title,
  valueTone,
  Icon,
}: {
  label: string;
  valueStr: string;
  title?: string;
  valueTone: ValueTone;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border p-4 shadow-sm',
        'ring-1 ring-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-card',
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              'text-2xl font-semibold tabular-nums tracking-tight',
              valueToneClass[valueTone],
            )}
            title={title}
          >
            {valueStr}
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border p-4 shadow-sm',
        'ring-1 ring-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-card',
      )}
    >
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </div>
  );
}

function valueForKey(
  key: DashboardProjectKpiKey,
  s: ProjectsPortfolioSummary | undefined,
  loading: boolean,
): string {
  if (loading) return '—';
  const n = s?.[key];
  return String(n ?? 0);
}

function ProjectKpiCards({
  summary,
  loading,
  keys,
}: {
  summary: ProjectsPortfolioSummary | undefined;
  loading: boolean;
  keys: DashboardProjectKpiKey[];
}) {
  const metaById = React.useMemo(
    () => new Map(DASHBOARD_PROJECT_KPI_OPTIONS.map((o) => [o.id, o])),
    [],
  );

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      data-testid="dashboard-project-kpis"
    >
      {keys.map((k) => {
        const meta = metaById.get(k);
        const Icon = iconForKey[k];
        return (
          <ProjectKpiStat
            key={k}
            label={meta?.label ?? k}
            title={meta?.title}
            valueStr={valueForKey(k, summary, loading)}
            valueTone={toneForKey(k)}
            Icon={Icon}
          />
        );
      })}
    </div>
  );
}

function ProjectWidgetSettingsDialog({
  open,
  onOpenChange,
  config,
  setProjectKpisVisible,
  toggleProjectKpi,
  resetProjectKpisDefaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardWidgetsConfig;
  setProjectKpisVisible: (visible: boolean) => void;
  toggleProjectKpi: (key: DashboardProjectKpiKey, checked: boolean) => void;
  resetProjectKpisDefaults: () => void;
}) {
  const selected = new Set(config.projectKpis.kpis);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Widget Projets</DialogTitle>
          <DialogDescription>
            Indicateurs du portefeuille (client actif) — enregistrés pour ce
            client et votre compte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={config.projectKpis.visible}
              onChange={(e) => setProjectKpisVisible(e.target.checked)}
            />
            <span className="text-sm font-medium">Afficher le widget sur le dashboard</span>
          </label>

          <div className="space-y-2 border-t border-border pt-3">
            <Label className="text-xs font-medium text-muted-foreground">
              Indicateurs affichés (au moins un)
            </Label>
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {DASHBOARD_PROJECT_KPI_OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={selected.has(opt.id)}
                      disabled={
                        selected.has(opt.id) && config.projectKpis.kpis.length <= 1
                      }
                      onChange={(e) => toggleProjectKpi(opt.id, e.target.checked)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 border-t-0 sm:flex-row sm:flex-wrap sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetProjectKpisDefaults()}
          >
            Réinitialiser les KPI
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Widget synthèse portefeuille projets configurable (localStorage par utilisateur + client).
 */
export function DashboardProjectsKpiWidget() {
  const {
    config,
    hydrated,
    setProjectKpisVisible,
    toggleProjectKpi,
    resetProjectKpisDefaults,
  } = useDashboardWidgets();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const query = usePortfolioSummaryQuery();
  const { data, isLoading, error } = query;
  const err = error instanceof Error ? error.message : null;

  if (!hydrated) {
    return (
      <section className="space-y-4" aria-hidden>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
      </section>
    );
  }

  if (!config.projectKpis.visible) {
    return (
      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Le widget <span className="font-medium text-foreground">Projets</span> est
            masqué.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setProjectKpisVisible(true)}
            >
              Afficher le widget
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="mr-1 size-4" />
              Personnaliser
            </Button>
          </div>
        </div>
        <ProjectWidgetSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
          setProjectKpisVisible={setProjectKpisVisible}
          toggleProjectKpi={toggleProjectKpi}
          resetProjectKpisDefaults={resetProjectKpisDefaults}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projets
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              Synthèse du portefeuille pour{' '}
              <span className="font-medium text-foreground">ce client</span>
              {data ? (
                <>
                  {' '}
                  ·{' '}
                  <Badge variant="secondary" className="font-normal">
                    {data.totalProjects} projet{data.totalProjects > 1 ? 's' : ''}
                  </Badge>
                </>
              ) : null}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setSettingsOpen(true)}
            aria-label="Personnaliser le widget projets"
          >
            <Settings2 className="size-4" />
            Personnaliser
          </Button>
          <Link
            href={projectsList()}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'whitespace-nowrap',
            )}
          >
            Portefeuille projets
          </Link>
        </div>
      </div>

      <ProjectWidgetSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        setProjectKpisVisible={setProjectKpisVisible}
        toggleProjectKpi={toggleProjectKpi}
        resetProjectKpisDefaults={resetProjectKpisDefaults}
      />

      {isLoading && !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: Math.max(1, config.projectKpis.kpis.length) }).map(
            (_, i) => (
              <KpiSkeleton key={i} />
            ),
          )}
        </div>
      ) : err ? (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{err}</p>
          <p className="mt-1">Impossible de charger la synthèse du portefeuille.</p>
          <Link
            href={projectsList()}
            className={cn(buttonVariants({ variant: 'link' }), 'mt-2 h-auto p-0')}
          >
            Ouvrir le portefeuille projets
          </Link>
        </div>
      ) : (
        <ProjectKpiCards
          summary={data}
          loading={isLoading}
          keys={config.projectKpis.kpis}
        />
      )}
    </section>
  );
}
