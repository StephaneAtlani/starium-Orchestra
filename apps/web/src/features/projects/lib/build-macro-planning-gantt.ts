import type { ProjectMilestoneApi, ProjectTaskApi } from '../types/project.types';
import {
  computeTimelineBounds,
  GANTT_DAY_MS,
  msToTimelinePercent,
  type TimelineBounds,
} from './gantt-timeline-layout';

export type MacroPlanningPhaseOption = {
  id: string;
  name: string;
  sortOrder: number;
};

export const MACRO_PHASE_COLORS = [
  'var(--state-info)',
  'var(--purple)',
  'var(--state-success)',
  'var(--brand-gold)',
  'var(--teal)',
  'var(--brand-gold-700)',
] as const;

export type MacroPlanningPhaseRow = {
  phaseId: string | null;
  name: string;
  color: string;
  taskCount: number;
  milestoneCount: number;
  startMs: number | null;
  endMs: number | null;
  subLabel: string | null;
  subStartMs: number | null;
  subEndMs: number | null;
};

export type MacroPlanningMilestoneMarker = {
  id: string;
  name: string;
  targetMs: number;
  phaseId: string | null;
  status: string;
  color: string;
};

function collectTaskRangeMs(task: ProjectTaskApi): { startMs: number; endMs: number } | null {
  const start = task.plannedStartDate
    ? new Date(task.plannedStartDate).getTime()
    : null;
  const end = task.plannedEndDate
    ? new Date(task.plannedEndDate).getTime()
    : start;
  if (start == null || end == null || Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return { startMs: Math.min(start, end), endMs: Math.max(start, end) };
}

function mergeRanges(
  ranges: Array<{ startMs: number; endMs: number }>,
): { startMs: number | null; endMs: number | null } {
  if (ranges.length === 0) return { startMs: null, endMs: null };
  let min = Infinity;
  let max = -Infinity;
  for (const r of ranges) {
    min = Math.min(min, r.startMs);
    max = Math.max(max, r.endMs);
  }
  return { startMs: min, endMs: max };
}

function pickSubTask(tasks: ProjectTaskApi[]): ProjectTaskApi | null {
  const dated = tasks
    .map((t) => ({ task: t, range: collectTaskRangeMs(t) }))
    .filter((x): x is { task: ProjectTaskApi; range: { startMs: number; endMs: number } } =>
      Boolean(x.range),
    )
    .sort((a, b) => {
      if (a.task.sortOrder !== b.task.sortOrder) return a.task.sortOrder - b.task.sortOrder;
      return a.range.startMs - b.range.startMs;
    });
  return dated[0]?.task ?? null;
}

export function buildMacroPlanningPhaseRows(
  phases: MacroPlanningPhaseOption[],
  tasks: ProjectTaskApi[],
  milestones: ProjectMilestoneApi[],
): MacroPlanningPhaseRow[] {
  const knownPhaseIds = new Set(phases.map((p) => p.id));
  const tasksByPhase = new Map<string | null, ProjectTaskApi[]>();
  const milestonesByPhase = new Map<string | null, ProjectMilestoneApi[]>();

  for (const task of tasks) {
    const rawKey = task.phaseId ?? null;
    const key = rawKey !== null && !knownPhaseIds.has(rawKey) ? null : rawKey;
    const list = tasksByPhase.get(key) ?? [];
    list.push(task);
    tasksByPhase.set(key, list);
  }

  for (const milestone of milestones) {
    const rawKey = milestone.phaseId ?? null;
    const key = rawKey !== null && !knownPhaseIds.has(rawKey) ? null : rawKey;
    const list = milestonesByPhase.get(key) ?? [];
    list.push(milestone);
    milestonesByPhase.set(key, list);
  }

  const rows: MacroPlanningPhaseRow[] = [...phases]
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fr'),
    )
    .map((phase, index) => {
      const phaseTasks = tasksByPhase.get(phase.id) ?? [];
      const phaseMilestones = milestonesByPhase.get(phase.id) ?? [];
      const taskRanges = phaseTasks
        .map(collectTaskRangeMs)
        .filter((r): r is { startMs: number; endMs: number } => Boolean(r));
      const milestoneRanges = phaseMilestones.map((m) => ({
        startMs: new Date(m.targetDate).getTime(),
        endMs: new Date(m.targetDate).getTime(),
      }));
      const merged = mergeRanges([...taskRanges, ...milestoneRanges]);
      const subTask = pickSubTask(phaseTasks);
      const subRange = subTask ? collectTaskRangeMs(subTask) : null;

      return {
        phaseId: phase.id,
        name: phase.name,
        color: MACRO_PHASE_COLORS[index % MACRO_PHASE_COLORS.length],
        taskCount: phaseTasks.length,
        milestoneCount: phaseMilestones.length,
        startMs: merged.startMs,
        endMs: merged.endMs,
        subLabel: subTask?.name ?? phaseMilestones[0]?.name ?? null,
        subStartMs: subRange?.startMs ?? null,
        subEndMs: subRange?.endMs ?? null,
      };
    });

  const ungroupedTasks = tasksByPhase.get(null) ?? [];
  const ungroupedMilestones = milestonesByPhase.get(null) ?? [];
  if (ungroupedTasks.length > 0 || ungroupedMilestones.length > 0) {
    const taskRanges = ungroupedTasks
      .map(collectTaskRangeMs)
      .filter((r): r is { startMs: number; endMs: number } => Boolean(r));
    const milestoneRanges = ungroupedMilestones.map((m) => ({
      startMs: new Date(m.targetDate).getTime(),
      endMs: new Date(m.targetDate).getTime(),
    }));
    const merged = mergeRanges([...taskRanges, ...milestoneRanges]);
    const subTask = pickSubTask(ungroupedTasks);
    const subRange = subTask ? collectTaskRangeMs(subTask) : null;
    rows.push({
      phaseId: null,
      name: 'Sans libellé de phase',
      color: 'var(--neutral-500)',
      taskCount: ungroupedTasks.length,
      milestoneCount: ungroupedMilestones.length,
      startMs: merged.startMs,
      endMs: merged.endMs,
      subLabel: subTask?.name ?? ungroupedMilestones[0]?.name ?? null,
      subStartMs: subRange?.startMs ?? null,
      subEndMs: subRange?.endMs ?? null,
    });
  }

  return rows;
}

export function buildMacroPlanningMilestoneMarkers(
  phases: MacroPlanningPhaseOption[],
  milestones: ProjectMilestoneApi[],
): MacroPlanningMilestoneMarker[] {
  const colorByPhase = new Map<string | null, string>();
  phases.forEach((phase, index) => {
    colorByPhase.set(phase.id, MACRO_PHASE_COLORS[index % MACRO_PHASE_COLORS.length]);
  });
  colorByPhase.set(null, 'var(--brand-ink)');

  return [...milestones]
    .sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    )
    .map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      targetMs: new Date(milestone.targetDate).getTime(),
      phaseId: milestone.phaseId,
      status: milestone.status,
      color: colorByPhase.get(milestone.phaseId ?? null) ?? 'var(--brand-ink)',
    }));
}

export function computeMacroPlanningBounds(
  phaseRows: MacroPlanningPhaseRow[],
  milestones: MacroPlanningMilestoneMarker[],
  projectStartDate?: string | null,
  projectTargetEndDate?: string | null,
): TimelineBounds | null {
  const taskLike = phaseRows.flatMap((row) => {
    if (row.startMs == null || row.endMs == null) return [];
    return [
      {
        plannedStartDate: new Date(row.startMs).toISOString(),
        plannedEndDate: new Date(row.endMs).toISOString(),
      },
    ];
  });

  const milestoneDatesMs = milestones.map((m) => m.targetMs);

  if (projectStartDate) {
    const ms = new Date(projectStartDate).getTime();
    if (!Number.isNaN(ms)) milestoneDatesMs.push(ms);
  }
  if (projectTargetEndDate) {
    const ms = new Date(projectTargetEndDate).getTime();
    if (!Number.isNaN(ms)) milestoneDatesMs.push(ms);
  }

  return computeTimelineBounds(taskLike, milestoneDatesMs);
}

const MACRO_VIEWPORT_WEEKS: Record<'week' | 'month', number> = {
  week: 12,
  month: 24,
};

export const MACRO_PAN_STEP_DAYS = 7;

const MACRO_PAD_BEFORE_MS = 3 * GANTT_DAY_MS;
const MACRO_PAD_AFTER_MS = 7 * GANTT_DAY_MS;

function getMacroPlanningContentRange(
  phaseRows: MacroPlanningPhaseRow[],
  milestones: MacroPlanningMilestoneMarker[],
): { rangeStart: number; rangeEnd: number } | null {
  const firstMs = getMacroPlanningFirstContentMs(phaseRows, milestones);
  if (firstMs == null) return null;
  const lastMs = getMacroPlanningLastContentMs(phaseRows, milestones) ?? firstMs;
  return {
    rangeStart: firstMs - MACRO_PAD_BEFORE_MS,
    rangeEnd: lastMs + MACRO_PAD_AFTER_MS,
  };
}

function macroWindowMs(scale: 'week' | 'month'): number {
  return MACRO_VIEWPORT_WEEKS[scale] * 7 * GANTT_DAY_MS;
}

/** Nombre maximal de pas « période suivante » depuis l’ancrage initial. */
export function getMacroPlanningMaxPanStep(
  phaseRows: MacroPlanningPhaseRow[],
  milestones: MacroPlanningMilestoneMarker[],
  scale: 'week' | 'month',
): number {
  const range = getMacroPlanningContentRange(phaseRows, milestones);
  if (!range) return 0;

  const windowMs = macroWindowMs(scale);
  const maxStart = Math.max(range.rangeStart, range.rangeEnd - windowMs);
  const stepMs = MACRO_PAN_STEP_DAYS * GANTT_DAY_MS;

  if (maxStart <= range.rangeStart) return 0;
  const offset = maxStart - range.rangeStart;
  return Math.max(0, Math.ceil(offset / stepMs));
}

function macroPanMinForStep(
  rangeStart: number,
  maxStart: number,
  stepMs: number,
  panStep: number,
  maxStep: number,
): number {
  const clampedStep = Math.min(Math.max(0, panStep), maxStep);
  if (maxStep > 0 && clampedStep >= maxStep) {
    return maxStart;
  }
  return Math.min(rangeStart + clampedStep * stepMs, maxStart);
}

/**
 * Fenêtre temporelle macro à un pas de navigation donné.
 * Chaque pas avance d’exactement MACRO_PAN_STEP_DAYS jusqu’à la fin du contenu.
 */
export function computeMacroPlanningWindowBounds(
  phaseRows: MacroPlanningPhaseRow[],
  milestones: MacroPlanningMilestoneMarker[],
  scale: 'week' | 'month',
  panStep = 0,
): TimelineBounds | null {
  const firstMs = getMacroPlanningFirstContentMs(phaseRows, milestones);
  if (firstMs == null) {
    return computeMacroPlanningBounds(phaseRows, milestones, null, null);
  }

  const range = getMacroPlanningContentRange(phaseRows, milestones);
  if (!range) return null;

  const windowMs = macroWindowMs(scale);
  const stepMs = MACRO_PAN_STEP_DAYS * GANTT_DAY_MS;
  const maxStart = Math.max(range.rangeStart, range.rangeEnd - windowMs);
  const maxStep = getMacroPlanningMaxPanStep(phaseRows, milestones, scale);
  const min = macroPanMinForStep(
    range.rangeStart,
    maxStart,
    stepMs,
    panStep,
    maxStep,
  );
  return { min, max: min + windowMs };
}

/** Pas de navigation qui affiche une date cible dans la fenêtre (ex. aujourd’hui). */
export function findMacroPlanningPanStepForMs(
  phaseRows: MacroPlanningPhaseRow[],
  milestones: MacroPlanningMilestoneMarker[],
  scale: 'week' | 'month',
  targetMs: number,
): number {
  const maxStep = getMacroPlanningMaxPanStep(phaseRows, milestones, scale);
  for (let step = 0; step <= maxStep; step++) {
    const bounds = computeMacroPlanningWindowBounds(
      phaseRows,
      milestones,
      scale,
      step,
    );
    if (bounds && targetMs >= bounds.min && targetMs <= bounds.max) {
      return step;
    }
  }
  const endBounds = computeMacroPlanningWindowBounds(
    phaseRows,
    milestones,
    scale,
    maxStep,
  );
  if (endBounds && targetMs > endBounds.max) return maxStep;
  return 0;
}

/** @deprecated Utiliser computeMacroPlanningWindowBounds(..., 0) */
export function computeMacroPlanningViewportBounds(
  phaseRows: MacroPlanningPhaseRow[],
  milestones: MacroPlanningMilestoneMarker[],
  scale: 'week' | 'month',
): TimelineBounds | null {
  return computeMacroPlanningWindowBounds(phaseRows, milestones, scale, 0);
}

export function getMacroPlanningFirstContentMs(
  phaseRows: MacroPlanningPhaseRow[],
  milestones: MacroPlanningMilestoneMarker[],
): number | null {
  const starts: number[] = [];
  for (const row of phaseRows) {
    if (row.startMs != null) starts.push(row.startMs);
    if (row.subStartMs != null) starts.push(row.subStartMs);
  }
  for (const marker of milestones) starts.push(marker.targetMs);
  if (starts.length === 0) return null;
  return Math.min(...starts);
}

/** Dernier instant daté pour borner la fenêtre si le contenu dépasse le zoom par défaut. */
function getMacroPlanningLastContentMs(
  phaseRows: MacroPlanningPhaseRow[],
  milestones: MacroPlanningMilestoneMarker[],
): number | null {
  const ends: number[] = [];
  for (const row of phaseRows) {
    if (row.endMs != null) ends.push(row.endMs);
    if (row.subEndMs != null) ends.push(row.subEndMs);
  }
  for (const marker of milestones) ends.push(marker.targetMs);
  if (ends.length === 0) return null;
  return Math.max(...ends);
}

/** Premier instant daté (phase ou jalon) pour l’ancrage du zoom initial. */
export function getMacroPlanningTodayPercent(bounds: TimelineBounds): number {
  return Math.min(100, Math.max(0, msToTimelinePercent(Date.now(), bounds)));
}

export function shiftTimelineBounds(
  bounds: TimelineBounds,
  deltaDays: number,
): TimelineBounds {
  const delta = deltaDays * GANTT_DAY_MS;
  return { min: bounds.min + delta, max: bounds.max + delta };
}

export function formatDaysUntilFr(iso: string): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return '';
  const diff = Math.ceil((target.getTime() - Date.now()) / GANTT_DAY_MS);
  if (diff < 0) return `il y a ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? 's' : ''}`;
  if (diff === 0) return "aujourd'hui";
  return `dans ${diff} jour${diff > 1 ? 's' : ''}`;
}
