export type ActionPlanTaskLink = {
  projectId: string | null;
  riskId: string | null;
};

export type ActionPlanConsumesResolution =
  | { status: 'ok'; consumes: boolean }
  | { status: 'reject'; reason: 'EXPLICIT_TRUE_WITH_LINKED_TASKS' };

/** Projet : null → porte si autonome (`parentProjectId` null), sinon hérite. */
export function resolveProjectConsumesCapacity(
  consumesCapacity: boolean | null,
  parentProjectId: string | null,
): boolean {
  if (consumesCapacity === true) return true;
  if (consumesCapacity === false) return false;
  return parentProjectId == null;
}

/** Risque : null → porte si autonome (`projectId` null), sinon hérite. */
export function resolveProjectRiskConsumesCapacity(
  consumesCapacity: boolean | null,
  projectId: string | null,
): boolean {
  if (consumesCapacity === true) return true;
  if (consumesCapacity === false) return false;
  return projectId == null;
}

function hasLinkedTask(tasks: ReadonlyArray<ActionPlanTaskLink>): boolean {
  return tasks.some((t) => t.projectId != null || t.riskId != null);
}

/**
 * Plan d'actions — stratégie MVP : `true` explicite interdit dès qu'une tâche
 * est liée à un projet ou un risque.
 */
export function resolveActionPlanConsumesCapacity(
  consumesCapacity: boolean | null,
  tasks: ReadonlyArray<ActionPlanTaskLink>,
): ActionPlanConsumesResolution {
  const linked = hasLinkedTask(tasks);
  if (consumesCapacity === true) {
    if (linked) {
      return { status: 'reject', reason: 'EXPLICIT_TRUE_WITH_LINKED_TASKS' };
    }
    return { status: 'ok', consumes: true };
  }
  if (consumesCapacity === false) {
    return { status: 'ok', consumes: false };
  }
  return { status: 'ok', consumes: !linked };
}
