/** Clés GUID présentes dans `plannerTaskDetails.checklist` (hors `@odata.type`). */
export function extractGraphChecklistKeys(checklist: unknown): Set<string> {
  const keys = new Set<string>();
  if (!checklist || typeof checklist !== 'object') return keys;
  for (const k of Object.keys(checklist as Record<string, unknown>)) {
    if (k === '@odata.type') continue;
    keys.add(k);
  }
  return keys;
}

type ChecklistRowForGraph = {
  title: string;
  isChecked: boolean;
  sortOrder: number;
  plannerChecklistItemKey: string | null;
};

/**
 * Corps `checklist` pour PATCH `planner/tasks/{id}/details` : aligne Starium sur Planner
 * et supprime les entrées Graph qui n’existent plus côté Starium (`null`).
 */
export function buildPlannerChecklistPatchBody(
  stariumItems: ChecklistRowForGraph[],
  existingGraphChecklist: unknown,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const stariumKeys = new Set<string>();

  const sorted = [...stariumItems].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const row of sorted) {
    const key = row.plannerChecklistItemKey?.trim();
    if (!key) {
      throw new Error('plannerChecklistItemKey manquant pour la sync Planner');
    }
    stariumKeys.add(key);
    result[key] = {
      '@odata.type': 'microsoft.graph.plannerChecklistItem',
      title: row.title,
      isChecked: row.isChecked,
    };
  }

  for (const k of extractGraphChecklistKeys(existingGraphChecklist)) {
    if (!stariumKeys.has(k)) {
      result[k] = null;
    }
  }

  return result;
}
