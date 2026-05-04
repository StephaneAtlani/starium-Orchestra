'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HealthBadge, ProjectPortfolioBadges } from '../../components/project-badges';
import {
  PROJECT_CRITICALITY_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
} from '../../constants/project-enum-labels';
import { projectDetail } from '../../constants/project-routes';
import type { ProjectListItem } from '../../types/project.types';
import { useProjectMilestonesQuery } from '../../hooks/use-project-milestones-query';
import { useProjectReviewDetailQuery } from '../../hooks/use-project-review-detail-query';
import { useProjectReviewsQuery } from '../../hooks/use-project-reviews-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Settings2, Shield, Thermometer } from 'lucide-react';
import { CommitteeWidgetConfigPanel } from '../widgets/committee-widget-config-panel';
import {
  COMMITTEE_WIDGETS_V1,
  WIDGET_BY_ID,
  type WidgetId,
  type WidgetRenderContext,
} from '../widgets/committee-widget-registry';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function ownerInitials(displayName: string | null | undefined): string {
  const n = displayName?.trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function ProjectCodirCharacteristicsSidebar({
  project,
  className,
}: {
  project: ProjectListItem;
  className?: string;
}) {
  const priorityLabel = PROJECT_PRIORITY_LABEL[project.priority] ?? project.priority;
  const criticalityLabel = PROJECT_CRITICALITY_LABEL[project.criticality] ?? project.criticality;
  const statusLabel = PROJECT_STATUS_LABEL[project.status] ?? project.status;
  const typeLabel = PROJECT_TYPE_LABEL[project.type] ?? project.type;
  const progressPct =
    project.progressPercent ?? project.derivedProgressPercent ?? null;
  const cat = project.portfolioCategory;

  return (
    <aside className={cn('lg:sticky lg:top-0 lg:self-start', className)}>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
          <h3 className="text-sm font-semibold tracking-tight">Caractéristiques</h3>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <div
              className="grid size-11 shrink-0 place-items-center rounded-full border border-border/70 bg-muted/40 text-sm font-semibold tabular-nums text-muted-foreground"
              aria-hidden
            >
              {ownerInitials(project.ownerDisplayName)}
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                Responsable
              </p>
              <p className="truncate text-sm font-medium leading-snug">
                {project.ownerDisplayName?.trim() || 'Non renseigné'}
              </p>
            </div>
          </div>

          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <dt className="text-xs text-muted-foreground">Code</dt>
              <dd className="font-mono text-xs font-medium">{project.code}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <dt className="text-xs text-muted-foreground">Fin cible</dt>
              <dd className="text-xs tabular-nums">{formatDate(project.targetEndDate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <dt className="text-xs text-muted-foreground">Avancement</dt>
              <dd className="text-xs font-medium tabular-nums">
                {progressPct != null ? `${progressPct} %` : '—'}
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
              <dt className="text-xs text-muted-foreground">Statut</dt>
              <dd className="text-right text-xs">{statusLabel}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="text-right text-xs">{typeLabel}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1 font-normal">
              <Thermometer className="size-3 opacity-70" aria-hidden />
              {priorityLabel}
            </Badge>
            <Badge variant="outline" className="gap-1 font-normal">
              <Shield className="size-3 opacity-70" aria-hidden />
              {criticalityLabel}
            </Badge>
          </div>

          {cat ? (
            <div>
              <p className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                Portefeuille
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cat.parentName ? (
                  <Badge variant="outline" className="max-w-full truncate font-normal">
                    {cat.parentName}
                  </Badge>
                ) : null}
                <Badge variant="secondary" className="max-w-full truncate font-normal">
                  {cat.name}
                </Badge>
              </div>
            </div>
          ) : null}

          {project.tags.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                Étiquettes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className="max-w-full truncate border-dashed font-normal"
                    style={
                      t.color
                        ? {
                            borderColor: t.color,
                            color: t.color,
                          }
                        : undefined
                    }
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t border-border/50 pt-3">
            <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              Santé (météo)
            </p>
            <HealthBadge health={project.computedHealth} />
          </div>

          <div className="border-t border-border/50 pt-3">
            <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              Signaux
            </p>
            <ProjectPortfolioBadges signals={project.signals} />
          </div>
        </div>
      </div>
    </aside>
  );
}

function progressCell(p: ProjectListItem) {
  const main = p.progressPercent;
  const derived = p.derivedProgressPercent;
  if (main != null) return `${main} %`;
  if (derived != null) return `${derived} % (dérivé)`;
  return '—';
}

type PortfolioSortKey =
  | 'name'
  | 'code'
  | 'status'
  | 'computedHealth'
  | 'criticality'
  | 'priority'
  | 'progressPercent'
  | 'targetEndDate'
  | 'openTasksCount'
  | 'openRisksCount'
  | 'delayedMilestonesCount';

type SortDir = 'asc' | 'desc';

const HEALTH_ORDER: Record<ProjectListItem['computedHealth'], number> = {
  RED: 0,
  ORANGE: 1,
  GREEN: 2,
};

const CRIT_ORDER: Record<string, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const PRIO_ORDER: Record<string, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function compareProjects(
  a: ProjectListItem,
  b: ProjectListItem,
  key: PortfolioSortKey,
  dir: SortDir,
): number {
  const mul = dir === 'asc' ? 1 : -1;
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name, 'fr') * mul;
    case 'code':
      return a.code.localeCompare(b.code, 'fr') * mul;
    case 'status':
      return a.status.localeCompare(b.status, 'fr') * mul;
    case 'computedHealth':
      return (HEALTH_ORDER[a.computedHealth] - HEALTH_ORDER[b.computedHealth]) * mul;
    case 'criticality':
      return ((CRIT_ORDER[a.criticality] ?? 9) - (CRIT_ORDER[b.criticality] ?? 9)) * mul;
    case 'priority':
      return ((PRIO_ORDER[a.priority] ?? 9) - (PRIO_ORDER[b.priority] ?? 9)) * mul;
    case 'progressPercent': {
      const pa = a.progressPercent ?? a.derivedProgressPercent ?? -1;
      const pb = b.progressPercent ?? b.derivedProgressPercent ?? -1;
      return (pa - pb) * mul;
    }
    case 'targetEndDate': {
      const ta = a.targetEndDate ? new Date(a.targetEndDate).getTime() : 0;
      const tb = b.targetEndDate ? new Date(b.targetEndDate).getTime() : 0;
      return (ta - tb) * mul;
    }
    case 'openTasksCount':
      return (a.openTasksCount - b.openTasksCount) * mul;
    case 'openRisksCount':
      return (a.openRisksCount - b.openRisksCount) * mul;
    case 'delayedMilestonesCount':
      return (a.delayedMilestonesCount - b.delayedMilestonesCount) * mul;
    default:
      return 0;
  }
}

type PortfolioDeckTableProps = {
  /** Ordre identique aux diapositives projet (slide 1 = index 0). */
  projectsInDeckOrder: ProjectListItem[];
  activeSlideIndex: number;
  onGoToSlide: (slideIndex: number) => void;
};

function SortButton({
  label,
  active,
  dir,
  onToggle,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="-mx-2 h-auto min-h-0 w-full justify-start gap-1 px-2 py-1.5 font-semibold hover:bg-transparent"
      onClick={onToggle}
    >
      <span className="truncate">{label}</span>
      {active ? (
        dir === 'asc' ? (
          <ArrowUp className="size-3.5 shrink-0 opacity-80" />
        ) : (
          <ArrowDown className="size-3.5 shrink-0 opacity-80" />
        )
      ) : (
        <ArrowUpDown className="size-3.5 shrink-0 opacity-40" />
      )}
    </Button>
  );
}

/** Tableau portefeuille : tri dynamique, ligne → diapositive projet. */
export function PortfolioDeckTable({
  projectsInDeckOrder,
  activeSlideIndex,
  onGoToSlide,
}: PortfolioDeckTableProps) {
  const [sortKey, setSortKey] = useState<PortfolioSortKey>('computedHealth');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    return [...projectsInDeckOrder].sort((a, b) =>
      compareProjects(a, b, sortKey, sortDir),
    );
  }, [projectsInDeckOrder, sortKey, sortDir]);

  const toggle = (key: PortfolioSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (projectsInDeckOrder.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        Aucun projet dans le périmètre.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight">Portefeuille — vue détaillée</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tri dynamique sur les en-têtes. Cliquez sur une ligne pour afficher la fiche en diapositive.
        </p>
      </div>
      <div className="max-h-[min(55vh,520px)] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 min-w-[2.5rem] text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                #
              </TableHead>
              <TableHead className="min-w-[4.5rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                <SortButton
                  label="Code"
                  active={sortKey === 'code'}
                  dir={sortDir}
                  onToggle={() => toggle('code')}
                />
              </TableHead>
              <TableHead className="min-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                <SortButton
                  label="Projet"
                  active={sortKey === 'name'}
                  dir={sortDir}
                  onToggle={() => toggle('name')}
                />
              </TableHead>
              <TableHead className="hidden min-w-[6rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground xl:table-cell">
                Type
              </TableHead>
              <TableHead className="hidden min-w-[5rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
                <SortButton
                  label="Statut"
                  active={sortKey === 'status'}
                  dir={sortDir}
                  onToggle={() => toggle('status')}
                />
              </TableHead>
              <TableHead className="min-w-[5rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                <SortButton
                  label="Priorité"
                  active={sortKey === 'priority'}
                  dir={sortDir}
                  onToggle={() => toggle('priority')}
                />
              </TableHead>
              <TableHead className="min-w-[5rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                <SortButton
                  label="Criticité"
                  active={sortKey === 'criticality'}
                  dir={sortDir}
                  onToggle={() => toggle('criticality')}
                />
              </TableHead>
              <TableHead className="min-w-[6rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                <SortButton
                  label="Santé"
                  active={sortKey === 'computedHealth'}
                  dir={sortDir}
                  onToggle={() => toggle('computedHealth')}
                />
              </TableHead>
              <TableHead className="min-w-[4.5rem] text-right text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                <SortButton
                  label="Av."
                  active={sortKey === 'progressPercent'}
                  dir={sortDir}
                  onToggle={() => toggle('progressPercent')}
                />
              </TableHead>
              <TableHead className="hidden min-w-[3rem] text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
                <SortButton
                  label="Tâches"
                  active={sortKey === 'openTasksCount'}
                  dir={sortDir}
                  onToggle={() => toggle('openTasksCount')}
                />
              </TableHead>
              <TableHead className="hidden min-w-[3rem] text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
                <SortButton
                  label="Risq."
                  active={sortKey === 'openRisksCount'}
                  dir={sortDir}
                  onToggle={() => toggle('openRisksCount')}
                />
              </TableHead>
              <TableHead className="hidden min-w-[3rem] text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
                <SortButton
                  label="J.ret."
                  active={sortKey === 'delayedMilestonesCount'}
                  dir={sortDir}
                  onToggle={() => toggle('delayedMilestonesCount')}
                />
              </TableHead>
              <TableHead className="hidden min-w-[6rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground xl:table-cell">
                <SortButton
                  label="Échéance"
                  active={sortKey === 'targetEndDate'}
                  dir={sortDir}
                  onToggle={() => toggle('targetEndDate')}
                />
              </TableHead>
              <TableHead className="hidden min-w-[7rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground 2xl:table-cell">
                Responsable
              </TableHead>
              <TableHead className="min-w-[8rem] text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Signaux
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p, idx) => {
              const deckIndex = projectsInDeckOrder.findIndex((x) => x.id === p.id);
              const slideForProject = deckIndex >= 0 ? deckIndex + 1 : idx + 1;
              const isRowActive = activeSlideIndex === slideForProject;

              return (
                <TableRow
                  key={p.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isRowActive && 'bg-primary/10 hover:bg-primary/15',
                    !isRowActive && 'hover:bg-muted/50',
                  )}
                  onClick={() => onGoToSlide(slideForProject)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onGoToSlide(slideForProject);
                    }
                  }}
                >
                  <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">{p.code}</TableCell>
                  <TableCell className="max-w-[14rem]">
                    <span className="line-clamp-2 font-medium leading-snug">{p.name}</span>
                  </TableCell>
                  <TableCell className="hidden text-xs xl:table-cell">
                    {PROJECT_TYPE_LABEL[p.type] ?? p.type}
                  </TableCell>
                  <TableCell className="hidden text-xs lg:table-cell">
                    {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                  </TableCell>
                  <TableCell className="text-xs">
                    {PROJECT_PRIORITY_LABEL[p.priority] ?? p.priority}
                  </TableCell>
                  <TableCell className="text-xs">
                    {PROJECT_CRITICALITY_LABEL[p.criticality] ?? p.criticality}
                  </TableCell>
                  <TableCell>
                    <HealthBadge health={p.computedHealth} compact />
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{progressCell(p)}</TableCell>
                  <TableCell className="hidden text-center text-xs tabular-nums md:table-cell">
                    {p.openTasksCount}
                  </TableCell>
                  <TableCell className="hidden text-center text-xs tabular-nums md:table-cell">
                    {p.openRisksCount}
                  </TableCell>
                  <TableCell className="hidden text-center text-xs tabular-nums lg:table-cell">
                    {p.delayedMilestonesCount}
                  </TableCell>
                  <TableCell className="hidden text-xs tabular-nums xl:table-cell">
                    {formatDate(p.targetEndDate)}
                  </TableCell>
                  <TableCell className="hidden max-w-[7rem] truncate text-xs 2xl:table-cell">
                    {p.ownerDisplayName?.trim() || '—'}
                  </TableCell>
                  <TableCell className="min-w-[7rem]">
                    <ProjectPortfolioBadges signals={p.signals} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Métriques + signaux structurés pour la diapositive projet. */
export function ProjectCommitteeDetailTables({ project }: { project: ProjectListItem }) {
  const reviewsQ = useProjectReviewsQuery(project.id, { enabled: true });
  const latestReview = (reviewsQ.data ?? [])[0] ?? null;
  const reviewDetailQ = useProjectReviewDetailQuery(project.id, latestReview?.id ?? null);
  const milestonesQ = useProjectMilestonesQuery(project.id, { enabled: true });

  const widgets = COMMITTEE_WIDGETS_V1;
  const defaultCenterOrder = useMemo(
    () => widgets.filter((w) => (w.presentationColumn ?? 'center') === 'center').map((w) => w.id),
    [widgets],
  );
  const defaultPilotageOrder = useMemo(
    () => widgets.filter((w) => w.presentationColumn === 'pilotage').map((w) => w.id),
    [widgets],
  );
  const allWidgetIds = useMemo(
    () => [...defaultCenterOrder, ...defaultPilotageOrder],
    [defaultCenterOrder, defaultPilotageOrder],
  );
  const defaultHidden = useMemo(
    () => widgets.filter((w) => !w.enabledByDefault).map((w) => w.id),
    [widgets],
  );

  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>(defaultHidden);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const storageKey = `committee-codir-widgets:${project.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setHiddenWidgets(defaultHidden);
        return;
      }
      const parsed = JSON.parse(raw) as {
        hidden?: WidgetId[];
        order?: WidgetId[];
        centerOrder?: WidgetId[];
        pilotageOrder?: WidgetId[];
      };
      const parsedHidden = (parsed.hidden ?? []).filter((id) => allWidgetIds.includes(id));
      const known = new Set<WidgetId>([
        ...(parsed.hidden ?? []),
        ...(parsed.order ?? []),
        ...(parsed.centerOrder ?? []),
        ...(parsed.pilotageOrder ?? []),
      ]);
      const hidden = new Set<WidgetId>(parsedHidden);
      defaultHidden.forEach((id) => {
        if (!known.has(id)) hidden.add(id);
      });
      setHiddenWidgets([...hidden]);
    } catch {
      setHiddenWidgets(defaultHidden);
    }
  }, [allWidgetIds, defaultHidden, storageKey]);

  const saveLayout = () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        hidden: hiddenWidgets,
        version: 3,
      }),
    );
    setSettingsOpen(false);
  };

  const toggleWidget = (id: WidgetId) => {
    setHiddenWidgets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const ctx: WidgetRenderContext = {
    project,
    reviews: reviewsQ.data ?? [],
    reviewDetail: reviewDetailQ.data ?? null,
    milestones: milestonesQ.data?.items ?? [],
    isLoading: {
      reviews: reviewsQ.isLoading,
      reviewDetail: reviewDetailQ.isLoading,
      milestones: milestonesQ.isLoading,
    },
  };

  const renderWidget = (id: WidgetId) => {
    const widget = WIDGET_BY_ID[id];
    if (!widget) return null;
    return (
      <div key={id} className="min-w-0">
        {widget.render(ctx)}
      </div>
    );
  };

  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
        <p className="max-w-xl text-xs text-muted-foreground">
          Colonnes gauche / centre / pilotage : masquez les blocs non utiles via Configurer, puis
          Enregistrer (ordre fixe).
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen((v) => !v)}>
            <Settings2 className="mr-1 size-4" />
            Configurer
          </Button>
          <Button type="button" size="sm" onClick={saveLayout}>
            Enregistrer
          </Button>
        </div>
      </div>

      {settingsOpen ? (
        <CommitteeWidgetConfigPanel
          widgets={widgets}
          hiddenWidgets={hiddenWidgets}
          onToggle={toggleWidget}
        />
      ) : null}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(280px,320px)] lg:items-start lg:gap-6">
        <ProjectCodirCharacteristicsSidebar project={project} className="order-1 lg:order-none" />

        <section className="order-3 flex min-w-0 flex-col gap-4 lg:order-none">
          <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
            <p className="text-xs font-semibold tracking-tight">Suivi & gouvernance</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Indicateurs, planning jalons, décisions, actions…
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            {defaultCenterOrder
              .filter((id) => !hiddenWidgets.includes(id))
              .map((id) => renderWidget(id))}
          </div>
        </section>

        <section className="order-2 flex min-w-0 flex-col gap-4 lg:order-none">
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 dark:bg-primary/10">
            <p className="text-xs font-semibold tracking-tight text-primary">Pilotage</p>
            <p className="text-[0.65rem] text-muted-foreground">
              Signaux, points projet et jalons — indicateurs et planning sont au centre.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            {defaultPilotageOrder
              .filter((id) => !hiddenWidgets.includes(id))
              .map((id) => renderWidget(id))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={projectDetail(project.id)}>Ouvrir la fiche projet</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`${projectDetail(project.id)}?tab=points`}>Points projet</Link>
        </Button>
      </div>
    </div>
  );
}
