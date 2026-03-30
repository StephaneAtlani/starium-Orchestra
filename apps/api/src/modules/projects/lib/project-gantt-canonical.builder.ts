import type {
  Project,
  ProjectMilestone,
  ProjectTask,
  ProjectTaskPhase,
} from '@prisma/client';
import { buildSanitizedDependsOnMap } from './project-gantt-dependencies.util';
import { computeIsLateMilestone, computeIsLateTask } from './project-gantt-is-late.util';

export type GanttTaskPayloadDto = {
  id: string;
  phaseId: string | null;
  dependsOnTaskId: string | null;
  dependencyType: string | null;
  name: string;
  /** Texte libre — aligné formulaire planning / fiche tâche. */
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  sortOrder: number;
  createdAt: string;
  isLate: boolean;
};

export type CanonicalGanttPayload = {
  project: {
    id: string;
    name: string;
    status: string;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    /** Objectif métier (pourquoi) — texte libre fiche projet. */
    businessProblem: string | null;
  };
  phases: Array<{
    id: string;
    name: string;
    sortOrder: number;
    derivedStartDate: string | null;
    derivedEndDate: string | null;
    derivedDurationDays: number | null;
    derivedProgress: number | null;
    tasks: GanttTaskPayloadDto[];
  }>;
  ungroupedTasks: GanttTaskPayloadDto[];
  milestones: Array<{
    id: string;
    name: string;
    status: string;
    targetDate: string;
    linkedTaskId: string | null;
    phaseId: string | null;
    sortOrder: number;
    isLate: boolean;
  }>;
};

function computeDerived(phaseTasks: ProjectTask[]) {
  if (phaseTasks.length === 0) {
    return {
      derivedStartDate: null as string | null,
      derivedEndDate: null as string | null,
      derivedDurationDays: null as number | null,
      derivedProgress: null as number | null,
    };
  }
  let minStart: number | null = null;
  let maxEnd: number | null = null;
  let sumProgress = 0;
  for (const t of phaseTasks) {
    sumProgress += t.progress ?? 0;
    if (t.plannedStartDate) {
      const s = t.plannedStartDate.getTime();
      minStart = minStart === null ? s : Math.min(minStart, s);
    }
    if (t.plannedEndDate) {
      const e = t.plannedEndDate.getTime();
      maxEnd = maxEnd === null ? e : Math.max(maxEnd, e);
    }
  }
  const derivedDurationDays =
    minStart !== null && maxEnd !== null
      ? Math.max(0, Math.ceil((maxEnd - minStart) / 86400000))
      : null;
  return {
    derivedStartDate: minStart !== null ? new Date(minStart).toISOString() : null,
    derivedEndDate: maxEnd !== null ? new Date(maxEnd).toISOString() : null,
    derivedDurationDays,
    derivedProgress: Math.max(
      0,
      Math.min(100, Math.round(sumProgress / phaseTasks.length)),
    ),
  };
}

/** Exporté pour réponse legacy `tasks` (ordre Prisma) — même mapping que les tâches canoniques. */
export function mapProjectTaskToGanttDto(
  t: ProjectTask,
  sanitizedDep: string | null,
  now: Date,
): GanttTaskPayloadDto {
  return {
    id: t.id,
    phaseId: t.phaseId,
    dependsOnTaskId: sanitizedDep,
    dependencyType: t.dependencyType,
    name: t.name,
    description: t.description?.trim() ? t.description.trim() : null,
    status: t.status,
    priority: t.priority,
    progress: t.progress,
    plannedStartDate: t.plannedStartDate?.toISOString() ?? null,
    plannedEndDate: t.plannedEndDate?.toISOString() ?? null,
    actualStartDate: t.actualStartDate?.toISOString() ?? null,
    actualEndDate: t.actualEndDate?.toISOString() ?? null,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
    isLate: computeIsLateTask(
      { status: t.status, plannedEndDate: t.plannedEndDate },
      now,
    ),
  };
}

/**
 * Seul point de construction de la structure canonique { project, phases, ungroupedTasks, milestones }.
 */
export function buildCanonicalGanttPayload(
  project: Pick<
    Project,
    'id' | 'name' | 'status' | 'startDate' | 'targetEndDate' | 'businessProblem'
  >,
  phases: ProjectTaskPhase[],
  tasks: ProjectTask[],
  milestones: ProjectMilestone[],
  now: Date = new Date(),
): CanonicalGanttPayload {
  const taskByPhase = new Map<string, ProjectTask[]>();
  const ungrouped: ProjectTask[] = [];
  for (const task of tasks) {
    if (!task.phaseId) {
      ungrouped.push(task);
      continue;
    }
    const list = taskByPhase.get(task.phaseId) ?? [];
    list.push(task);
    taskByPhase.set(task.phaseId, list);
  }

  const depMap = buildSanitizedDependsOnMap(tasks);

  const mapList = (list: ProjectTask[]) =>
    list.map((t) => mapProjectTaskToGanttDto(t, depMap.get(t.id) ?? null, now));

  const phasesOut = phases.map((phase) => {
    const phaseTasks = taskByPhase.get(phase.id) ?? [];
    const derived = computeDerived(phaseTasks);
    return {
      id: phase.id,
      name: phase.name,
      sortOrder: phase.sortOrder,
      ...derived,
      tasks: mapList(phaseTasks),
    };
  });

  const milestonesOut = milestones.map((m) => ({
    id: m.id,
    name: m.name,
    status: m.status,
    targetDate: m.targetDate.toISOString(),
    linkedTaskId: m.linkedTaskId,
    phaseId: m.phaseId,
    sortOrder: m.sortOrder,
    isLate: computeIsLateMilestone(
      { status: m.status, targetDate: m.targetDate },
      now,
    ),
  }));

  const bp = project.businessProblem?.trim();
  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      plannedStartDate: project.startDate?.toISOString() ?? null,
      plannedEndDate: project.targetEndDate?.toISOString() ?? null,
      businessProblem: bp ? bp : null,
    },
    phases: phasesOut,
    ungroupedTasks: mapList(ungrouped),
    milestones: milestonesOut,
  };
}
