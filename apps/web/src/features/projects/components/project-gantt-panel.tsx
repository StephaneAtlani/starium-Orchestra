'use client';

import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectGanttQuery } from '../hooks/use-project-gantt-query';
import {
  useUpdateProjectMilestoneMutation,
  useUpdateProjectTaskMutation,
} from '../hooks/use-project-planning-mutations';
import {
  buildDependencyPaths,
  rowCenterY,
  type GanttTaskRowGeom,
} from '../lib/gantt-dependency-geometry';
import { buildProjectTaskTreeRows } from '../lib/project-task-tree';
import {
  GANTT_DAY_MS,
  GANTT_MIN_TIMELINE_PX,
  GANTT_PX_PER_DAY,
  GANTT_ROW_PX,
  computeTimelineBounds,
  dateMsToPx,
  dateRangeToTimelineLayout,
  resizeTaskRange,
  shiftTaskRangeByDays,
  toPlannedDateIsoUtcNoon,
  type GanttTimelineScale,
  type TimelineBounds,
} from '../lib/gantt-timeline-layout';
import { TASK_STATUS_LABEL } from '../constants/project-enum-labels';
import { cn } from '@/lib/utils';
import {
  ProjectTaskPlanningSection,
  type ProjectTaskPlanningSectionHandle,
} from './project-task-planning-section';
import { ProjectGanttTaskBar } from './project-gantt-task-bar';
import { Info } from 'lucide-react';
import { toast } from 'sonner';

type BarMode = 'move' | 'resize-start' | 'resize-end';

type TaskDragRef = {
  kind: 'task';
  taskId: string;
  mode: BarMode;
  originStartMs: number;
  originEndMs: number;
  anchorClientX: number;
  anchorScrollLeft: number;
};

type MilestoneDragRef = {
  kind: 'milestone';
  milestoneId: string;
  originTargetMs: number;
  anchorClientX: number;
  anchorScrollLeft: number;
};

type DragRef = TaskDragRef | MilestoneDragRef;

type PreviewState =
  | { type: 'task'; id: string; startMs: number; endMs: number }
  | { type: 'milestone'; id: string; targetMs: number }
  | null;

type LinkDraftRef = { fromTaskId: string; fromX: number; fromY: number };

function deltaPxInTimeline(
  clientX: number,
  scrollEl: HTMLDivElement,
  anchorClientX: number,
  anchorScrollLeft: number,
): number {
  return clientX - anchorClientX + (scrollEl.scrollLeft - anchorScrollLeft);
}

export function ProjectGanttPanel({ projectId }: { projectId: string }) {
  const depMarkerId = useId().replace(/:/g, '');
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const planningRef = useRef<ProjectTaskPlanningSectionHandle>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const ganttVerticalScrollRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragRef | null>(null);
  const linkDraftRef = useRef<LinkDraftRef | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [linkDraft, setLinkDraft] = useState<LinkDraftRef | null>(null);
  const [linkPointer, setLinkPointer] = useState<{ x: number; y: number } | null>(null);
  const [timelineScale, setTimelineScale] = useState<GanttTimelineScale>('day');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | string>('all');
  const [showMilestones, setShowMilestones] = useState(true);
  const [timelineViewportW, setTimelineViewportW] = useState(0);

  const updateTask = useUpdateProjectTaskMutation(projectId);
  const updateMilestone = useUpdateProjectMilestoneMutation(projectId);

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

  const displayTreeRows = useMemo(() => {
    if (taskStatusFilter === 'all') return treeRows;
    return treeRows.filter((r) => r.status === taskStatusFilter);
  }, [treeRows, taskStatusFilter]);

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

  /** Durée affichée (jours) entre min et max de la frise. */
  const spanDays = useMemo(() => {
    if (!bounds) return 0;
    return (bounds.max - bounds.min) / GANTT_DAY_MS;
  }, [bounds]);

  /**
   * Pixels par jour : dérivés de la largeur visible pour que [bounds.min, bounds.max] occupe
   * toute la zone (sauf vue « Jour » = zoom avant avec défilement).
   * Semaine = ajuster à la largeur ; Mois = zoom arrière ; si le résultat est plus étroit que
   * la zone, on étire pour remplir (alignement dates / barres / en-têtes).
   */
  const pxPerDay = useMemo(() => {
    if (!bounds || spanDays <= 0) return GANTT_PX_PER_DAY;
    const vw = Math.max(timelineViewportW, GANTT_MIN_TIMELINE_PX);
    const zoom =
      timelineScale === 'day' ? 1.35 : timelineScale === 'month' ? 0.62 : 1;
    let px = (vw / spanDays) * zoom;
    const contentW = spanDays * px;
    if (contentW < vw) {
      px = vw / spanDays;
    }
    return px;
  }, [bounds, spanDays, timelineViewportW, timelineScale]);

  const layout = useMemo(() => {
    if (!bounds || spanDays <= 0) return null;
    const base = dateRangeToTimelineLayout(bounds, pxPerDay);
    const w = spanDays * pxPerDay;
    return { ...base, widthPx: w };
  }, [bounds, pxPerDay, spanDays]);

  const sortedMilestones = useMemo(() => {
    const m = payload?.milestones ?? [];
    return [...m].sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime() ||
        a.sortOrder - b.sortOrder,
    );
  }, [payload?.milestones]);

  const visibleMilestones = useMemo(
    () => (showMilestones ? sortedMilestones : []),
    [sortedMilestones, showMilestones],
  );

  const milestoneSidebarRows = useMemo(
    () => visibleMilestones.map((m) => ({ id: m.id, name: m.name })),
    [visibleMilestones],
  );

  const resolveTaskDates = useCallback(
    (
      taskId: string,
      plannedStartDate: string | null,
      plannedEndDate: string | null,
    ): { startMs: number; endMs: number } | null => {
      if (preview?.type === 'task' && preview.id === taskId) {
        return { startMs: preview.startMs, endMs: preview.endMs };
      }
      if (plannedStartDate && plannedEndDate) {
        return {
          startMs: new Date(plannedStartDate).getTime(),
          endMs: new Date(plannedEndDate).getTime(),
        };
      }
      return null;
    },
    [preview],
  );

  const resolveMilestoneDate = useCallback(
    (milestoneId: string, targetDate: string): number => {
      if (preview?.type === 'milestone' && preview.id === milestoneId) {
        return preview.targetMs;
      }
      return new Date(targetDate).getTime();
    },
    [preview],
  );

  const taskRowGeoms = useMemo((): GanttTaskRowGeom[] => {
    if (!bounds) return [];
    return displayTreeRows
      .map((row, rowIndex) => {
        const dates = resolveTaskDates(
          row.id,
          row.plannedStartDate,
          row.plannedEndDate,
        );
        if (!dates) return null;
        const leftPx = dateMsToPx(dates.startMs, bounds, pxPerDay);
        const barW = Math.max(
          2,
          dateMsToPx(dates.endMs, bounds, pxPerDay) - leftPx,
        );
        return {
          taskId: row.id,
          rowIndex,
          leftPx,
          barW,
          startMs: dates.startMs,
          endMs: dates.endMs,
          dependsOnTaskId: row.dependsOnTaskId ?? null,
          dependencyType: row.dependencyType ?? null,
        } satisfies GanttTaskRowGeom;
      })
      .filter((r): r is GanttTaskRowGeom => r !== null);
  }, [displayTreeRows, bounds, resolveTaskDates, pxPerDay]);

  const dependencyPaths = useMemo(
    () => buildDependencyPaths(taskRowGeoms, GANTT_ROW_PX),
    [taskRowGeoms],
  );

  const timelineBodyHeightPx =
    (displayTreeRows.length + visibleMilestones.length) * GANTT_ROW_PX;

  const beginLinkOut = useCallback(
    (fromTaskId: string, e: React.PointerEvent) => {
      if (!canEdit || !bounds) return;
      const row = displayTreeRows.find((r) => r.id === fromTaskId);
      if (!row) return;
      const dates = resolveTaskDates(
        row.id,
        row.plannedStartDate,
        row.plannedEndDate,
      );
      if (!dates) return;
      const rowIndex = displayTreeRows.findIndex((r) => r.id === fromTaskId);
      const fromX = dateMsToPx(dates.endMs, bounds, pxPerDay);
      const fromY = rowCenterY(rowIndex, GANTT_ROW_PX);
      const draft: LinkDraftRef = { fromTaskId, fromX, fromY };
      linkDraftRef.current = draft;
      setLinkDraft(draft);
      setLinkPointer({ x: fromX, y: fromY });
      e.preventDefault();

      const bodyEl = timelineBodyRef.current;
      const scrollH = timelineScrollRef.current;

      const toLocal = (ev: PointerEvent) => {
        if (!bodyEl || !scrollH) return { x: draft.fromX, y: draft.fromY };
        const r = bodyEl.getBoundingClientRect();
        return {
          x: ev.clientX - r.left + scrollH.scrollLeft,
          y: ev.clientY - r.top,
        };
      };

      const onMove = (ev: PointerEvent) => {
        setLinkPointer(toLocal(ev));
      };

      const onUp = (ev: PointerEvent) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        const d = linkDraftRef.current;
        linkDraftRef.current = null;
        setLinkDraft(null);
        setLinkPointer(null);
        if (!d) return;
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const linkIn = el?.closest?.('[data-gantt-link-in]') as HTMLElement | null;
        const succId = linkIn?.dataset.taskId;
        if (!succId || succId === d.fromTaskId) return;
        updateTask.mutate(
          {
            taskId: succId,
            body: {
              dependsOnTaskId: d.fromTaskId,
              dependencyType: 'FINISH_TO_START',
            },
            silentToast: true,
          },
          {
            onSuccess: () => {
              toast.success('Dépendance enregistrée');
            },
          },
        );
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [canEdit, bounds, displayTreeRows, resolveTaskDates, updateTask, pxPerDay],
  );

  const beginTaskDrag = useCallback(
    (
      row: (typeof displayTreeRows)[number],
      mode: BarMode,
      e: React.PointerEvent,
    ) => {
      if (!canEdit || !row.plannedStartDate || !row.plannedEndDate) return;
      const scrollEl = timelineScrollRef.current;
      if (!scrollEl) return;

      const originStartMs = new Date(row.plannedStartDate).getTime();
      const originEndMs = new Date(row.plannedEndDate).getTime();

      dragRef.current = {
        kind: 'task',
        taskId: row.id,
        mode,
        originStartMs,
        originEndMs,
        anchorClientX: e.clientX,
        anchorScrollLeft: scrollEl.scrollLeft,
      };
      setPreview({
        type: 'task',
        id: row.id,
        startMs: originStartMs,
        endMs: originEndMs,
      });
      e.preventDefault();

      const computeTaskRange = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d || d.kind !== 'task') return null;
        const deltaPx = deltaPxInTimeline(
          ev.clientX,
          scrollEl,
          d.anchorClientX,
          d.anchorScrollLeft,
        );
        const deltaDays = Math.round(deltaPx / pxPerDay);
        if (d.mode === 'move') {
          return shiftTaskRangeByDays(d.originStartMs, d.originEndMs, deltaDays);
        }
        if (d.mode === 'resize-start') {
          return resizeTaskRange(
            d.originStartMs,
            d.originEndMs,
            'resize-start',
            deltaDays,
          );
        }
        return resizeTaskRange(d.originStartMs, d.originEndMs, 'resize-end', deltaDays);
      };

      const onMove = (ev: PointerEvent) => {
        const next = computeTaskRange(ev);
        if (!next) return;
        const d = dragRef.current;
        if (!d || d.kind !== 'task') return;
        setPreview({
          type: 'task',
          id: d.taskId,
          startMs: next.startMs,
          endMs: next.endMs,
        });
      };

      const onUp = (ev: PointerEvent) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        const next = computeTaskRange(ev);
        const d = dragRef.current;
        dragRef.current = null;
        setPreview(null);
        if (!next || !d || d.kind !== 'task') return;
        if (next.startMs === d.originStartMs && next.endMs === d.originEndMs) return;
        updateTask.mutate({
          taskId: d.taskId,
          body: {
            plannedStartDate: toPlannedDateIsoUtcNoon(next.startMs),
            plannedEndDate: toPlannedDateIsoUtcNoon(next.endMs),
          },
          silentToast: true,
        });
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [canEdit, updateTask, pxPerDay],
  );

  const beginMilestoneDrag = useCallback(
    (milestone: (typeof visibleMilestones)[number], e: React.PointerEvent) => {
      if (!canEdit) return;
      const scrollEl = timelineScrollRef.current;
      if (!scrollEl) return;

      const originTargetMs = new Date(milestone.targetDate).getTime();
      dragRef.current = {
        kind: 'milestone',
        milestoneId: milestone.id,
        originTargetMs,
        anchorClientX: e.clientX,
        anchorScrollLeft: scrollEl.scrollLeft,
      };
      setPreview({ type: 'milestone', id: milestone.id, targetMs: originTargetMs });
      e.preventDefault();

      const computeTarget = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d || d.kind !== 'milestone') return null;
        const deltaPx = deltaPxInTimeline(
          ev.clientX,
          scrollEl,
          d.anchorClientX,
          d.anchorScrollLeft,
        );
        const deltaDays = Math.round(deltaPx / pxPerDay);
        return d.originTargetMs + deltaDays * GANTT_DAY_MS;
      };

      const onMove = (ev: PointerEvent) => {
        const targetMs = computeTarget(ev);
        const d = dragRef.current;
        if (targetMs === null || !d || d.kind !== 'milestone') return;
        setPreview({ type: 'milestone', id: d.milestoneId, targetMs });
      };

      const onUp = (ev: PointerEvent) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        const targetMs = computeTarget(ev);
        const d = dragRef.current;
        dragRef.current = null;
        setPreview(null);
        if (targetMs === null || !d || d.kind !== 'milestone') return;
        if (targetMs === d.originTargetMs) return;
        updateMilestone.mutate({
          milestoneId: d.milestoneId,
          body: { targetDate: toPlannedDateIsoUtcNoon(targetMs) },
          silentToast: true,
        });
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [canEdit, updateMilestone, pxPerDay],
  );

  /** Largeur utile de la zone frise : au minimum la zone scrollable visible (évite un bandeau mois/semaines coincé à 640px). */
  useLayoutEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) {
      setTimelineViewportW(0);
      return;
    }
    const ro = new ResizeObserver(() => {
      setTimelineViewportW(el.clientWidth);
    });
    ro.observe(el);
    setTimelineViewportW(el.clientWidth);
    return () => ro.disconnect();
  }, [bounds]);

  if (ganttQuery.isLoading) {
    return <LoadingState rows={6} />;
  }

  if (ganttQuery.isError || !payload) {
    return (
      <p className="text-destructive text-sm">Impossible de charger le Gantt.</p>
    );
  }

  const scaleLabels: Record<GanttTimelineScale, string> = {
    day: 'Jour',
    week: 'Semaine',
    month: 'Mois',
  };

  const toolbar = (
    <div className="bg-muted/30 flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/60 px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">Échelle</span>
          <div className="bg-background/80 inline-flex rounded-md border p-0.5 shadow-sm">
            {(['day', 'week', 'month'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                  timelineScale === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
                onClick={() => setTimelineScale(s)}
              >
                {scaleLabels[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">État</span>
          <select
            className="border-input bg-background h-8 max-w-[9rem] rounded-md border px-2 text-[11px]"
            value={taskStatusFilter}
            onChange={(e) => setTaskStatusFilter(e.target.value)}
          >
            <option value="all">Tous</option>
            {Object.keys(TASK_STATUS_LABEL).map((k) => (
              <option key={k} value={k}>
                {TASK_STATUS_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="border-input size-3.5 rounded"
            checked={showMilestones}
            onChange={(e) => setShowMilestones(e.target.checked)}
          />
          <span className="text-muted-foreground">Jalons</span>
        </label>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-muted-foreground hidden text-[10px] sm:inline">
          {pxPerDay.toFixed(2)} px/j · mois + semaines en tête
        </span>
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
              ganttTaskStatusFilter={taskStatusFilter}
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

      <div className="border-border/60 flex min-h-[min(85vh,900px)] min-w-0 flex-col overflow-hidden rounded-lg border">
        {toolbar}
        <div
          ref={ganttVerticalScrollRef}
          className="flex min-h-0 flex-1 flex-row overflow-y-auto overflow-x-hidden"
        >
          <div className="border-border/60 flex min-h-0 w-[min(42%,380px)] min-w-[240px] shrink-0 flex-col border-r border-border/60">
            <ProjectTaskPlanningSection
              ref={planningRef}
              projectId={projectId}
              variant="gantt-sidebar"
              hideToolbar
              milestoneRows={milestoneSidebarRows}
              ganttTaskStatusFilter={taskStatusFilter}
            />
          </div>

          <div
            ref={timelineScrollRef}
            className="bg-muted/5 min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-visible"
          >
            <div
              className="relative flex min-w-full flex-col"
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

              <div
                ref={timelineBodyRef}
                className="relative"
                style={{ width: widthPx, minHeight: timelineBodyHeightPx }}
              >
                <svg
                  className="text-muted-foreground pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
                  aria-hidden
                >
                  <defs>
                    <marker
                      id={depMarkerId}
                      markerWidth="8"
                      markerHeight="8"
                      refX="0"
                      refY="4"
                      orient="auto"
                      markerUnits="userSpaceOnUse"
                    >
                      <path d="M0,0 L8,4 L0,8 z" className="fill-muted-foreground" />
                    </marker>
                  </defs>
                  {dependencyPaths.map((p) => (
                    <path
                      key={p.id}
                      d={p.path}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.25}
                      strokeOpacity={0.9}
                      markerEnd={`url(#${depMarkerId})`}
                    />
                  ))}
                  {linkDraft && linkPointer && (
                    <line
                      x1={linkDraft.fromX}
                      y1={linkDraft.fromY}
                      x2={linkPointer.x}
                      y2={linkPointer.y}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      strokeOpacity={0.95}
                    />
                  )}
                </svg>
                <div
                  className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      to right,
                      transparent,
                      transparent ${Math.max(0, pxPerDay - 1)}px,
                      hsl(var(--border) / 0.4) ${Math.max(0, pxPerDay - 1)}px,
                      hsl(var(--border) / 0.4) ${pxPerDay}px
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

                {displayTreeRows.map((row) => {
                  const eligible =
                    row.plannedStartDate && row.plannedEndDate && bounds;
                  const dates = resolveTaskDates(
                    row.id,
                    row.plannedStartDate,
                    row.plannedEndDate,
                  );
                  const startMs = dates?.startMs ?? 0;
                  const endMs = dates?.endMs ?? 0;
                  const leftPx = eligible && dates
                    ? dateMsToPx(startMs, bounds, pxPerDay)
                    : 0;
                  const barW = eligible && dates
                    ? Math.max(
                        2,
                        dateMsToPx(endMs, bounds, pxPerDay) -
                          dateMsToPx(startMs, bounds, pxPerDay),
                      )
                    : 0;

                  return (
                    <div
                      key={row.id}
                      className="border-border/40 relative z-[2] shrink-0 border-b"
                      style={{ height: GANTT_ROW_PX, width: widthPx }}
                    >
                      {eligible && dates && (
                        <ProjectGanttTaskBar
                          taskId={row.id}
                          leftPx={leftPx}
                          barW={barW}
                          progress={row.progress}
                          canEdit={canEdit}
                          title={row.name}
                          showLinkPorts={canEdit}
                          onPointerDownBar={(mode, ev) => beginTaskDrag(row, mode, ev)}
                          onLinkOutPointerDown={(ev) => beginLinkOut(row.id, ev)}
                        />
                      )}
                    </div>
                  );
                })}

                {visibleMilestones.map((m) => {
                  const tMs = resolveMilestoneDate(m.id, m.targetDate);
                  const leftPx = dateMsToPx(tMs, bounds, pxPerDay);
                  return (
                    <div
                      key={m.id}
                      className="border-border/40 relative z-[2] shrink-0 border-b"
                      style={{ height: GANTT_ROW_PX, width: widthPx }}
                    >
                      <div
                        className={
                          canEdit
                            ? 'bg-amber-500 absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-sm shadow-sm hover:bg-amber-400 cursor-grab touch-none active:cursor-grabbing'
                            : 'bg-amber-500 pointer-events-none absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-sm shadow-sm'
                        }
                        style={{ left: leftPx }}
                        title={`${m.name} — ${new Date(tMs).toLocaleDateString('fr-FR')}`}
                        onPointerDown={
                          canEdit ? (e) => beginMilestoneDrag(m, e) : undefined
                        }
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
