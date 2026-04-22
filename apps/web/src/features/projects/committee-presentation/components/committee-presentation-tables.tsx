'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HealthBadge, ProjectPortfolioBadges } from '../../components/project-badges';
import {
  MILESTONE_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
} from '../../constants/project-enum-labels';
import { projectDetail } from '../../constants/project-routes';
import type { ProjectListItem, ProjectSignals } from '../../types/project.types';
import { useProjectMilestonesQuery } from '../../hooks/use-project-milestones-query';
import { useProjectReviewDetailQuery } from '../../hooks/use-project-review-detail-query';
import { useProjectReviewsQuery } from '../../hooks/use-project-reviews-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  GripVertical,
  Settings2,
  X,
} from 'lucide-react';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function progressCell(p: ProjectListItem) {
  const main = p.progressPercent;
  const derived = p.derivedProgressPercent;
  if (main != null) return `${main} %`;
  if (derived != null) return `${derived} % (dérivé)`;
  return '—';
}

function clampPercent(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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

const SIGNAL_ROWS: {
  key: keyof ProjectSignals;
  label: string;
  activeWhen: (s: ProjectSignals) => boolean;
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

/** Frise horizontale jalons + fin cible ; consommé dans la slide comité (pleine largeur multicol). */
function PlanningTimelineWidget({ project }: { project: ProjectListItem }) {
  const mq = useProjectMilestonesQuery(project.id);
  const items = useMemo(
    () =>
      [...(mq.data?.items ?? [])]
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
        .slice(0, 48),
    [mq.data],
  );

  type Marker = {
    id: string;
    label: string;
    ts: number;
    status: string;
    iso: string;
    synthetic?: boolean;
  };

  const markers = useMemo(() => {
    const pts: Marker[] = items.map((m) => ({
      id: m.id,
      label: m.name,
      ts: new Date(m.targetDate).getTime(),
      status: m.status,
      iso: m.targetDate,
    }));
    if (project.targetEndDate) {
      const te = new Date(project.targetEndDate).getTime();
      if (!pts.some((p) => Math.abs(p.ts - te) < 43_200_000)) {
        pts.push({
          id: 'synthetic-target-end',
          label: 'Fin cible (projet)',
          ts: te,
          status: 'PLANNED',
          iso: project.targetEndDate,
          synthetic: true,
        });
      }
    }
    return pts.sort((a, b) => a.ts - b.ts);
  }, [items, project.targetEndDate]);

  const range = useMemo(() => {
    if (markers.length === 0) {
      const now = Date.now();
      const end = project.targetEndDate
        ? new Date(project.targetEndDate).getTime()
        : now + 14 * 86_400_000;
      const min = Math.min(now, end) - 86_400_000;
      const max = Math.max(now, end) + 86_400_000;
      return { min, max };
    }
    let min = markers[0].ts;
    let max = markers[markers.length - 1].ts;
    const now = Date.now();
    min = Math.min(min, now);
    max = Math.max(max, now);
    if (project.targetEndDate) {
      const te = new Date(project.targetEndDate).getTime();
      max = Math.max(max, te);
      min = Math.min(min, te);
    }
    if (max - min < 7 * 86_400_000) {
      const mid = (min + max) / 2;
      min = mid - 3.5 * 86_400_000;
      max = mid + 3.5 * 86_400_000;
    }
    return { min, max };
  }, [markers, project.targetEndDate]);

  const positionPct = (ts: number) => {
    const span = range.max - range.min || 1;
    const p = ((ts - range.min) / span) * 100;
    return Math.max(1.5, Math.min(98.5, p));
  };
  const nowPct = positionPct(Date.now());

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <h3 className="text-sm font-semibold">Planning — jalons</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Frise des dates cibles (jalons API) et fin cible projet si distincte.
        </p>
      </div>
      <div className="p-4">
        {mq.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des jalons…</p>
        ) : markers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun jalon ni date de fin cible.</p>
        ) : (
          <>
            <div className="relative min-h-[6.5rem] w-full overflow-x-auto pb-1">
              <div className="relative mx-auto min-h-[6.5rem] min-w-[min(100%,480px)] md:min-w-[600px]">
                <div
                  className="pointer-events-none absolute bottom-3 top-1 w-px bg-amber-500/55"
                  style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute top-0 whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-400/95"
                  style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="rounded bg-amber-500/15 px-1 py-px">Aujourd&apos;hui</span>
                </div>
                <div className="absolute bottom-3 left-0 right-0 h-px bg-border" />
                {markers.map((m) => (
                  <div
                    key={m.id}
                    className="absolute bottom-3 w-0"
                    style={{ left: `${positionPct(m.ts)}%` }}
                  >
                    <div className="flex -translate-x-1/2 flex-col-reverse items-center gap-1.5 pb-0">
                      <div
                        className={cn(
                          'size-3 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background',
                          milestoneDotClass(m.status),
                        )}
                        title={`${MILESTONE_STATUS_LABEL[m.status] ?? m.status}${m.synthetic ? ' (référence projet)' : ''}`}
                      />
                      <div className="mb-0.5 max-w-[6.5rem] text-center">
                        <p className="line-clamp-2 text-[10px] font-medium leading-tight">{m.label}</p>
                        <p className="text-[9px] tabular-nums text-muted-foreground">
                          {new Date(m.iso).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" /> Planifié
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Atteint
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" /> En retard
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground/45" /> Annulé
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Métriques + signaux structurés pour la diapositive projet. */
export function ProjectCommitteeDetailTables({ project }: { project: ProjectListItem }) {
  const statusLabel = PROJECT_STATUS_LABEL[project.status] ?? project.status;
  const typeLabel = PROJECT_TYPE_LABEL[project.type] ?? project.type;
  const kindLabel = PROJECT_KIND_LABEL[project.kind] ?? project.kind;

  const reviewsQ = useProjectReviewsQuery(project.id, { enabled: true });
  const latestReview = (reviewsQ.data ?? [])[0] ?? null;
  const latestFinalizedReview =
    (reviewsQ.data ?? []).find((r) => r.status === 'FINALIZED') ?? null;
  const reviewDetailQ = useProjectReviewDetailQuery(project.id, latestReview?.id ?? null);

  const nextPoints = useMemo(() => {
    return (reviewsQ.data ?? [])
      .filter((r) => r.nextReviewDate != null || r.status === 'DRAFT')
      .slice(0, 5);
  }, [reviewsQ.data]);

  const decisionsTaken = useMemo(() => {
    if (!reviewDetailQ.data?.decisions) return [];
    if (reviewDetailQ.data.status !== 'FINALIZED') return [];
    return reviewDetailQ.data.decisions.slice(0, 6);
  }, [reviewDetailQ.data]);

  const decisionsPending = useMemo(() => {
    if (!reviewDetailQ.data?.decisions) return [];
    if (reviewDetailQ.data.status === 'FINALIZED') return [];
    return reviewDetailQ.data.decisions.slice(0, 6);
  }, [reviewDetailQ.data]);

  const openActionItems = useMemo(() => {
    if (!reviewDetailQ.data?.actionItems) return [];
    return reviewDetailQ.data.actionItems
      .filter((a) => a.status !== 'DONE' && a.status !== 'CANCELLED')
      .slice(0, 8);
  }, [reviewDetailQ.data]);

  const progressPct = clampPercent(
    project.progressPercent ?? project.derivedProgressPercent ?? 0,
  );
  const healthPct =
    project.computedHealth === 'GREEN'
      ? 100
      : project.computedHealth === 'ORANGE'
        ? 60
        : 25;
  const progressRing = `conic-gradient(hsl(var(--primary)) ${progressPct}%, hsl(var(--muted)) 0)`;

  type WidgetId =
    | 'metrics'
    | 'planningTimeline'
    | 'signals'
    | 'nextPoints'
    | 'decisionsTaken'
    | 'decisionsPending'
    | 'actionItems'
    | 'warnings'
    | 'tags';
  const defaultOrder: WidgetId[] = [
    'metrics',
    'planningTimeline',
    'signals',
    'nextPoints',
    'decisionsTaken',
    'decisionsPending',
    'actionItems',
    'warnings',
    'tags',
  ];
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(defaultOrder);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<WidgetId | null>(null);

  const storageKey = `committee-codir-widgets:${project.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setWidgetOrder(defaultOrder);
        setHiddenWidgets([]);
        return;
      }
      const parsed = JSON.parse(raw) as {
        order?: WidgetId[];
        hidden?: WidgetId[];
      };
      const base = defaultOrder.filter((id) => parsed.order?.includes(id));
      const extra = defaultOrder.filter((id) => !base.includes(id));
      setWidgetOrder([...base, ...extra]);
      setHiddenWidgets((parsed.hidden ?? []).filter((id) => defaultOrder.includes(id)));
    } catch {
      setWidgetOrder(defaultOrder);
      setHiddenWidgets([]);
    }
  }, [storageKey]);

  const saveLayout = () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ order: widgetOrder, hidden: hiddenWidgets }),
    );
    setSettingsOpen(false);
  };

  const onDropWidget = (target: WidgetId) => {
    if (!draggedWidget || draggedWidget === target) return;
    setWidgetOrder((prev) => {
      const without = prev.filter((id) => id !== draggedWidget);
      const index = without.indexOf(target);
      if (index < 0) return prev;
      without.splice(index, 0, draggedWidget);
      return without;
    });
    setDraggedWidget(null);
  };

  const toggleWidget = (id: WidgetId) => {
    setHiddenWidgets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const widgetTitle: Record<WidgetId, string> = {
    metrics: 'Indicateurs',
    planningTimeline: 'Planning — jalons',
    signals: 'Signaux portefeuille',
    nextPoints: 'Prochains points projet',
    decisionsTaken: 'Décisions prises',
    decisionsPending: 'Décisions à prendre',
    actionItems: 'Actions ouvertes',
    warnings: 'Alertes',
    tags: 'Etiquettes',
  };

  const renderWidget = (id: WidgetId) => {
    if (id === 'metrics') {
      return (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
            <h3 className="text-sm font-semibold">Indicateurs — vue graphique</h3>
          </div>
          <div className="space-y-4 p-4">
            {/* Bandeau KPI dense : pas de grille « 4 cartes » avec trous entre colonnes */}
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
                <div
                  className="relative grid size-28 place-items-center rounded-full"
                  style={{ background: progressRing }}
                >
                  <div className="grid size-[92px] place-items-center rounded-full bg-card text-center">
                    <div className="text-xs text-muted-foreground">Progression</div>
                    <div className="text-xl font-semibold tabular-nums">{progressPct}%</div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <BarRow label="Santé projet" value={healthPct} hint={project.computedHealth} />
                <BarRow
                  label="Charge action ouverte"
                  value={Math.min(100, project.openTasksCount * 8)}
                  hint={`${project.openTasksCount} tâches`}
                />
                <BarRow
                  label="Pression risque"
                  value={Math.min(100, project.openRisksCount * 12)}
                  hint={`${project.openRisksCount} risques`}
                />
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
    }
    if (id === 'planningTimeline') {
      return <PlanningTimelineWidget project={project} />;
    }
    if (id === 'signals') {
      return (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
            <h3 className="text-sm font-semibold">Signaux portefeuille (automatisés)</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Signal
                </TableHead>
                <TableHead className="w-24 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Actif
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SIGNAL_ROWS.map((row) => {
                const active = row.activeWhen(project.signals);
                return (
                  <TableRow
                    key={row.key}
                    className={cn('even:bg-muted/20', active && 'bg-amber-500/5 dark:bg-amber-500/10')}
                  >
                    <TableCell className="text-sm">{row.label}</TableCell>
                    <BoolCell ok={active} />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      );
    }
    if (id === 'nextPoints') {
      return (
        <WidgetTimeline
          title="Prochains points projet"
          items={nextPoints.map((r) => ({
            title: `${r.reviewType} (${r.status})`,
            subtitle: r.title ?? 'Point projet',
            date: new Date(r.nextReviewDate ?? r.reviewDate).toLocaleDateString('fr-FR'),
          }))}
          emptyLabel={reviewsQ.isLoading ? 'Chargement des points projet…' : 'Aucun prochain point planifié.'}
        />
      );
    }
    if (id === 'decisionsTaken') {
      return (
        <WidgetBarList
          title="Decisions prises"
          items={decisionsTaken.map((d) => ({ label: d.title, value: 100 }))}
          emptyLabel={
            reviewDetailQ.isLoading
              ? 'Chargement des décisions…'
              : "Aucune décision finalisée sur le dernier point."
          }
        />
      );
    }
    if (id === 'decisionsPending') {
      return (
        <WidgetBarList
          title="Decisions a prendre"
          items={decisionsPending.map((d, idx) => ({
            label: d.title,
            value: Math.max(25, 100 - idx * 12),
          }))}
          emptyLabel={
            reviewDetailQ.isLoading
              ? 'Chargement des décisions…'
              : 'Aucune décision en attente sur le brouillon courant.'
          }
        />
      );
    }
    if (id === 'actionItems') {
      const statusCount = openActionItems.reduce<Record<string, number>>((acc, item) => {
        const key = item.status || 'UNKNOWN';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      const max = Math.max(1, ...Object.values(statusCount));
      return (
        <WidgetBarList
          title="Actions ouvertes"
          items={Object.entries(statusCount).map(([status, count]) => ({
            label: `${status} (${count})`,
            value: Math.round((count / max) * 100),
          }))}
          emptyLabel={reviewDetailQ.isLoading ? 'Chargement des actions…' : 'Aucune action ouverte.'}
        />
      );
    }
    if (id === 'warnings') {
      return (
        <WidgetList
          title="Alertes & points d'attention"
          items={project.warnings}
          emptyLabel="Aucun point d'attention."
        />
      );
    }
    if (id === 'tags') {
      return (
        <WidgetList
          title="Etiquettes"
          items={project.tags.map((t) => t.name)}
          emptyLabel="Aucune étiquette."
        />
      );
    }
    return null;
  };

  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-6">
      <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Widgets de pilotage : deplace-les, masque ceux non utiles, puis enregistre.
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen((v) => !v)}>
            <Settings2 className="mr-1 size-4" />
            Configurer
          </Button>
          <Button type="button" size="sm" onClick={saveLayout}>
            Enregistrer
          </Button>
        </div>
      </div>

      {settingsOpen && (
        <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visibilite des widgets
          </p>
          <div className="flex flex-wrap gap-2">
            {defaultOrder.map((id) => (
              <label key={id} className="inline-flex items-center gap-2 rounded border border-border/70 px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={!hiddenWidgets.includes(id)}
                  onChange={() => toggleWidget(id)}
                />
                {widgetTitle[id]}
              </label>
            ))}
          </div>
        </div>
      )}

      {/*
        Deux colonnes sans « trous » de grille : `columns` + `break-inside-avoid` repartit
        les blocs en colonnes équilibrées (pas de ligne forcée à la hauteur du plus grand).
      */}
      <div className="columns-1 [column-gap:1.25rem] md:columns-2 md:[column-gap:1.5rem]">
        {widgetOrder
          .filter((id) => !hiddenWidgets.includes(id))
          .map((id) => (
            <div
              key={id}
              draggable
              onDragStart={() => setDraggedWidget(id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropWidget(id)}
              className={cn(
                'group mb-4',
                id === 'planningTimeline' ? '[column-span:all]' : 'break-inside-avoid',
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <GripVertical className="size-4 opacity-60" />
                <span>{widgetTitle[id]}</span>
              </div>
              {renderWidget(id)}
            </div>
          ))}
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

function WidgetList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
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
          items.map((item, i) => (
            <BarRow key={`${title}-${i}-${item.label.slice(0, 10)}`} label={item.label} value={item.value} />
          ))
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
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3 text-center sm:px-3 sm:py-3.5">
      <div className="text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums sm:text-lg">{value}</div>
    </div>
  );
}
