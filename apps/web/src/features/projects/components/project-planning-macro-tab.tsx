'use client';

import { useEffect, useMemo, useState } from 'react';
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
  getMacroPlanningTodayPercent,
} from '../lib/build-macro-planning-gantt';
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

const MACRO_TIMELINE_SCALE = 'week' as const;

function barPercent(
  startMs: number | null,
  endMs: number | null,
  bounds: TimelineBounds,
): { left: string; width: string } | null {
  if (startMs == null || endMs == null) return null;
  return rangeToTimelinePercent(startMs, endMs, bounds);
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
  }, [viewportFocusKey]);

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

                {visiblePhaseRows.map((row, rowIndex) => {
                  const mainBar = barPercent(row.startMs, row.endMs, bounds);
                  const subBar = barPercent(row.subStartMs, row.subEndMs, bounds);
                  return (
                    <div key={row.phaseId ?? '__none__'} className="starium-gantt-row">
                      <div className="starium-gantt-rowlabel">
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
                      <div className="starium-gantt-track">
                        {todayPercent != null ? (
                          <div
                            className="starium-gantt-today"
                            style={{ left: `${todayPercent}%` }}
                            aria-hidden
                          >
                            {rowIndex === 0 ? (
                              <div className="starium-gantt-today-flag">Aujourd&apos;hui</div>
                            ) : null}
                          </div>
                        ) : null}
                        {mainBar ? (
                          <div
                            className="starium-gantt-bar"
                            style={{
                              left: mainBar.left,
                              width: mainBar.width,
                              background: row.color,
                            }}
                            title={row.name}
                          >
                            {row.name}
                          </div>
                        ) : null}
                        {row.subLabel && subBar ? (
                          <div
                            className="starium-gantt-bar starium-gantt-bar--sub"
                            style={{
                              left: subBar.left,
                              width: subBar.width,
                              background: row.color,
                              top: 30,
                            }}
                            title={row.subLabel}
                          >
                            {row.subLabel}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                <div className="starium-gantt-row">
                  <div className="starium-gantt-rowlabel">
                    <span
                      className="starium-gantt-phase-dot"
                      style={{ background: 'var(--brand-ink)' }}
                      aria-hidden
                    />
                    <div>
                      <div className="starium-gantt-phase-name">Jalons</div>
                      <div className="starium-gantt-phase-sub">
                        {milestoneMarkers.length} jalon{milestoneMarkers.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="starium-gantt-track starium-gantt-track--jalons">
                    {todayPercent != null ? (
                      <div
                        className="starium-gantt-today"
                        style={{ left: `${todayPercent}%` }}
                        aria-hidden
                      />
                    ) : null}
                    {milestoneMarkers.map((marker) => {
                      const markerPct = msToTimelinePercent(marker.targetMs, bounds);
                      if (markerPct < 0 || markerPct > 100) return null;
                      return (
                      <div
                        key={marker.id}
                        className="starium-gantt-diamond"
                        style={{
                          left: `${markerPct}%`,
                          background: marker.color,
                        }}
                        title={`${marker.name} — ${new Date(marker.targetMs).toLocaleDateString('fr-FR')}`}
                      >
                        <span className="sr-only">{marker.name}</span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ProjectPlanningMacroSidebar projectId={projectId} project={projectQuery.data} />
      </div>

      <p className="sr-only" aria-live="polite">
        Filtres actifs : équipe {teamLabel}, phase {phaseLabel}.
      </p>
    </div>
  );
}
