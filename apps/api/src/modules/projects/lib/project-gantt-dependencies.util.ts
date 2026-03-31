/**
 * Prédécesseur invalide (hors projet) → ignoré.
 * Chaîne depuis le prédécesseur qui revient vers `taskId` → cycle → ignoré.
 */
export function sanitizeDependsOnTaskId(
  taskId: string,
  directPred: string | null,
  taskById: Map<string, { dependsOnTaskId: string | null }>,
  allIds: Set<string>,
): string | null {
  if (!directPred || !allIds.has(directPred)) return null;

  const visited = new Set<string>();
  let cur: string | null = directPred;
  while (cur) {
    if (cur === taskId) return null;
    if (visited.has(cur)) return null;
    visited.add(cur);
    const next: string | null = taskById.get(cur)?.dependsOnTaskId ?? null;
    if (!next || !allIds.has(next)) break;
    cur = next;
  }
  return directPred;
}

export function buildSanitizedDependsOnMap(
  tasks: Array<{ id: string; dependsOnTaskId: string | null }>,
): Map<string, string | null> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const allIds = new Set(tasks.map((t) => t.id));
  const out = new Map<string, string | null>();
  for (const t of tasks) {
    out.set(
      t.id,
      sanitizeDependsOnTaskId(t.id, t.dependsOnTaskId, byId, allIds),
    );
  }
  return out;
}
