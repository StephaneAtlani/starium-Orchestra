'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers3,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { listProjectTaskPhases } from '../api/projects.api';
import {
  buildMacroPlanningMilestoneMarkers,
  buildMacroPlanningPhaseRows,
  computeMacroPlanningWindowBounds,
  findMacroPlanningPanStepForMs,
  getMacroPlanningMaxPanStep,
  getMacroPlanningTaskRangeMs,
  getMacroPlanningTodayPercent,
  type MacroPlanningPhaseRow,
} from '../lib/build-macro-planning-gantt';
import { TASK_STATUS_LABEL, MILESTONE_STATUS_LABEL } from '../constants/project-enum-labels';
import {
  buildMacroGanttHeaderMonths,
  GANTT_PX_PER_DAY_BY_SCALE,
  msToTimelinePercent,
  rangeToTimelinePercent,
  type TimelineBounds,
} from '../lib/gantt-timeline-layout';
import { projectPlanning } from '../constants/project-routes';
import { useMacroGanttPanDrag } from '../hooks/use-macro-gantt-pan-drag';
import { ProjectPlanningMacroSidebar } from './project-planning-macro-sidebar';
import {
  MacroGanttBar,
  MacroGanttMilestoneDiamond,
} from './project-macro-gantt-bar';
import {
  MacroGanttPhaseTooltipContent,
  ProjectGanttMilestoneTooltipContent,
  ProjectGanttTaskTooltipContent,
} from './project-gantt-entity-tooltip';
import type { MilestoneForGanttBody } from '../lib/build-gantt-body-rows';
import type { ProjectMilestoneApi, ProjectTaskApi } from '../types/project.types';
import { TooltipProvider } from '@/components/ui/tooltip';

const MACRO_TIMELINE_SCALE = 'week' as const;

const UNGROUPED_PHASE_KEY = '__none__';
const MILESTONES_SECTION_KEY = '__milestones__';

function phaseRowKey(phaseId: string | null): string {
  return phaseId ?? UNGROUPED_PHASE_KEY;
}

function barPercent(
  startMs: number | null,
  endMs: number | null,
  bounds: TimelineBounds,
): { left: string; width: string } | null {
  if (startMs == null || endMs == null) return null;
  return rangeToTimelinePercent(startMs, endMs, bounds);
}

function taskBarPercent(
  task: ProjectTaskApi,
  bounds: TimelineBounds,
): { left: string; width: string } | null {
  const range = getMacroPlanningTaskRangeMs(task);
  if (!range) return null;
  return rangeToTimelinePercent(range.startMs, range.endMs, bounds);
}

function toMilestoneForGantt(milestone: ProjectMilestoneApi): MilestoneForGanttBody {
  return {
    id: milestone.id,
    name: milestone.name,
    targetDate: milestone.targetDate,
    linkedTaskId: milestone.linkedTaskId,
    phaseId: milestone.phaseId,
    sortOrder: milestone.sortOrder,
    status: milestone.status,
    isLate: milestone.status === 'DELAYED',
  };
}

function buildMilestoneTooltipContent(
  milestone: ProjectMilestoneApi,
  phaseNameById: Map<string, string>,
  taskNameById: Map<string, string>,
): ReactNode {
  const ms = toMilestoneForGantt(milestone);
  return (
    <ProjectGanttMilestoneTooltipContent
      milestone={ms}
      linkedTaskName={
        ms.linkedTaskId ? taskNameById.get(ms.linkedTaskId) ?? null : null
      }
      phaseName={ms.phaseId ? phaseNameById.get(ms.phaseId) ?? null : null}
      projectBusinessProblem={null}
    />
  );
}

function buildMacroSubBarTooltip(
  row: MacroPlanningPhaseRow,
  taskById: Map<string, ProjectTaskApi>,
  milestoneById: Map<string, ProjectMilestoneApi>,
  phaseNameById: Map<string, string>,
  taskNameById: Map<string, string>,
): ReactNode | undefined {
  if (row.subTaskId) {
    const subTask = taskById.get(row.subTaskId);
    if (!subTask) return undefined;
    return (
      <ProjectGanttTaskTooltipContent
        task={subTask}
        phaseName={
          subTask.phaseId ? phaseNameById.get(subTask.phaseId) ?? null : null
        }
        predecessorName={
          subTask.dependsOnTaskId
            ? taskNameById.get(subTask.dependsOnTaskId) ?? null
            : null
        }
      />
    );
  }
  if (row.subMilestoneId) {
    const subMilestone = milestoneById.get(row.subMilestoneId);
    if (!subMilestone) return undefined;
    return buildMilestoneTooltipContent(subMilestone, phaseNameById, taskNameById);
  }
  return undefined;
}

export function ProjectPlanningMacroTab({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const projectQuery = useProjectDetailQuery(projectId);
  const tasksQuery = useProjectTasksQuery(projectId);
  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const assignableQuery = useProjectAssignableUsers({ enabled: true });

  const [phaseOptions, setPhaseOptions] = useState<
    Array<{ id: string; name: string; sortOrder: number }>
  >([]);
  const [phaseFilter, setPhaseFilter] = useState('__all__');
  const [teamFilter, setTeamFilter] = useState('__all__');
  const [panStep, setPanStep] = useState(0);
  const [expandedPhaseKeys, setExpandedPhaseKeys] = useState<Set<string>>(() => new Set());
  const [milestonesExpanded, setMilestonesExpanded] = useState(false);

  useEffect(() => {
    void listProjectTaskPhases(authFetch, projectId)
      .then((phases) => {
        setPhaseOptions(
          phases.map((p) => ({ id: p.id, name: p.name, sortOrder: p.sortOrder })),
        );
      })
      .catch(() => setPhaseOptions([]));
  }, [authFetch, projectId]);

  const filteredTasks = useMemo(() => {
    const items = tasksQuery.data?.items ?? [];
    return items.filter((task) => {
      if (teamFilter !== '__all__') {
        const ownerMatch = task.ownerUserId === teamFilter;
        const resourceMatch = task.responsibleResourceId === teamFilter;
        if (!ownerMatch && !resourceMatch) return false;
      }
      if (phaseFilter !== '__all__') {
        if ((task.phaseId ?? null) !== phaseFilter) return false;
      }
      return true;
    });
  }, [tasksQuery.data?.items, teamFilter, phaseFilter]);

  const filteredMilestones = useMemo(() => {
    const items = milestonesQuery.data?.items ?? [];
    return items.filter((milestone) => {
      if (phaseFilter !== '__all__' && (milestone.phaseId ?? null) !== phaseFilter) {
        return false;
      }
      return true;
    });
  }, [milestonesQuery.data?.items, phaseFilter]);

  const phaseRows = useMemo(
    () => buildMacroPlanningPhaseRows(phaseOptions, filteredTasks, filteredMilestones),
    [phaseOptions, filteredTasks, filteredMilestones],
  );

  const visiblePhaseRows = useMemo(() => {
    if (phaseFilter === '__all__') return phaseRows;
    return phaseRows.filter((row) => row.phaseId === phaseFilter);
  }, [phaseRows, phaseFilter]);

  const milestoneMarkers = useMemo(
    () => buildMacroPlanningMilestoneMarkers(phaseOptions, filteredMilestones),
    [phaseOptions, filteredMilestones],
  );

  const viewportFocusKey = useMemo(
    () => [phaseFilter, teamFilter].join('|'),
    [phaseFilter, teamFilter],
  );

  useEffect(() => {
    setPanStep(0);
    setExpandedPhaseKeys(new Set());
    setMilestonesExpanded(false);
  }, [viewportFocusKey]);

  const togglePhaseExpanded = useCallback((phaseKey: string) => {
    setExpandedPhaseKeys((prev) => {
      const next = new Set(prev);
      if (next.has(phaseKey)) next.delete(phaseKey);
      else next.add(phaseKey);
      return next;
    });
  }, []);

  const maxPanStep = useMemo(
    () =>
      getMacroPlanningMaxPanStep(
        visiblePhaseRows,
        milestoneMarkers,
        MACRO_TIMELINE_SCALE,
      ),
    [visiblePhaseRows, milestoneMarkers],
  );

  const bounds = useMemo(
    () =>
      computeMacroPlanningWindowBounds(
        visiblePhaseRows,
        milestoneMarkers,
        MACRO_TIMELINE_SCALE,
        panStep,
      ),
    [visiblePhaseRows, milestoneMarkers, panStep],
  );

  const canPanPrev = panStep > 0;
  const canPanNext = panStep < maxPanStep;

  const { isDragging, panHandlers } = useMacroGanttPanDrag(
    panStep,
    maxPanStep,
    setPanStep,
  );

  const pxPerDay = GANTT_PX_PER_DAY_BY_SCALE[MACRO_TIMELINE_SCALE];
  const headerMonths = useMemo(
    () => (bounds ? buildMacroGanttHeaderMonths(bounds, pxPerDay) : []),
    [bounds, pxPerDay],
  );

  const todayPercent = useMemo(
    () => (bounds ? getMacroPlanningTodayPercent(bounds) : null),
    [bounds],
  );

  const taskById = useMemo(() => {
    const map = new Map<string, ProjectTaskApi>();
    for (const task of filteredTasks) map.set(task.id, task);
    return map;
  }, [filteredTasks]);

  const milestoneById = useMemo(() => {
    const map = new Map<string, ProjectMilestoneApi>();
    for (const milestone of filteredMilestones) map.set(milestone.id, milestone);
    return map;
  }, [filteredMilestones]);

  const phaseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const phase of phaseOptions) map.set(phase.id, phase.name);
    return map;
  }, [phaseOptions]);

  const taskNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of filteredTasks) map.set(task.id, task.name);
    return map;
  }, [filteredTasks]);

  const tasksByPhaseKey = useMemo(() => {
    const knownPhaseIds = new Set(phaseOptions.map((p) => p.id));
    const map = new Map<string, ProjectTaskApi[]>();
    for (const task of filteredTasks) {
      const rawKey = task.phaseId ?? null;
      const key =
        rawKey !== null && !knownPhaseIds.has(rawKey)
          ? UNGROUPED_PHASE_KEY
          : phaseRowKey(rawKey);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fr'),
      );
    }
    return map;
  }, [filteredTasks, phaseOptions]);

  const scrollToToday = () => {
    const step = findMacroPlanningPanStepForMs(
      visiblePhaseRows,
      milestoneMarkers,
      MACRO_TIMELINE_SCALE,
      Date.now(),
    );
    setPanStep(step);
  };

  const isLoading =
    projectQuery.isLoading || tasksQuery.isLoading || milestonesQuery.isLoading;

  if (isLoading || !projectQuery.data) {
    return <LoadingState rows={8} />;
  }

  const assignableOptions = assignableQuery.data?.users ?? [];
  const teamLabel =
    teamFilter === '__all__'
      ? 'Toutes'
      : (() => {
          const user = assignableOptions.find((u) => u.id === teamFilter);
          if (!user) return 'Toutes';
          return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
        })();
  const phaseLabel =
    phaseFilter === '__all__'
      ? 'Toutes'
      : (phaseOptions.find((p) => p.id === phaseFilter)?.name ?? 'Toutes');

  return (
    <div className="starium-mpg pt-4">
      <div className="starium-gantt-toolbar">
        <button type="button" className="starium-fbtn">
          <Filter strokeWidth={2} aria-hidden />
          Filtres
        </button>

        <div className="starium-fbtn-wrap">
          <Users className="starium-fbtn-icon" strokeWidth={2} aria-hidden />
          <select
            className="starium-fbtn-select"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            aria-label="Filtrer par équipe"
          >
            <option value="__all__">Équipe : Toutes</option>
            {assignableOptions.map((user) => (
              <option key={user.id} value={user.id}>
                Équipe : {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
              </option>
            ))}
          </select>
          <ChevronDown className="starium-fbtn-chev" strokeWidth={2.5} aria-hidden />
        </div>

        <div className="starium-fbtn-wrap">
          <Layers3 className="starium-fbtn-icon" strokeWidth={2} aria-hidden />
          <select
            className="starium-fbtn-select"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            aria-label="Filtrer par phase"
          >
            <option value="__all__">Phase : Toutes</option>
            {phaseOptions.map((phase) => (
              <option key={phase.id} value={phase.id}>
                Phase : {phase.name}
              </option>
            ))}
          </select>
          <ChevronDown className="starium-fbtn-chev" strokeWidth={2.5} aria-hidden />
        </div>

        <div className="starium-toolbar-spacer" aria-hidden />

        <button type="button" className="starium-fbtn" onClick={scrollToToday}>
          Aujourd&apos;hui
        </button>
        <button
          type="button"
          className="starium-fbtn starium-fbtn--icon"
          aria-label="Période précédente"
          disabled={!canPanPrev}
          onClick={() => setPanStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft strokeWidth={2.5} aria-hidden />
        </button>
        <button
          type="button"
          className="starium-fbtn starium-fbtn--icon"
          aria-label="Période suivante"
          disabled={!canPanNext}
          onClick={() => setPanStep((s) => Math.min(maxPanStep, s + 1))}
        >
          <ChevronRight strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      <div className="starium-g2-side">
        {!bounds ? (
          <div className="starium-mpg-empty starium-panel rounded-[var(--ds-card-radius)] border border-border bg-card">
            <Layers3 className="size-8 text-muted-foreground/70" aria-hidden />
            <p className="mt-3 text-sm font-medium">Planning macro vide</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Ajoutez des phases, tâches datées ou des jalons pour alimenter la frise.
            </p>
            <Link href={projectPlanning(projectId, 'milestones')} className="starium-sp-btn mt-4">
              Créer des jalons
            </Link>
          </div>
        ) : (
          <TooltipProvider delay={250}>
          <div className="starium-panel starium-gantt-card overflow-hidden rounded-[var(--ds-card-radius)] border border-border bg-card p-0">
            <div
              className={cn(
                'starium-gantt-viewport starium-macro-gantt-pan',
                isDragging && 'starium-macro-gantt-pan--dragging',
              )}
              role="group"
              aria-label="Frise planning — glisser horizontalement pour changer de période"
              {...panHandlers}
            >
              <div className="starium-macro-gantt">
                <div className="starium-gantt-head">
                  <div className="starium-gantt-head-label">Phase / Tâche</div>
                  <div className="starium-gantt-months">
                    {headerMonths.map((month, monthIndex) => (
                      <div
                        key={`${month.label}-${monthIndex}`}
                        className="starium-gantt-month"
                        style={{ flex: `${month.flex} 1 0` }}
                      >
                        <div className="starium-gantt-month-name">{month.label}</div>
                        <div className="starium-gantt-weeks">
                          {month.weeks.map((week) => (
                            <div key={`${month.label}-${week.label}`} className="starium-gantt-week">
                              <b>{week.label}</b>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="starium-gantt-body">
                  {todayPercent != null ? (
                    <div className="starium-gantt-today-layer" aria-hidden>
                      <div
                        className="starium-gantt-today"
                        style={{ left: `${todayPercent}%` }}
                      >
                        <div className="starium-gantt-today-flag">Aujourd&apos;hui</div>
                      </div>
                    </div>
                  ) : null}

                {visiblePhaseRows.map((row) => {
                  const phaseKey = phaseRowKey(row.phaseId);
                  const isExpanded = expandedPhaseKeys.has(phaseKey);
                  const canExpand = row.taskCount > 0;
                  const phaseTasks = tasksByPhaseKey.get(phaseKey) ?? [];
                  const mainBar = barPercent(row.startMs, row.endMs, bounds);
                  const subBar = barPercent(row.subStartMs, row.subEndMs, bounds);
                  return (
                    <Fragment key={phaseKey}>
                      <div className="starium-gantt-row starium-gantt-row--phase">
                        <div
                          className="starium-gantt-rowlabel starium-gantt-rowlabel--phase"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {canExpand ? (
                            <button
                              type="button"
                              className="starium-gantt-phase-toggle"
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded
                                  ? `Replier les tâches de ${row.name}`
                                  : `Déplier les tâches de ${row.name}`
                              }
                              onClick={() => togglePhaseExpanded(phaseKey)}
                            >
                              <ChevronRight
                                className={cn(
                                  'size-3.5 shrink-0 transition-transform motion-reduce:transition-none',
                                  isExpanded && 'rotate-90',
                                )}
                                strokeWidth={2.5}
                                aria-hidden
                              />
                            </button>
                          ) : null}
                          <span
                            className="starium-gantt-phase-dot"
                            style={{ background: row.color }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="starium-gantt-phase-name">{row.name}</div>
                            <div className="starium-gantt-phase-sub">
                              {row.taskCount} tâche{row.taskCount > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'starium-gantt-track',
                            !isExpanded &&
                              row.subLabel &&
                              subBar &&
                              'starium-gantt-track--dual',
                          )}
                        >
                          {mainBar ? (
                            <MacroGanttBar
                              className="starium-gantt-bar"
                              style={{
                                left: mainBar.left,
                                width: mainBar.width,
                                background: row.color,
                              }}
                              title={row.name}
                              tooltipContent={
                                <MacroGanttPhaseTooltipContent
                                  name={row.name}
                                  taskCount={row.taskCount}
                                  milestoneCount={row.milestoneCount}
                                  startMs={row.startMs}
                                  endMs={row.endMs}
                                />
                              }
                            >
                              {row.name}
                            </MacroGanttBar>
                          ) : null}
                          {!isExpanded && row.subLabel && subBar ? (
                            <MacroGanttBar
                              className="starium-gantt-bar starium-gantt-bar--sub"
                              style={{
                                left: subBar.left,
                                width: subBar.width,
                                background: row.color,
                              }}
                              title={row.subLabel}
                              tooltipContent={buildMacroSubBarTooltip(
                                row,
                                taskById,
                                milestoneById,
                                phaseNameById,
                                taskNameById,
                              )}
                            >
                              {row.subLabel}
                            </MacroGanttBar>
                          ) : null}
                        </div>
                      </div>

                      {isExpanded
                        ? phaseTasks.map((task) => {
                            const taskBar = taskBarPercent(task, bounds);
                            const statusLabel =
                              TASK_STATUS_LABEL[task.status] ?? task.status;
                            return (
                              <div
                                key={task.id}
                                className="starium-gantt-row starium-gantt-row--task"
                              >
                                <div
                                  className="starium-gantt-rowlabel starium-gantt-rowlabel--task"
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <span
                                    className="starium-gantt-phase-dot starium-gantt-phase-dot--task"
                                    style={{ background: row.color }}
                                    aria-hidden
                                  />
                                  <div className="min-w-0">
                                    <div className="starium-gantt-task-name">{task.name}</div>
                                    <div className="starium-gantt-task-sub">
                                      {taskBar
                                        ? `${task.progress} % · ${statusLabel}`
                                        : 'Non planifiée'}
                                      {task.isLate ? ' · En retard' : ''}
                                    </div>
                                  </div>
                                </div>
                                <div className="starium-gantt-track starium-gantt-track--task">
                                  {taskBar ? (
                                    <MacroGanttBar
                                      className="starium-gantt-bar starium-gantt-bar--task"
                                      style={{
                                        left: taskBar.left,
                                        width: taskBar.width,
                                        background: row.color,
                                      }}
                                      title={task.name}
                                      tooltipContent={
                                        <ProjectGanttTaskTooltipContent
                                          task={task}
                                          phaseName={
                                            task.phaseId
                                              ? phaseNameById.get(task.phaseId) ?? null
                                              : null
                                          }
                                          predecessorName={
                                            task.dependsOnTaskId
                                              ? taskNameById.get(task.dependsOnTaskId) ?? null
                                              : null
                                          }
                                        />
                                      }
                                    >
                                      {task.name}
                                    </MacroGanttBar>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        : null}
                    </Fragment>
                  );
                })}

                <Fragment key={MILESTONES_SECTION_KEY}>
                  <div className="starium-gantt-row starium-gantt-row--phase">
                    <div
                      className="starium-gantt-rowlabel starium-gantt-rowlabel--phase"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {milestoneMarkers.length > 0 ? (
                        <button
                          type="button"
                          className="starium-gantt-phase-toggle"
                          aria-expanded={milestonesExpanded}
                          aria-label={
                            milestonesExpanded
                              ? 'Replier la liste des jalons'
                              : 'Déplier la liste des jalons'
                          }
                          onClick={() => setMilestonesExpanded((v) => !v)}
                        >
                          <ChevronRight
                            className={cn(
                              'size-3.5 shrink-0 transition-transform motion-reduce:transition-none',
                              milestonesExpanded && 'rotate-90',
                            )}
                            strokeWidth={2.5}
                            aria-hidden
                          />
                        </button>
                      ) : null}
                      <span
                        className="starium-gantt-phase-dot"
                        style={{ background: 'var(--brand-ink)' }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="starium-gantt-phase-name">Jalons</div>
                        <div className="starium-gantt-phase-sub">
                          {milestoneMarkers.length} jalon{milestoneMarkers.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="starium-gantt-track starium-gantt-track--jalons">
                      {!milestonesExpanded
                        ? milestoneMarkers.map((marker) => {
                            const markerPct = msToTimelinePercent(marker.targetMs, bounds);
                            if (markerPct < 0 || markerPct > 100) return null;
                            const milestone = milestoneById.get(marker.id);
                            return (
                              <MacroGanttMilestoneDiamond
                                key={marker.id}
                                className="starium-gantt-diamond"
                                style={{
                                  left: `${markerPct}%`,
                                  background: marker.color,
                                }}
                                label={`${marker.name} — ${new Date(marker.targetMs).toLocaleDateString('fr-FR')}`}
                                tooltipContent={
                                  milestone
                                    ? buildMilestoneTooltipContent(
                                        milestone,
                                        phaseNameById,
                                        taskNameById,
                                      )
                                    : undefined
                                }
                              />
                            );
                          })
                        : null}
                    </div>
                  </div>

                  {milestonesExpanded
                    ? milestoneMarkers.map((marker) => {
                        const markerPct = msToTimelinePercent(marker.targetMs, bounds);
                        const inView = markerPct >= 0 && markerPct <= 100;
                        const milestone = milestoneById.get(marker.id);
                        const statusLabel =
                          MILESTONE_STATUS_LABEL[marker.status] ?? marker.status;
                        const targetLabel = new Date(marker.targetMs).toLocaleDateString(
                          'fr-FR',
                          { day: '2-digit', month: 'short', year: 'numeric' },
                        );
                        return (
                          <div
                            key={marker.id}
                            className="starium-gantt-row starium-gantt-row--task"
                          >
                            <div
                              className="starium-gantt-rowlabel starium-gantt-rowlabel--task"
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <span
                                className="starium-gantt-milestone-label-icon"
                                style={{ background: marker.color }}
                                aria-hidden
                              />
                              <div className="min-w-0">
                                <div className="starium-gantt-task-name">{marker.name}</div>
                                <div className="starium-gantt-task-sub">
                                  {targetLabel} · {statusLabel}
                                </div>
                              </div>
                            </div>
                            <div className="starium-gantt-track starium-gantt-track--task starium-gantt-track--jalons">
                              {inView ? (
                                <MacroGanttMilestoneDiamond
                                  className="starium-gantt-diamond"
                                  style={{
                                    left: `${markerPct}%`,
                                    background: marker.color,
                                  }}
                                  label={`${marker.name} — ${targetLabel}`}
                                  tooltipContent={
                                    milestone
                                      ? buildMilestoneTooltipContent(
                                          milestone,
                                          phaseNameById,
                                          taskNameById,
                                        )
                                      : undefined
                                  }
                                />
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    : null}
                </Fragment>
                </div>
              </div>
            </div>
          </div>
          </TooltipProvider>
        )}

        <ProjectPlanningMacroSidebar projectId={projectId} project={projectQuery.data} />
      </div>

      <p className="sr-only" aria-live="polite">
        Filtres actifs : équipe {teamLabel}, phase {phaseLabel}.
      </p>
    </div>
  );
}
