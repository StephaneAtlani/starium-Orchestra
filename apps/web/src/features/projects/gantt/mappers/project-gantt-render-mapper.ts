import type { NormalizedProjectGanttPayload } from '../types/normalized-project-gantt.types';
import {
  type GanttPhaseOption,
  type MilestoneForGanttBody,
  orderedTasksFromGanttPayload,
} from '../../lib/build-gantt-body-rows';
import type { ProjectTaskApi } from '../../types/project.types';

export type ProjectGanttRenderModel = {
  phaseOptions: GanttPhaseOption[];
  /** Tâches ordonnées + filtre statut appliqué (pour lignes sidebar + frise). */
  orderedTasksFiltered: ProjectTaskApi[];
  /** Jalons triés, filtrés si `showMilestones` est false → liste vide. */
  milestonesForBody: MilestoneForGanttBody[];
};

/**
 * Transforme uniquement la structure d’affichage (ordre, filtres, sélection jalons).
 * Pas de calcul métier isLate ; pas de `new Date()` — tri jalons par ISO lexicographique.
 */
export function mapProjectGanttPayloadToRenderModel(
  normalized: NormalizedProjectGanttPayload,
  options: {
    taskStatusFilter: 'all' | string;
    showMilestones: boolean;
  },
): ProjectGanttRenderModel {
  const phaseOptions = [...normalized.phases]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((p) => ({ id: p.id, name: p.name, sortOrder: p.sortOrder }));

  const orderedTasks = orderedTasksFromGanttPayload(
    normalized,
  ) as ProjectTaskApi[];
  const orderedTasksFiltered =
    options.taskStatusFilter === 'all'
      ? orderedTasks
      : orderedTasks.filter((t) => t.status === options.taskStatusFilter);

  const sortedMilestones = [...normalized.milestones].sort((a, b) => {
    const c = a.targetDate.localeCompare(b.targetDate);
    if (c !== 0) return c;
    return a.sortOrder - b.sortOrder;
  });
  const visible = options.showMilestones ? sortedMilestones : [];
  const milestonesForBody: MilestoneForGanttBody[] = visible.map((m) => ({
    id: m.id,
    name: m.name,
    targetDate: m.targetDate,
    linkedTaskId: m.linkedTaskId,
    phaseId: m.phaseId,
    sortOrder: m.sortOrder,
    status: m.status,
    isLate: m.isLate,
  }));

  return {
    phaseOptions,
    orderedTasksFiltered,
    milestonesForBody,
  };
}
