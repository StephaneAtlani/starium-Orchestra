'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { MergedUiBadges } from '@/lib/ui/badge-registry';
import {
  ARBITRATION_LEVEL_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  projectWarningLabel,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { projectSheet } from '../constants/project-routes';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectReviewDetailQuery } from '../hooks/use-project-review-detail-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import { useProjectSheetQuery } from '../hooks/use-project-sheet-query';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import type {
  ProjectDetail,
  ProjectMilestoneApi,
  ProjectReviewActionItemApi,
  ProjectSheet,
} from '../types/project.types';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import {
  conductContextClickableClass,
  ReviewConductContextDetailModals,
  type ConductContextDetailState,
} from './review-conduct-context-detail-modals';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Flag,
  History,
  Info,
  Scale,
  Target,
  TrendingUp,
} from 'lucide-react';

function classifyPrevReviewAction(
  a: ProjectReviewActionItemApi,
): 'done' | 'in_progress' | 'late' {
  const done = a.status === 'DONE' || a.status === 'CANCELLED';
  if (done) return 'done';
  const due = a.dueDate ? new Date(a.dueDate).getTime() : null;
  if (due != null && due < Date.now()) return 'late';
  return 'in_progress';
}

function formatReviewDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ConductContextSection({
  id,
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-xl border border-border/70 bg-card open:shadow-sm"
      open={defaultOpen}
    >
      <summary
        id={`${id}-summary`}
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
          {title}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/60 px-4 pb-4 pt-3" aria-labelledby={`${id}-summary`}>
        {children}
      </div>
    </details>
  );
}

function ProjectMeteoCompact({
  project,
  badgeMerged,
  onOpenDetail,
}: {
  project: ProjectDetail;
  badgeMerged: MergedUiBadges;
  onOpenDetail: () => void;
}) {
  const av = project.derivedProgressPercent ?? project.progressPercent ?? null;
  return (
    <button
      type="button"
      className={cn(conductContextClickableClass, 'p-3')}
      onClick={onOpenDetail}
      aria-label="Voir le détail des indicateurs projet"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <HealthBadge health={project.computedHealth} compact merged={badgeMerged} />
          <ProjectPortfolioBadges signals={project.signals} merged={badgeMerged} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="tabular-nums text-muted-foreground">
            <span className="starium-overline mr-1">Avancement</span>
            <span className="font-semibold text-foreground">{av != null ? `${av} %` : '—'}</span>
          </span>
          <span className="tabular-nums text-muted-foreground" title="Tâches · Risques · Jalons en retard">
            <span className="starium-overline mr-1">T·R·J</span>
            <span className="font-semibold text-foreground">
              {project.openTasksCount}/{project.openRisksCount}/{project.delayedMilestonesCount}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </div>
    </button>
  );
}

function ArbitrationSidebarBlock({
  sheet,
  onRowClick,
}: {
  sheet: ProjectSheet;
  onRowClick: (row: { label: string; status: string | null; note: string | null }) => void;
}) {
  const rows = [
    { label: 'Métier', status: sheet.arbitrationMetierStatus, note: sheet.arbitrationMetierRefusalNote },
    { label: 'Comité', status: sheet.arbitrationComiteStatus, note: sheet.arbitrationComiteRefusalNote },
    { label: 'Sponsor / CODIR', status: sheet.arbitrationCodirStatus, note: sheet.arbitrationCodirRefusalNote },
  ] as const;

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <button
          key={row.label}
          type="button"
          className={conductContextClickableClass}
          onClick={() => onRowClick(row)}
          aria-label={`Voir le détail arbitrage ${row.label}`}
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {row.label}
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {row.status ? (ARBITRATION_LEVEL_STATUS_LABEL[row.status] ?? row.status) : '—'}
          </p>
          {row.note ? (
            <p className="mt-1 line-clamp-2 border-t border-border/50 pt-1 text-xs text-muted-foreground">
              {row.note}
            </p>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function MilestoneListButton({
  milestone,
  className,
  onOpen,
}: {
  milestone: ProjectMilestoneApi;
  className?: string;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={cn(conductContextClickableClass, 'text-xs', className)}
        onClick={onOpen}
        aria-label={`Voir le détail du jalon ${milestone.name}`}
      >
        <span className="block truncate font-medium text-foreground">{milestone.name}</span>
        {milestone.targetDate ? (
          <span className="mt-0.5 block text-muted-foreground">
            {formatDateOnly(milestone.targetDate)}
          </span>
        ) : null}
      </button>
    </li>
  );
}

type Props = {
  projectId: string;
  project: ProjectDetail;
  badgeMerged: MergedUiBadges;
  previousReviewId: string | null;
};

export function ReviewConductProjectContext({
  projectId,
  project,
  badgeMerged,
  previousReviewId,
}: Props) {
  const [detailState, setDetailState] = useState<ConductContextDetailState>({ kind: 'closed' });

  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const risksQuery = useProjectRisksQuery(projectId);
  const sheetQuery = useProjectSheetQuery(projectId);
  const tasksQuery = useProjectTasksQuery(projectId);
  const previousDetailQuery = useProjectReviewDetailQuery(projectId, previousReviewId);

  const allMilestones = milestonesQuery.data?.items ?? [];

  const openRisks = useMemo(
    () => (risksQuery.data ?? []).filter((r) => r.status === 'OPEN'),
    [risksQuery.data],
  );

  const sinceLastRefDate = previousDetailQuery.data?.finalizedAt ?? previousDetailQuery.data?.reviewDate ?? null;

  const tasksDoneSince = useMemo(() => {
    const tasks = tasksQuery.data?.items;
    if (!sinceLastRefDate || !tasks) return [];
    const t0 = new Date(sinceLastRefDate).getTime();
    return tasks.filter(
      (x) =>
        x.actualEndDate &&
        new Date(x.actualEndDate).getTime() >= t0 &&
        (x.status === 'DONE' || x.status === 'CANCELLED'),
    );
  }, [sinceLastRefDate, tasksQuery.data?.items]);

  const pilotageSinceLast = useMemo(() => {
    if (!previousDetailQuery.data || !tasksQuery.data?.items) return null;
    return {
      tasksDoneSinceCount: tasksDoneSince.length,
      openRisksCount: openRisks.length,
      delayedMilestones: project.delayedMilestonesCount ?? 0,
    };
  }, [
    previousDetailQuery.data,
    tasksQuery.data?.items,
    tasksDoneSince.length,
    openRisks.length,
    project.delayedMilestonesCount,
  ]);

  const delayedMilestones = useMemo(
    () => allMilestones.filter((m) => m.status === 'DELAYED').slice(0, 5),
    [allMilestones],
  );

  const allDelayedMilestones = useMemo(
    () => allMilestones.filter((m) => m.status === 'DELAYED'),
    [allMilestones],
  );

  const achievedMilestones = useMemo(
    () => allMilestones.filter((m) => m.status === 'ACHIEVED').slice(0, 5),
    [allMilestones],
  );

  const plannedMilestones = useMemo(
    () => allMilestones.filter((m) => m.status === 'PLANNED').slice(0, 5),
    [allMilestones],
  );

  const hasWarnings = (project.warnings?.length ?? 0) > 0;

  const previousActionBuckets = useMemo(() => {
    const items = previousDetailQuery.data?.actionItems ?? [];
    const buckets = {
      done: [] as ProjectReviewActionItemApi[],
      in_progress: [] as ProjectReviewActionItemApi[],
      late: [] as ProjectReviewActionItemApi[],
    };
    for (const a of items) {
      const k = classifyPrevReviewAction(a);
      buckets[k].push(a);
    }
    return buckets;
  }, [previousDetailQuery.data?.actionItems]);

  const closeDetail = () => setDetailState({ kind: 'closed' });

  return (
    <>
      <div className="flex flex-col gap-2">
        <ConductContextSection id="conduct-meteo" title="Indicateurs projet" icon={Target} defaultOpen>
          <ProjectMeteoCompact
            project={project}
            badgeMerged={badgeMerged}
            onOpenDetail={() =>
              setDetailState({ kind: 'meteo', project, badgeMerged })
            }
          />
        </ConductContextSection>

        {hasWarnings ? (
          <ConductContextSection id="conduct-warnings" title="Alertes projet" icon={AlertTriangle} defaultOpen>
            <div className="space-y-2">
              {project.warnings?.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={cn(
                    conductContextClickableClass,
                    'border-amber-300/60 bg-amber-50/90 dark:border-amber-400/40 dark:bg-amber-100/90',
                  )}
                  onClick={() => setDetailState({ kind: 'warning', code: w })}
                  aria-label={`Voir le détail de l'alerte ${projectWarningLabel(w)}`}
                >
                  <span className="flex items-start gap-2 text-xs text-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>{projectWarningLabel(w)}</span>
                  </span>
                </button>
              ))}
            </div>
          </ConductContextSection>
        ) : null}

        {previousReviewId ? (
          <ConductContextSection
            id="conduct-since-last"
            title="Depuis le dernier point"
            icon={TrendingUp}
            defaultOpen={false}
          >
            {previousDetailQuery.isLoading || tasksQuery.isLoading ? (
              <LoadingState rows={1} />
            ) : pilotageSinceLast ? (
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  className={conductContextClickableClass}
                  onClick={() =>
                    setDetailState({
                      kind: 'since-last',
                      variant: 'tasks',
                      tasks: tasksDoneSince,
                    })
                  }
                  aria-label="Voir le détail des tâches terminées"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tâches terminées
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {pilotageSinceLast.tasksDoneSinceCount}
                  </p>
                </button>
                <button
                  type="button"
                  className={conductContextClickableClass}
                  onClick={() =>
                    setDetailState({
                      kind: 'since-last',
                      variant: 'risks',
                      risks: openRisks,
                    })
                  }
                  aria-label="Voir le détail des risques ouverts"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Risques ouverts
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {pilotageSinceLast.openRisksCount}
                  </p>
                </button>
                <button
                  type="button"
                  className={conductContextClickableClass}
                  onClick={() =>
                    setDetailState({
                      kind: 'since-last',
                      variant: 'milestones',
                      milestones: allDelayedMilestones,
                    })
                  }
                  aria-label="Voir le détail des jalons en retard"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Jalons en retard
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {pilotageSinceLast.delayedMilestones}
                  </p>
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Données indisponibles.</p>
            )}
          </ConductContextSection>
        ) : null}

        <ConductContextSection
          id="conduct-prev-actions"
          title="Actions point précédent"
          icon={History}
          defaultOpen={previousActionBuckets.late.length > 0}
        >
          {!previousReviewId ? (
            <p className="text-xs text-muted-foreground">Premier point ou historique vide.</p>
          ) : previousDetailQuery.isLoading ? (
            <LoadingState rows={2} />
          ) : previousDetailQuery.error || !previousDetailQuery.data ? (
            <p className="text-xs text-destructive">Impossible de charger le point précédent.</p>
          ) : previousDetailQuery.data.actionItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune action enregistrée.</p>
          ) : (
            <div className="space-y-3">
              {(
                [
                  ['Terminées', previousActionBuckets.done, 'text-emerald-800 dark:text-emerald-300'],
                  ['En cours', previousActionBuckets.in_progress, 'text-sky-800 dark:text-sky-300'],
                  ['En retard', previousActionBuckets.late, 'text-amber-900 dark:text-amber-300'],
                ] as const
              ).map(([label, items, labelClass]) => (
                <div key={label}>
                  <p
                    className={cn(
                      'mb-1 text-[0.65rem] font-semibold uppercase tracking-wide',
                      labelClass,
                    )}
                  >
                    {label} ({items.length})
                  </p>
                  <ul className="space-y-1">
                    {items.length === 0 ? (
                      <li className="text-xs text-muted-foreground">—</li>
                    ) : (
                      items.slice(0, 4).map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            className={cn(conductContextClickableClass, 'text-xs')}
                            onClick={() => setDetailState({ kind: 'action', action: a })}
                            aria-label={`Voir le détail de l'action ${a.title}`}
                          >
                            <span className="font-medium text-foreground">{a.title}</span>
                            <span className="mt-0.5 block text-muted-foreground">
                              {TASK_STATUS_LABEL[a.status] ?? a.status}
                              {a.dueDate ? ` · ${formatReviewDateTime(a.dueDate)}` : ''}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ConductContextSection>

        <ConductContextSection id="conduct-progress" title="Avancement projet" icon={Target} defaultOpen={false}>
          {milestonesQuery.isLoading ? (
            <LoadingState rows={1} />
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                className={cn(conductContextClickableClass, 'text-xs')}
                onClick={() =>
                  setDetailState({
                    kind: 'progress',
                    project,
                    milestones: allMilestones,
                  })
                }
                aria-label="Voir le détail de l'avancement projet"
              >
                <span className="text-muted-foreground">Manuel / dérivé : </span>
                <span className="font-medium tabular-nums text-foreground">
                  {project.progressPercent != null ? `${project.progressPercent} %` : '—'}
                  {' / '}
                  {project.derivedProgressPercent != null ? `${project.derivedProgressPercent} %` : '—'}
                </span>
              </button>
              <div>
                <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Atteints ({achievedMilestones.length})
                </p>
                <ul className="space-y-1">
                  {achievedMilestones.length === 0 ? (
                    <li className="text-xs text-muted-foreground">—</li>
                  ) : (
                    achievedMilestones.map((m) => (
                      <MilestoneListButton
                        key={m.id}
                        milestone={m}
                        onOpen={() => setDetailState({ kind: 'milestone', milestone: m })}
                      />
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Prochains ({plannedMilestones.length})
                </p>
                <ul className="space-y-1">
                  {plannedMilestones.length === 0 ? (
                    <li className="text-xs text-muted-foreground">—</li>
                  ) : (
                    plannedMilestones.map((m) => (
                      <MilestoneListButton
                        key={m.id}
                        milestone={m}
                        onOpen={() => setDetailState({ kind: 'milestone', milestone: m })}
                      />
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  En dérive ({delayedMilestones.length})
                </p>
                <ul className="space-y-1">
                  {delayedMilestones.length === 0 ? (
                    <li className="text-xs text-muted-foreground">—</li>
                  ) : (
                    delayedMilestones.map((m) => (
                      <MilestoneListButton
                        key={m.id}
                        milestone={m}
                        className="text-amber-900 dark:text-amber-200"
                        onOpen={() => setDetailState({ kind: 'milestone', milestone: m })}
                      />
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </ConductContextSection>

        <ConductContextSection
          id="conduct-risks"
          title={`Risques ouverts (${openRisks.length})`}
          icon={Flag}
          defaultOpen={openRisks.length > 0}
        >
          {risksQuery.isLoading ? (
            <LoadingState rows={2} />
          ) : openRisks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun risque ouvert.</p>
          ) : (
            <ul className="space-y-2">
              {openRisks.slice(0, 6).map((r) => {
                const crit = riskCriticalityForRisk(r);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={conductContextClickableClass}
                      onClick={() => setDetailState({ kind: 'risk', risk: r })}
                      aria-label={`Voir le détail du risque ${r.title}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium leading-snug text-foreground">{r.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {PROJECT_CRITICALITY_LABEL[crit] ?? crit}
                        </span>
                      </div>
                      {r.mitigationPlan ? (
                        <p className="mt-1.5 line-clamp-3 border-t border-border/50 pt-1.5 text-xs text-muted-foreground">
                          {r.mitigationPlan}
                        </p>
                      ) : (
                        <p className="starium-text-warning-emphasis mt-1.5 text-xs font-semibold">
                          Plan d&apos;action non renseigné
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ConductContextSection>

        <ConductContextSection id="conduct-arbitration" title="Arbitrage" icon={Scale} defaultOpen={false}>
          <Alert className="mb-3 border-border/70 bg-muted/30 py-2">
            <Info className="size-4 text-muted-foreground" aria-hidden />
            <AlertDescription className="text-xs text-muted-foreground">
              Lecture seule —{' '}
              <Link href={projectSheet(projectId)} className="font-medium text-primary underline-offset-4 hover:underline">
                modifier sur la fiche projet
              </Link>
              .
            </AlertDescription>
          </Alert>
          {sheetQuery.isLoading ? (
            <LoadingState rows={1} />
          ) : sheetQuery.data ? (
            <ArbitrationSidebarBlock
              sheet={sheetQuery.data}
              onRowClick={(row) =>
                setDetailState({
                  kind: 'arbitration',
                  label: row.label,
                  status: row.status,
                  note: row.note,
                })
              }
            />
          ) : (
            <p className="text-xs text-muted-foreground">Fiche projet indisponible.</p>
          )}
        </ConductContextSection>
      </div>

      <ReviewConductContextDetailModals
        projectId={projectId}
        state={detailState}
        onClose={closeDetail}
      />
    </>
  );
}
