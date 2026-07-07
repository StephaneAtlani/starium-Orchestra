/** RFC-PROJ-019 — utilitaires hiérarchie inter-projets (pattern dédié). */

export const MAX_PROJECT_HIERARCHY_DEPTH = 5;

export const PROJECT_HIERARCHY_FILTER_CONFLICT_MESSAGE =
  'rootOnly and parentProjectId are mutually exclusive';

export const PROJECT_SELF_PARENT_MESSAGE = 'A project cannot be its own parent';

export const PROJECT_DELETE_HAS_CHILDREN_MESSAGE =
  'Cannot delete a project that has child projects';

export type ProjectParentSummary = {
  id: string;
  name: string;
  code: string;
  status: string;
  kind: string;
};

export type HierarchyAnomalyHandler = (
  reason: 'cycle' | 'max_depth',
  detail: Record<string, string>,
) => void;

export function buildChildrenByParentId(
  parentById: Map<string, string | null>,
): Map<string, string[]> {
  const childrenByParentId = new Map<string, string[]>();
  for (const [id, parentId] of parentById) {
    if (!parentId) continue;
    const list = childrenByParentId.get(parentId) ?? [];
    list.push(id);
    childrenByParentId.set(parentId, list);
  }
  return childrenByParentId;
}

export function wouldSetParentCreateCycle(params: {
  projectId: string;
  newParentId: string | null;
  parentById: Map<string, string | null>;
}): boolean {
  const { projectId, newParentId, parentById } = params;
  if (!newParentId) return false;
  let cur: string | null = newParentId;
  const seen = new Set<string>();
  while (cur) {
    if (cur === projectId) return true;
    if (seen.has(cur)) return true;
    seen.add(cur);
    cur = parentById.get(cur) ?? null;
  }
  return false;
}

export function computeDepthFromRoot(
  projectId: string,
  parentById: Map<string, string | null>,
): number {
  let depth = 1;
  let cur = parentById.get(projectId) ?? null;
  const seen = new Set<string>([projectId]);
  while (cur) {
    depth += 1;
    if (seen.has(cur)) break;
    seen.add(cur);
    if (depth > MAX_PROJECT_HIERARCHY_DEPTH) break;
    cur = parentById.get(cur) ?? null;
  }
  return depth;
}

export function computeSubtreeHeight(
  rootId: string,
  childrenByParentId: Map<string, string[]>,
): number {
  const children = childrenByParentId.get(rootId) ?? [];
  if (children.length === 0) return 1;
  let maxChild = 0;
  for (const childId of children) {
    maxChild = Math.max(maxChild, computeSubtreeHeight(childId, childrenByParentId));
  }
  return 1 + maxChild;
}

export function collectDescendantIds(
  rootId: string,
  childrenByParentId: Map<string, string[]>,
): Set<string> {
  const out = new Set<string>();
  const stack = [...(childrenByParentId.get(rootId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const child of childrenByParentId.get(id) ?? []) {
      stack.push(child);
    }
  }
  return out;
}

/**
 * Remonte les ancêtres du projet courant (racine → parent direct).
 * Ne lève pas d'exception : coupure + callback en cas d'anomalie.
 */
export function buildAncestorChain(
  projectId: string,
  parentById: Map<string, string | null>,
  summaryById: Map<string, ProjectParentSummary>,
  onAnomaly?: HierarchyAnomalyHandler,
): ProjectParentSummary[] {
  const chain: ProjectParentSummary[] = [];
  let cur = parentById.get(projectId) ?? null;
  const seen = new Set<string>([projectId]);
  let iterations = 0;

  while (cur) {
    if (seen.has(cur)) {
      onAnomaly?.('cycle', { projectId, ancestorId: cur });
      break;
    }
    seen.add(cur);
    iterations += 1;
    if (iterations > MAX_PROJECT_HIERARCHY_DEPTH) {
      onAnomaly?.('max_depth', { projectId, ancestorId: cur });
      break;
    }
    const summary = summaryById.get(cur);
    if (!summary) break;
    chain.push(summary);
    cur = parentById.get(cur) ?? null;
  }

  return chain.reverse();
}

export function wouldExceedMaxDepthAfterReparent(params: {
  newParentId: string;
  projectId: string;
  parentById: Map<string, string | null>;
  childrenByParentId: Map<string, string[]>;
  isCreate: boolean;
}): boolean {
  const { newParentId, projectId, parentById, childrenByParentId, isCreate } = params;
  const parentDepth = computeDepthFromRoot(newParentId, parentById);
  const subtreeHeight = isCreate
    ? 1
    : computeSubtreeHeight(projectId, childrenByParentId);
  return parentDepth + subtreeHeight > MAX_PROJECT_HIERARCHY_DEPTH;
}
