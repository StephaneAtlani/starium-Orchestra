'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HealthBadge } from '../../components/project-badges';
import { MILESTONE_STATUS_LABEL, PROJECT_KIND_LABEL, PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from '../../constants/project-enum-labels';
import type {
  ProjectListItem,
  ProjectMilestoneApi,
  ProjectReviewDetail,
  ProjectReviewListItem,
} from '../../types/project.types';
import { clampPercent, countByKey, daysUntil, formatDateFr, normalizePercentFromCount } from './committee-widget-helpers';
import type { WidgetTheme } from './committee-widget-themes';

export type WidgetSize = 'single' | 'full';

export type WidgetId =
  | 'metrics'
  | 'planningTimeline'
  | 'signals'
  | 'nextPoints'
  | 'decisionsTaken'
  | 'decisionsPending'
  | 'actionItems'
  | 'warnings'
  | 'tags'
  | 'milestoneStatusSplit'
  | 'milestonesDueSoon'
  | 'reviewsStatusSplit'
  | 'reviewsCadence30d'
  | 'actionItemsAging'
  | 'ownershipCoverage';

export type WidgetRenderContext = {
  project: ProjectListItem;
  reviews: ProjectReviewListItem[];
  reviewDetail: ProjectReviewDetail | null;
  milestones: ProjectMilestoneApi[];
  isLoading: {
    reviews: boolean;
    reviewDetail: boolean;
    milestones: boolean;
  };
};

export type CommitteeWidgetPresentationColumn = 'center' | 'pilotage';

export type CommitteeWidgetDefinition = {
  id: WidgetId;
  title: string;
  theme: WidgetTheme;
  enabledByDefault: boolean;
  size: WidgetSize;
  /** Colonne en mode présentation fiche projet (gouvernance au centre, pilotage à droite). */
  presentationColumn?: CommitteeWidgetPresentationColumn;
  description?: string;
  render: (ctx: WidgetRenderContext) => React.ReactNode;
};

const SIGNAL_ROWS: {
  key: keyof ProjectListItem['signals'];
  label: string;
  activeWhen: (s: ProjectListItem['signals']) => boolean;
}[] = [
  { key: 'isLate', label: 'En retard (planning)', activeWhen: (s) => s.isLate },
  { key: 'isBlocked', label: 'Bloqué', activeWhen: (s) => s.isBlocked },
  { key: 'isCritical', label: 'Criticité pilotage', activeWhen: (s) => s.isCritical },
  { key: 'hasPlanningDrift', label: 'Dérive de planning', activeWhen: (s) => s.hasPlanningDrift },
  { key: 'hasNoOwner', label: 'Sans responsable identifié', activeWhen: (s) => s.hasNoOwner },
  { key: 'hasNoTasks', label: 'Sans tâche', activeWhen: (s) => s.hasNoTasks },
  { key: 'hasNoRisks', label: 'Sans risque enregistré', activeWhen: (s) => s.hasNoRisks },
  { key: 'hasNoMilestones', label: 'Sans jalon', activeWhen: (s) => s.hasNoMilestones },
];

function milestoneDotClass(status: string) {
  switch (status) {
    case 'ACHIEVED':
      return 'bg-emerald-500 ring-emerald-500/35';
    case 'DELAYED':
      return 'bg-red-500 ring-red-500/35';
    case 'CANCELLED':
      return 'bg-muted-foreground/45 ring-muted-foreground/25';
    default:
      return 'bg-primary ring-primary/35';
  }
}

export const COMMITTEE_WIDGETS_V1: CommitteeWidgetDefinition[] = [
  {
    id: 'metrics',
    title: 'Indicateurs',
    description: 'Vue synthétique avancement, santé et pression opérationnelle.',
    theme: 'execution',
    enabledByDefault: true,
    size: 'single',
    render: ({ project }) => {
      const progressPct = clampPercent(project.progressPercent ?? project.derivedProgressPercent ?? 0);
      const healthPct = project.computedHealth === 'GREEN' ? 100 : project.computedHealth === 'ORANGE' ? 60 : 25;
      const progressRing = `conic-gradient(hsl(var(--primary)) ${progressPct}%, hsl(var(--muted)) 0)`;
      const statusLabel = PROJECT_STATUS_LABEL[project.status] ?? project.status;
      const typeLabel = PROJECT_TYPE_LABEL[project.type] ?? project.type;
      const kindLabel = PROJECT_KIND_LABEL[project.kind] ?? project.kind;
      return (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
            <h3 className="text-sm font-semibold">Indicateurs — vue graphique</h3>
          </div>
          <div className="space-y-4 p-4">
            <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/15">
              <div className="grid grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-4 sm:divide-y-0">
                <KpiCell label="Avancement" value={`${progressPct} %`} />
                <KpiCell label="Tâches ouvertes" value={String(project.openTasksCount)} />
                <KpiCell label="Risques ouverts" value={String(project.openRisksCount)} />
                <KpiCell label="Jalons en retard" value={String(project.delayedMilestonesCount)} />
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
              <div className="flex shrink-0 justify-center lg:w-[200px] lg:justify-start">
                <div className="relative grid size-28 place-items-center rounded-full" style={{ background: progressRing }}>
                  <div className="grid size-[92px] place-items-center rounded-full bg-card text-center">
                    <div className="text-xs text-muted-foreground">Progression</div>
                    <div className="text-xl font-semibold tabular-nums">{progressPct}%</div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <BarRow label="Santé projet" value={healthPct} hint={project.computedHealth} />
                <BarRow label="Charge action ouverte" value={Math.min(100, project.openTasksCount * 8)} hint={`${project.openTasksCount} tâches`} />
                <BarRow label="Pression risque" value={Math.min(100, project.openRisksCount * 12)} hint={`${project.openRisksCount} risques`} />
                <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                  <HealthBadge health={project.computedHealth} />
                  <span className="text-xs text-muted-foreground">
                    {kindLabel} • {typeLabel} • {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: 'planningTimeline',
    title: 'Planning — jalons',
    description: 'Frise des jalons et de la date cible projet.',
    theme: 'execution',
    enabledByDefault: true,
    size: 'full',
    render: ({ project, milestones, isLoading }) => {
      const sorted = [...milestones]
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
        .slice(0, 48);
      const markers = sorted.map((m) => ({
        id: m.id,
        label: m.name,
        ts: new Date(m.targetDate).getTime(),
        status: m.status,
        iso: m.targetDate,
      }));
      if (project.targetEndDate) {
        const te = new Date(project.targetEndDate).getTime();
        if (!markers.some((p) => Math.abs(p.ts - te) < 43_200_000)) {
          markers.push({
            id: 'synthetic-target-end',
            label: 'Fin cible (projet)',
            ts: te,
            status: 'PLANNED',
            iso: project.targetEndDate,
          });
        }
      }
      markers.sort((a, b) => a.ts - b.ts);
      const now = Date.now();
      const min = markers.length ? Math.min(markers[0].ts, now) : now - 86_400_000;
      const max = markers.length ? Math.max(markers[markers.length - 1].ts, now) : now + 86_400_000;
      const span = max - min || 1;
      const pct = (ts: number) => Math.max(1.5, Math.min(98.5, ((ts - min) / span) * 100));
      const nowPct = pct(now);
      return (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
            <h3 className="text-sm font-semibold">Planning — jalons</h3>
          </div>
          <div className="p-4">
            {isLoading.milestones ? (
              <p className="text-sm text-muted-foreground">Chargement des jalons…</p>
            ) : markers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun jalon ni date de fin cible.</p>
            ) : (
              <div className="relative min-h-[6.5rem] w-full overflow-x-auto pb-1">
                <div className="relative mx-auto min-h-[6.5rem] min-w-[min(100%,480px)] md:min-w-[600px]">
                  <div className="pointer-events-none absolute bottom-3 top-1 w-px bg-amber-500/55" style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }} aria-hidden />
                  <div className="pointer-events-none absolute top-0 whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-400/95" style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }}>
                    <span className="rounded bg-amber-500/15 px-1 py-px">Aujourd&apos;hui</span>
                  </div>
                  <div className="absolute bottom-3 left-0 right-0 h-px bg-border" />
                  {markers.map((m) => (
                    <div key={m.id} className="absolute bottom-3 w-0" style={{ left: `${pct(m.ts)}%` }}>
                      <div className="flex -translate-x-1/2 flex-col-reverse items-center gap-1.5 pb-0">
                        <div className={cn('size-3 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background', milestoneDotClass(m.status))} title={MILESTONE_STATUS_LABEL[m.status] ?? m.status} />
                        <div className="mb-0.5 max-w-[6.5rem] text-center">
                          <p className="line-clamp-2 text-[10px] font-medium leading-tight">{m.label}</p>
                          <p className="text-[9px] tabular-nums text-muted-foreground">{formatDateFr(m.iso)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: 'signals',
    title: 'Signaux portefeuille',
    description: 'Signaux automatiques de qualité de pilotage.',
    theme: 'execution',
    presentationColumn: 'pilotage',
    enabledByDefault: true,
    size: 'single',
    render: ({ project }) => (
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
          <h3 className="text-sm font-semibold">Signaux portefeuille (automatisés)</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Signal</TableHead>
              <TableHead className="w-24 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Actif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SIGNAL_ROWS.map((row) => {
              const active = row.activeWhen(project.signals);
              return (
                <TableRow key={row.key} className={cn('even:bg-muted/20', active && 'bg-amber-500/5 dark:bg-amber-500/10')}>
                  <TableCell className="text-sm">{row.label}</TableCell>
                  <BoolCell ok={active} />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    ),
  },
  {
    id: 'nextPoints',
    title: 'Prochains points projet',
    description: 'Revues planifiées ou brouillons à venir.',
    theme: 'governance',
    presentationColumn: 'pilotage',
    enabledByDefault: true,
    size: 'single',
    render: ({ reviews, isLoading }) => (
      <WidgetTimeline
        title="Prochains points projet"
        items={reviews
          .filter((r) => r.nextReviewDate != null || r.status === 'DRAFT')
          .slice(0, 5)
          .map((r) => ({
            title: `${r.reviewType} (${r.status})`,
            subtitle: r.title ?? 'Point projet',
            date: formatDateFr(r.nextReviewDate ?? r.reviewDate),
          }))}
        emptyLabel={isLoading.reviews ? 'Chargement des points projet…' : 'Aucun prochain point planifié.'}
      />
    ),
  },
  {
    id: 'decisionsTaken',
    title: 'Décisions prises',
    description: 'Décisions de la dernière revue disponible, si finalisée.',
    theme: 'governance',
    enabledByDefault: true,
    size: 'single',
    render: ({ reviewDetail, isLoading }) => (
      <WidgetBarList
        title="Décisions prises"
        items={(reviewDetail?.status === 'FINALIZED' ? reviewDetail.decisions : []).map((d) => ({ label: d.title, value: 100 }))}
        emptyLabel={isLoading.reviewDetail ? 'Chargement des décisions…' : 'Aucune décision finalisée sur le dernier point.'}
      />
    ),
  },
  {
    id: 'decisionsPending',
    title: 'Décisions à prendre',
    description: 'Décisions ouvertes sur la dernière revue disponible.',
    theme: 'governance',
    enabledByDefault: true,
    size: 'single',
    render: ({ reviewDetail, isLoading }) => (
      <WidgetBarList
        title="Décisions à prendre"
        items={(reviewDetail?.status === 'FINALIZED' ? [] : reviewDetail?.decisions ?? []).slice(0, 6).map((d, idx) => ({
          label: d.title,
          value: Math.max(25, 100 - idx * 12),
        }))}
        emptyLabel={isLoading.reviewDetail ? 'Chargement des décisions…' : 'Aucune décision en attente sur le brouillon courant.'}
      />
    ),
  },
  {
    id: 'actionItems',
    title: 'Actions ouvertes',
    description: 'Répartition des actions ouvertes par statut.',
    theme: 'governance',
    enabledByDefault: true,
    size: 'single',
    render: ({ reviewDetail, isLoading }) => {
      const open = (reviewDetail?.actionItems ?? []).filter((a) => a.status !== 'DONE' && a.status !== 'CANCELLED');
      const byStatus = countByKey(open.map((a) => a.status || 'UNKNOWN'));
      const max = Math.max(1, ...Object.values(byStatus));
      return (
        <WidgetBarList
          title="Actions ouvertes"
          items={Object.entries(byStatus).map(([status, count]) => ({
            label: `${status} (${count})`,
            value: normalizePercentFromCount(count, max),
          }))}
          emptyLabel={isLoading.reviewDetail ? 'Chargement des actions…' : 'Aucune action ouverte.'}
        />
      );
    },
  },
  {
    id: 'warnings',
    title: 'Alertes',
    description: 'Points d’attention projet.',
    theme: 'ownership',
    enabledByDefault: true,
    size: 'single',
    render: ({ project }) => <WidgetList title="Alertes & points d'attention" items={project.warnings} emptyLabel="Aucun point d'attention." />,
  },
  {
    id: 'tags',
    title: 'Étiquettes',
    description: 'Classification libre du projet.',
    theme: 'ownership',
    enabledByDefault: true,
    size: 'single',
    render: ({ project }) => <WidgetList title="Étiquettes" items={project.tags.map((t) => t.name)} emptyLabel="Aucune étiquette." />,
  },
  {
    id: 'milestoneStatusSplit',
    title: 'Répartition statuts jalons',
    description: 'Comptage jalons par statut.',
    theme: 'execution',
    presentationColumn: 'pilotage',
    enabledByDefault: false,
    size: 'single',
    render: ({ milestones, isLoading }) => {
      const byStatus = countByKey(milestones.map((m) => m.status || 'UNKNOWN'));
      const max = Math.max(1, ...Object.values(byStatus));
      return (
        <WidgetBarList
          title="Répartition statuts jalons"
          items={Object.entries(byStatus).map(([status, count]) => ({
            label: `${MILESTONE_STATUS_LABEL[status] ?? status} (${count})`,
            value: normalizePercentFromCount(count, max),
          }))}
          emptyLabel={isLoading.milestones ? 'Chargement des jalons…' : 'Aucun jalon.'}
        />
      );
    },
  },
  {
    id: 'milestonesDueSoon',
    title: 'Jalons à échéance proche',
    description: 'Jalons avec échéance <= 30 jours.',
    theme: 'execution',
    presentationColumn: 'pilotage',
    enabledByDefault: false,
    size: 'single',
    render: ({ milestones, isLoading }) => {
      const soon = milestones
        .map((m) => ({ ...m, dueIn: daysUntil(m.targetDate) }))
        .filter((m) => m.dueIn >= 0 && m.dueIn <= 30)
        .sort((a, b) => a.dueIn - b.dueIn)
        .slice(0, 8);
      return (
        <WidgetTimeline
          title="Jalons à échéance proche"
          items={soon.map((m) => ({
            title: m.name,
            subtitle: `${MILESTONE_STATUS_LABEL[m.status] ?? m.status} • J-${m.dueIn}`,
            date: formatDateFr(m.targetDate),
          }))}
          emptyLabel={isLoading.milestones ? 'Chargement des jalons…' : 'Aucun jalon à échéance proche.'}
        />
      );
    },
  },
  {
    id: 'reviewsStatusSplit',
    title: 'Répartition statuts revues',
    description: 'Comptage revues par statut.',
    theme: 'governance',
    enabledByDefault: false,
    size: 'single',
    render: ({ reviews, isLoading }) => {
      const byStatus = countByKey(reviews.map((r) => r.status || 'UNKNOWN'));
      const max = Math.max(1, ...Object.values(byStatus));
      return (
        <WidgetBarList
          title="Répartition statuts revues"
          items={Object.entries(byStatus).map(([status, count]) => ({
            label: `${status} (${count})`,
            value: normalizePercentFromCount(count, max),
          }))}
          emptyLabel={isLoading.reviews ? 'Chargement des revues…' : 'Aucune revue.'}
        />
      );
    },
  },
  {
    id: 'reviewsCadence30d',
    title: 'Cadence revues (30 jours)',
    description: 'Volume de revues tenues sur les 30 derniers jours.',
    theme: 'governance',
    enabledByDefault: false,
    size: 'single',
    render: ({ reviews, isLoading }) => {
      const in30 = reviews.filter((r) => daysUntil(r.reviewDate) <= 0 && daysUntil(r.reviewDate) >= -30).length;
      return (
        <WidgetBarList
          title="Cadence revues (30 jours)"
          items={[{ label: 'Revues sur 30 jours', value: Math.min(100, in30 * 20) }]}
          emptyLabel={isLoading.reviews ? 'Chargement des revues…' : 'Aucune revue sur 30 jours.'}
        />
      );
    },
  },
  {
    id: 'actionItemsAging',
    title: 'Vieillissement actions',
    description: 'Actions ouvertes en retard / à temps.',
    theme: 'governance',
    enabledByDefault: false,
    size: 'single',
    render: ({ reviewDetail, isLoading }) => {
      const open = (reviewDetail?.actionItems ?? []).filter((a) => a.status !== 'DONE' && a.status !== 'CANCELLED');
      const overdue = open.filter((a) => a.dueDate && daysUntil(a.dueDate) < 0).length;
      const onTime = open.length - overdue;
      const max = Math.max(1, open.length);
      return (
        <WidgetBarList
          title="Vieillissement actions"
          items={[
            { label: `En retard (${overdue})`, value: normalizePercentFromCount(overdue, max) },
            { label: `A temps (${onTime})`, value: normalizePercentFromCount(onTime, max) },
          ]}
          emptyLabel={isLoading.reviewDetail ? 'Chargement des actions…' : 'Aucune action ouverte.'}
        />
      );
    },
  },
  {
    id: 'ownershipCoverage',
    title: 'Couverture ownership',
    description: 'Présence du responsable projet et signal associé.',
    theme: 'ownership',
    enabledByDefault: false,
    size: 'single',
    render: ({ project }) => (
      <WidgetList
        title="Couverture ownership"
        items={[
          `Responsable: ${project.ownerDisplayName?.trim() || 'Non renseigné'}`,
          `Signal hasNoOwner: ${project.signals.hasNoOwner ? 'Oui' : 'Non'}`,
        ]}
        emptyLabel="Responsable non renseigné."
      />
    ),
  },
];

export const WIDGET_BY_ID = COMMITTEE_WIDGETS_V1.reduce<Record<WidgetId, CommitteeWidgetDefinition>>(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {} as Record<WidgetId, CommitteeWidgetDefinition>,
);

function BoolCell({ ok }: { ok: boolean }) {
  return (
    <TableCell className="text-center">
      {ok ? (
        <Check className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" aria-label="Oui" />
      ) : (
        <X className="mx-auto size-4 text-muted-foreground/50" aria-label="Non" />
      )}
    </TableCell>
  );
}

function WidgetList({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <Table>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell className="py-4 text-sm text-muted-foreground">{emptyLabel}</TableCell>
            </TableRow>
          ) : (
            items.map((item, i) => (
              <TableRow key={`${title}-${i}-${item.slice(0, 12)}`} className="even:bg-muted/20">
                <TableCell className="text-sm">{item}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function WidgetBarList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  emptyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3 p-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item, i) => <BarRow key={`${title}-${i}-${item.label.slice(0, 10)}`} label={item.label} value={item.value} />)
        )}
      </div>
    </div>
  );
}

function WidgetTimeline({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: Array<{ title: string; subtitle: string; date: string }>;
  emptyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3 p-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item, i) => (
            <div key={`${item.title}-${i}`} className="flex gap-3">
              <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.date}</p>
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BarRow({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{hint ?? `${pct}%`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3 text-center sm:px-3 sm:py-3.5">
      <div className="text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold tabular-nums sm:text-lg">{value}</div>
    </div>
  );
}
