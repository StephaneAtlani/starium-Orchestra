/**
 * Détection de cycle hiérarchique (parent chaîne) pour RFC-ORG-001.
 */
export function wouldSetParentCreateCycle(params: {
  unitId: string;
  newParentId: string | null;
  parentById: Map<string, string | null>;
}): boolean {
  const { unitId, newParentId, parentById } = params;
  if (!newParentId) return false;
  let cur: string | null = newParentId;
  const seen = new Set<string>();
  while (cur) {
    if (cur === unitId) return true;
    if (seen.has(cur)) return true;
    seen.add(cur);
    cur = parentById.get(cur) ?? null;
  }
  return false;
}

export type OrgUnitTreeNode<T extends { id: string; parentId: string | null; sortOrder: number; name: string }> = T & {
  children: OrgUnitTreeNode<T>[];
};

export function buildOrgUnitTree<
  T extends { id: string; parentId: string | null; sortOrder: number; name: string },
>(units: T[]): OrgUnitTreeNode<T>[] {
  const byId = new Map<string, OrgUnitTreeNode<T>>();
  for (const u of units) {
    byId.set(u.id, { ...u, children: [] });
  }
  const roots: OrgUnitTreeNode<T>[] = [];
  for (const u of units) {
    const node = byId.get(u.id)!;
    if (u.parentId && byId.has(u.parentId)) {
      byId.get(u.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: OrgUnitTreeNode<T>[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fr'));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}
