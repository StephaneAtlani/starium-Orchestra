'use client';

import { useMemo, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectGanttQuery } from '../hooks/use-project-gantt-query';
import { buildProjectTaskTreeRows } from '../lib/project-task-tree';
import {
  GANTT_PX_PER_DAY,
  GANTT_ROW_PX,
  computeTimelineBounds,
  dateMsToPx,
  dateRangeToTimelineLayout,
  type TimelineBounds,
} from '../lib/gantt-timeline-layout';
import {
  ProjectTaskPlanningSection,
  type ProjectTaskPlanningSectionHandle,
} from './project-task-planning-section';
import { Info } from 'lucide-react';

export function ProjectGanttPanel({ projectId }: { projectId: string }) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const planningRef = useRef<ProjectTaskPlanningSectionHandle>(null);

  const ganttQuery = useProjectGanttQuery(projectId);
  const payload = ganttQuery.data;

  const milestoneTimes = useMemo(
    () => (payload?.milestones ?? []).map((m) => new Date(m.targetDate).getTime()),
    [payload?.milestones],
  );

  const treeRows = useMemo(() => {
    if (!payload?.tasks) return [];
    const sources = payload.tasks.map((t) => ({
      ...t,
      parentTaskId: t.parentTaskId,
      sortOrder: t.sortOrder,
      plannedStartDate: t.plannedStartDate,
      createdAt: t.createdAt,
    }));
    return buildProjectTaskTreeRows(sources);
  }, [payload?.tasks]);

  const unplannedCount = useMemo(() => {
    if (!payload?.tasks) return 0;
    return payload.tasks.filter(
      (t) => !t.plannedStartDate || !t.plannedEndDate,
    ).length;
  }, [payload?.tasks]);

  const bounds = useMemo((): TimelineBounds | null => {
    if (!payload) return null;
    return computeTimelineBounds(payload.tasks, milestoneTimes);
  }, [payload, milestoneTimes]);

  const layout = useMemo(() => {
    if (!bounds) return null;
    return dateRangeToTimelineLayout(bounds, GANTT_PX_PER_DAY);
  }, [bounds]);

  const sortedMilestones = useMemo(() => {
    const m = payload?.milestones ?? [];
    return [...m].sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime() ||
        a.sortOrder - b.sortOrder,
    );
  }, [payload?.milestones]);

  const milestoneSidebarRows = useMemo(
    () => sortedMilestones.map((m) => ({ id: m.id, name: m.name })),
    [sortedMilestones],
  );

  if (ganttQuery.isLoading) {
    return <LoadingState rows={6} />;
  }

  if (ganttQuery.isError || !payload) {
    return (
      <p className="text-destructive text-sm">Impossible de charger le Gantt.</p>
    );
  }

  const toolbar = (
    <div className="bg-muted/30 flex h-9 shrink-0 items-center justify-end border-b border-border/60 px-3">
      {canEdit && (
        <Button
          type="button"
          size="sm"
          onClick={() => planningRef.current?.openCreate()}
        >
          Nouvelle tâche
        </Button>
      )}
    </div>
  );

  if (!bounds || !layout) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <Alert>
          <Info className="size-4" />
          <AlertTitle>Aucune date à afficher</AlertTitle>
          <AlertDescription>
            Planifiez au moins une tâche avec début et fin, ou ajoutez un jalon avec une date
            cible. Vous pouvez créer des tâches ci-dessous.
          </AlertDescription>
        </Alert>
        <div className="border-border/60 overflow-hidden rounded-lg border">
          {toolbar}
          <div className="p-2">
            <ProjectTaskPlanningSection
              ref={planningRef}
              projectId={projectId}
              variant="gantt-sidebar"
              hideToolbar
              milestoneRows={milestoneSidebarRows}
            />
          </div>
        </div>
      </div>
    );
  }

  const { widthPx, monthBands, weekBands, todayPx } = layout;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {unplannedCount > 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <Info className="size-4 text-amber-800 dark:text-amber-600" />
          <AlertTitle className="text-amber-950 dark:text-amber-600">
            Certaines tâches ne sont pas planifiées (sans dates)
          </AlertTitle>
          <AlertDescription className="text-amber-950/90 dark:text-amber-600/90">
            {unplannedCount} tâche{unplannedCount > 1 ? 's' : ''} sans début et fin planifiés
            : visibles dans la grille à gauche, sans barre sur la frise.
          </AlertDescription>
        </Alert>
      )}

      <p className="text-muted-foreground text-xs">
        Frise en lecture seule (MVP) — échelle fixe {GANTT_PX_PER_DAY}px/j. Aide : survol des
        jalons pour la date.
      </p>

      <div className="border-border/60 flex min-h-[min(85vh,900px)] min-w-0 flex-col overflow-hidden rounded-lg border">
        {toolbar}
        <div className="flex min-h-0 flex-1 flex-row overflow-y-auto overflow-x-hidden">
          <div className="border-border/60 flex min-h-0 w-[min(42%,380px)] min-w-[240px] shrink-0 flex-col border-r border-border/60">
            <ProjectTaskPlanningSection
              ref={planningRef}
              projectId={projectId}
              variant="gantt-sidebar"
              hideToolbar
              milestoneRows={milestoneSidebarRows}
            />
          </div>

          <div className="bg-muted/5 min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-visible">
            <div
              className="relative flex flex-col"
              style={{ width: widthPx, minWidth: widthPx }}
            >
              <div
                className="border-border/40 bg-muted/30 sticky top-0 z-20 border-b"
                style={{ width: widthPx }}
              >
                <div
                  className="border-border/40 relative border-b"
                  style={{ height: GANTT_ROW_PX, width: widthPx }}
                >
                  {monthBands.map((b, i) => (
                    <div
                      key={`m-${i}-${b.label}-${b.leftPx}`}
                      className="border-border/50 absolute top-0 bottom-0 flex items-center border-r px-1 text-[10px] font-medium text-muted-foreground"
                      style={{ left: b.leftPx, width: b.widthPx }}
                    >
                      <span className="truncate">{b.label}</span>
                    </div>
                  ))}
                </div>
                <div className="relative" style={{ height: GANTT_ROW_PX, width: widthPx }}>
                  {weekBands.map((b, i) => (
                    <div
                      key={`w-${i}-${b.label}-${b.leftPx}`}
                      className="border-border/30 absolute top-0 bottom-0 flex items-center justify-center border-r px-0.5 text-[9px] text-muted-foreground"
                      style={{ left: b.leftPx, width: b.widthPx }}
                    >
                      {b.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative" style={{ width: widthPx }}>
                <div
                  className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      to right,
                      transparent,
                      transparent ${GANTT_PX_PER_DAY - 1}px,
                      hsl(var(--border) / 0.4) ${GANTT_PX_PER_DAY - 1}px,
                      hsl(var(--border) / 0.4) ${GANTT_PX_PER_DAY}px
                    )`,
                    width: widthPx,
                  }}
                />
                {todayPx !== null && (
                  <div
                    className="bg-primary/60 pointer-events-none absolute top-0 bottom-0 z-[1] w-px"
                    style={{ left: todayPx }}
                  />
                )}

                {treeRows.map((row) => {
                  const eligible =
                    row.plannedStartDate && row.plannedEndDate && bounds;
                  const startMs = eligible
                    ? new Date(row.plannedStartDate!).getTime()
                    : 0;
                  const endMs = eligible ? new Date(row.plannedEndDate!).getTime() : 0;
                  const leftPx = eligible ? dateMsToPx(startMs, bounds, GANTT_PX_PER_DAY) : 0;
                  const barW = eligible
                    ? Math.max(
                        2,
                        dateMsToPx(endMs, bounds, GANTT_PX_PER_DAY) -
                          dateMsToPx(startMs, bounds, GANTT_PX_PER_DAY),
                      )
                    : 0;

                  return (
                    <div
                      key={row.id}
                      className="border-border/40 relative z-[2] shrink-0 border-b"
                      style={{ height: GANTT_ROW_PX, width: widthPx }}
                    >
                      {eligible && (
                        <div
                          className="bg-primary/15 absolute top-2 bottom-2 rounded-sm"
                          style={{
                            left: leftPx,
                            width: barW,
                          }}
                        >
                          <div
                            className="bg-primary/75 h-full rounded-sm"
                            style={{ width: `${Math.min(100, row.progress)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {sortedMilestones.map((m) => {
                  const d = new Date(m.targetDate).getTime();
                  const leftPx = dateMsToPx(d, bounds, GANTT_PX_PER_DAY);
                  return (
                    <div
                      key={m.id}
                      className="border-border/40 relative z-[2] shrink-0 border-b"
                      style={{ height: GANTT_ROW_PX, width: widthPx }}
                    >
                      <div
                        className="bg-amber-500 absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-sm shadow-sm"
                        style={{ left: leftPx }}
                        title={`${m.name} — ${new Date(m.targetDate).toLocaleDateString('fr-FR')}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
