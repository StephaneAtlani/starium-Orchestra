/**
 * Barres de regroupement Gantt : enveloppe min–max des dates planifiées
 * pour une tâche et ses descendants **visibles** (même liste que la sidebar).
 */

import type { TaskTreeRow, TaskTreeSource } from './project-task-tree';
import type { ProjectTaskApi } from '../types/project.types';

/** Enfants directs dont le parent est dans la liste affichée. */
export function buildVisibleChildrenMap(
  rows: TaskTreeRow<TaskTreeSource>[],
): Map<string, string[]> {
  const ids = new Set(rows.map((r) => r.id));
  const m = new Map<string, string[]>();
  for (const r of rows) {
    const p = r.parentTaskId;
    if (!p || !ids.has(p)) continue;
    const list = m.get(p) ?? [];
    list.push(r.id);
    m.set(p, list);
  }
  return m;
}

/** Descendants en profondeur (DFS via carte enfants). */
export function collectVisibleDescendantIds(
  rootId: string,
  childrenMap: Map<string, string[]>,
): Set<string> {
  const out = new Set<string>();
  const stack = [...(childrenMap.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const ch = childrenMap.get(id);
    if (ch) for (const c of ch) stack.push(c);
  }
  return out;
}

export type RollupBounds = { startMs: number; endMs: number };

/**
 * Min / max des dates planifiées pour `taskId` + tous ses descendants visibles.
 * `null` si aucune date exploitable.
 */
export function computeVisibleSubtreeRollupBounds(
  taskId: string,
  rowsById: Map<string, Pick<ProjectTaskApi, 'plannedStartDate' | 'plannedEndDate'>>,
  childrenMap: Map<string, string[]>,
): RollupBounds | null {
  const desc = collectVisibleDescendantIds(taskId, childrenMap);
  const ids = new Set<string>([taskId, ...desc]);
  let minS = Infinity;
  let maxE = -Infinity;
  for (const id of ids) {
    const t = rowsById.get(id);
    if (!t?.plannedStartDate || !t?.plannedEndDate) continue;
    const s = new Date(t.plannedStartDate).getTime();
    const e = new Date(t.plannedEndDate).getTime();
    minS = Math.min(minS, s);
    maxE = Math.max(maxE, e);
  }
  if (minS === Infinity || maxE < minS) return null;
  return { startMs: minS, endMs: maxE };
}

export function taskHasVisibleChildren(
  taskId: string,
  childrenMap: Map<string, string[]>,
): boolean {
  return (childrenMap.get(taskId)?.length ?? 0) > 0;
}

/**
 * Moyenne des `progress` (0–100) pour la tâche et tous ses descendants visibles.
 * `null` si aucune entrée.
 */
export function computeVisibleSubtreeRollupProgress(
  taskId: string,
  rowsById: Map<string, Pick<ProjectTaskApi, 'progress'>>,
  childrenMap: Map<string, string[]>,
): number | null {
  const desc = collectVisibleDescendantIds(taskId, childrenMap);
  const ids = [taskId, ...desc];
  let sum = 0;
  let n = 0;
  for (const id of ids) {
    const t = rowsById.get(id);
    if (!t) continue;
    sum += Math.min(100, Math.max(0, t.progress ?? 0));
    n++;
  }
  if (n === 0) return null;
  return Math.round(sum / n);
}
