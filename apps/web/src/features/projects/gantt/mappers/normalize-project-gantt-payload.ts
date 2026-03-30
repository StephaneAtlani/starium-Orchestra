import type { ProjectGanttPayload } from '../../api/projects.api';
import type { NormalizedProjectGanttPayload } from '../types/normalized-project-gantt.types';

/**
 * Point unique de normalisation brut API → entrée mapper.
 * Gère rétrocompat : `project` absent, `isLate` optionnel.
 */
export function normalizeProjectGanttPayload(
  raw: ProjectGanttPayload,
): NormalizedProjectGanttPayload {
  const project = raw.project ?? {
    id: raw.projectId,
    name: '',
    status: 'UNKNOWN',
    plannedStartDate: null,
    plannedEndDate: null,
  };

  const taskFlags = <T extends { isLate?: boolean }>(t: T) => ({
    ...t,
    isLate: Boolean(t.isLate),
  });

  return {
    ...raw,
    project,
    phases: raw.phases.map((p) => ({
      ...p,
      tasks: p.tasks.map(taskFlags),
    })),
    tasks: raw.tasks.map(taskFlags),
    ungroupedTasks: raw.ungroupedTasks.map(taskFlags),
    milestones: raw.milestones.map((m) => ({
      ...m,
      isLate: Boolean(m.isLate),
    })),
  };
}
