/**
 * Indent / outdent tâches (planning / Gantt) — règles normatives : liste affichée uniquement,
 * sortOrder = M + 1 avec M = max(sortOrder) des frères affichés sous le parent cible (hors tâche déplacée).
 */

/** Champs minimaux pour le helper (aligné `ProjectTaskApi`). */
export type ProjectTaskIndentRow = {
  id: string;
  parentTaskId: string | null;
  sortOrder: number;
  depth: number;
};

function parentKey(r: ProjectTaskIndentRow): string | null {
  return r.parentTaskId ?? null;
}

/**
 * Frères affichés sous `parentTarget` (null = racines), en excluant la tâche déplacée.
 */
function siblingRows(
  displayedRows: ProjectTaskIndentRow[],
  taskId: string,
  parentTarget: string | null,
): ProjectTaskIndentRow[] {
  return displayedRows.filter((r) => {
    if (r.id === taskId) return false;
    return parentKey(r) === parentTarget;
  });
}

/**
 * sortOrder = max(sortOrder des frères affichés sous ce parent, hors taskId) + 1.
 */
export function computeSortOrderForParent(
  displayedRows: ProjectTaskIndentRow[],
  taskId: string,
  parentTarget: string | null,
): number {
  const sib = siblingRows(displayedRows, taskId, parentTarget);
  if (sib.length === 0) return 0;
  const m = Math.max(...sib.map((r) => r.sortOrder));
  return m + 1;
}

export type TaskHierarchyPatch = {
  parentTaskId: string | null;
  sortOrder: number;
};

/**
 * Indenter : parent = ligne précédente affichée ; sortOrder = dernier enfant du nouveau parent + 1.
 */
export function computeIndentPatch(
  displayedRows: ProjectTaskIndentRow[],
  taskId: string,
): TaskHierarchyPatch | null {
  const i = displayedRows.findIndex((r) => r.id === taskId);
  if (i <= 0) return null;
  const newParentId = displayedRows[i - 1]!.id;
  const sortOrder = computeSortOrderForParent(displayedRows, taskId, newParentId);
  return { parentTaskId: newParentId, sortOrder };
}

/**
 * Désindenter : parent = parent du parent, ou null ; sortOrder au nouveau niveau (même formule M+1).
 * Si la ligne parent n’est pas dans `displayedRows`, impossible (pas de résolution sans liste complète).
 */
export function computeOutdentPatch(
  displayedRows: ProjectTaskIndentRow[],
  taskId: string,
): TaskHierarchyPatch | null {
  const i = displayedRows.findIndex((r) => r.id === taskId);
  if (i < 0) return null;
  const T = displayedRows[i]!;
  const pid = parentKey(T);
  if (pid === null) return null;
  const pRow = displayedRows.find((r) => r.id === pid);
  if (!pRow) return null;
  const newParentId = parentKey(pRow);
  const sortOrder = computeSortOrderForParent(displayedRows, taskId, newParentId);
  return { parentTaskId: newParentId, sortOrder };
}

/**
 * Vérifie qu’une chaîne parent ne repasse pas par `taskId` (filet anti-cycle côté helper).
 */
export function wouldPatchIntroduceCycle(
  taskId: string,
  newParentId: string | null,
  rowById: Map<string, ProjectTaskIndentRow>,
): boolean {
  if (newParentId === null) return false;
  if (newParentId === taskId) return true;
  let cur: string | null = newParentId;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) return true;
    seen.add(cur);
    if (cur === taskId) return true;
    const row = rowById.get(cur);
    cur = row ? parentKey(row) : null;
  }
  return false;
}
