'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { useProjectGanttQuery } from '../hooks/use-project-gantt-query';
import { buildProjectTaskTreeRows } from '../lib/project-task-tree';
import type { ProjectGanttPayload } from '../api/projects.api';
import { Info } from 'lucide-react';

const ROW_PX = 36;
const DAY_MS = 86_400_000;
const MIN_TIMELINE_PX = 640;
const PX_PER_DAY = 4;

type GanttTask = ProjectGanttPayload['tasks'][number];

function computeTimelineBounds(tasks: GanttTask[], milestoneDates: number[]) {
  let min = Infinity;
  let max = -Infinity;
  for (const t of tasks) {
    if (t.plannedStartDate && t.plannedEndDate) {
      const s = new Date(t.plannedStartDate).getTime();
      const e = new Date(t.plannedEndDate).getTime();
      min = Math.min(min, s);
      max = Math.max(max, e);
    }
  }
  for (const d of milestoneDates) {
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const pad = DAY_MS * 2;
  return { min: min - pad, max: max + pad };
}

function positionPercent(
  dateMs: number,
  bounds: { min: number; max: number },
): number {
  const span = bounds.max - bounds.min;
  if (span <= 0) return 0;
  return ((dateMs - bounds.min) / span) * 100;
}

export function ProjectGanttPanel({ projectId }: { projectId: string }) {
  const ganttQuery = useProjectGanttQuery(projectId);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const onLeftScroll = useCallback(() => {
    if (syncing.current) return;
    const l = leftScrollRef.current;
    const r = rightScrollRef.current;
    if (!l || !r) return;
    syncing.current = true;
    r.scrollTop = l.scrollTop;
    syncing.current = false;
  }, []);

  const onRightScroll = useCallback(() => {
    if (syncing.current) return;
    const l = leftScrollRef.current;
    const r = rightScrollRef.current;
    if (!l || !r) return;
    syncing.current = true;
    l.scrollTop = r.scrollTop;
    syncing.current = false;
  }, []);

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

  const bounds = useMemo(() => {
    if (!payload) return null;
    return computeTimelineBounds(payload.tasks, milestoneTimes);
  }, [payload, milestoneTimes]);

  const timelineWidthPx = useMemo(() => {
    if (!bounds) return MIN_TIMELINE_PX;
    const spanDays = (bounds.max - bounds.min) / DAY_MS;
    return Math.max(MIN_TIMELINE_PX, spanDays * PX_PER_DAY);
  }, [bounds]);

  const sortedMilestones = useMemo(() => {
    const m = payload?.milestones ?? [];
    return [...m].sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime() ||
        a.sortOrder - b.sortOrder,
    );
  }, [payload?.milestones]);

  if (ganttQuery.isLoading) {
    return <LoadingState rows={6} />;
  }

  if (ganttQuery.isError || !payload) {
    return (
      <p className="text-destructive text-sm">Impossible de charger le Gantt.</p>
    );
  }

  if (!bounds) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertTitle>Aucune date à afficher</AlertTitle>
        <AlertDescription>
          Planifiez au moins une tâche avec début et fin, ou ajoutez un jalon avec une date
          cible.
        </AlertDescription>
      </Alert>
    );
  }

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
            : visibles à gauche, sans barre sur la frise.
          </AlertDescription>
        </Alert>
      )}

      <div className="text-muted-foreground text-xs">
        Frise basée sur les tâches avec début et fin planifiés, et sur les dates cibles des
        jalons. Lecture seule (MVP).
      </div>

      <div className="border-border/60 flex max-h-[min(80vh,720px)] min-h-[280px] min-w-0 overflow-hidden rounded-lg border">
        <div
          ref={leftScrollRef}
          onScroll={onLeftScroll}
          className="bg-muted/20 max-w-[min(100%,320px)] min-w-[200px] shrink-0 overflow-y-auto overflow-x-hidden border-r border-border/60"
        >
          <div
            className="border-border/40 bg-muted/30 sticky top-0 z-10 border-b px-2 py-2 text-xs font-medium"
            style={{ height: ROW_PX }}
          >
            Tâche / jalon
          </div>
          {treeRows.map((row) => (
            <div
              key={row.id}
              className="border-border/40 flex items-center border-b px-2 text-sm"
              style={{ minHeight: ROW_PX }}
            >
              <span
                className="min-w-0 truncate"
                style={{ paddingLeft: row.depth * 12 }}
                title={row.name}
              >
                {row.name}
              </span>
            </div>
          ))}
          {sortedMilestones.map((m) => (
            <div
              key={m.id}
              className="border-border/40 text-muted-foreground flex items-center border-b px-2 text-sm italic"
              style={{ minHeight: ROW_PX }}
            >
              <span className="min-w-0 truncate" title={m.name}>
                ◆ {m.name}
              </span>
            </div>
          ))}
        </div>

        <div
          ref={rightScrollRef}
          onScroll={onRightScroll}
          className="min-w-0 flex-1 overflow-auto"
        >
          <div style={{ width: timelineWidthPx, minHeight: '100%' }}>
            <div
              className="border-border/40 bg-muted/30 sticky top-0 z-10 border-b"
              style={{ height: ROW_PX }}
            />
            {treeRows.map((row) => {
              const eligible =
                row.plannedStartDate &&
                row.plannedEndDate &&
                bounds;
              const startMs = eligible
                ? new Date(row.plannedStartDate!).getTime()
                : 0;
              const endMs = eligible
                ? new Date(row.plannedEndDate!).getTime()
                : 0;
              const leftPct = eligible
                ? positionPercent(startMs, bounds)
                : 0;
              const widthPct = eligible
                ? Math.max(
                    0.5,
                    positionPercent(endMs, bounds) - positionPercent(startMs, bounds),
                  )
                : 0;

              return (
                <div
                  key={row.id}
                  className="border-border/40 relative border-b"
                  style={{ height: ROW_PX }}
                >
                  {eligible && (
                    <div
                      className="bg-primary/15 absolute top-2 bottom-2 rounded-sm"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      <div
                        className="bg-primary/70 h-full rounded-sm"
                        style={{ width: `${Math.min(100, row.progress)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {sortedMilestones.map((m) => {
              const d = new Date(m.targetDate).getTime();
              const leftPct = positionPercent(d, bounds);
              return (
                <div
                  key={m.id}
                  className="border-border/40 relative border-b"
                  style={{ height: ROW_PX }}
                >
                  <div
                    className="bg-amber-500 absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-sm"
                    style={{ left: `${leftPct}%` }}
                    title={`${m.name} — ${new Date(m.targetDate).toLocaleDateString('fr-FR')}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
