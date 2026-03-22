/**
 * Tri + hiérarchie tâches (RFC-PROJ-012) — ordre explicite côté client, orphelins → racine.
 */

export type TaskTreeSource = {
  id: string;
  parentTaskId: string | null;
  sortOrder: number;
  plannedStartDate: string | null;
  createdAt: string;
};

function compareTasksForSort(a: TaskTreeSource, b: TaskTreeSource): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const aStart = a.plannedStartDate;
  const bStart = b.plannedStartDate;
  if (!aStart && !bStart) {
    /* continue */
  } else if (!aStart) return 1;
  else if (!bStart) return -1;
  else {
    const ta = new Date(aStart).getTime();
    const tb = new Date(bStart).getTime();
    if (ta !== tb) return ta - tb;
  }
  return a.createdAt.localeCompare(b.createdAt);
}

export type TaskTreeRow<T extends TaskTreeSource> = T & { depth: number };

/**
 * Trie les tâches, rattache les orphelins à la racine, parcourt en profondeur d’abord.
 */
export function buildProjectTaskTreeRows<T extends TaskTreeSource>(items: T[]): TaskTreeRow<T>[] {
  const sorted = [...items].sort(compareTasksForSort);
  const idSet = new Set(sorted.map((t) => t.id));

  const effectiveParent = (t: T): string | null => {
    const p = t.parentTaskId;
    if (!p || p === t.id || !idSet.has(p)) return null;
    return p;
  };

  const byParent = new Map<string | null, T[]>();
  for (const t of sorted) {
    const ep = effectiveParent(t);
    const list = byParent.get(ep) ?? [];
    list.push(t);
    byParent.set(ep, list);
  }

  for (const [, list] of byParent) {
    list.sort(compareTasksForSort);
  }

  const out: TaskTreeRow<T>[] = [];

  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId);
    if (!children) return;
    for (const t of children) {
      out.push({ ...t, depth });
      walk(t.id, depth + 1);
    }
  }

  walk(null, 0);
  return out;
}
