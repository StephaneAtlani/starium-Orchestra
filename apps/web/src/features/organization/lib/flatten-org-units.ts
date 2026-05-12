import type { OrgUnitTreeNode } from '../api/organization-api';

export type FlatOrgUnitOption = { id: string; label: string; status: string };

/** Arbre API → options Select (indentation + code + marquage archivé). */
export function flattenOrgUnitsForSelect(
  nodes: OrgUnitTreeNode[],
  depth = 0,
): FlatOrgUnitOption[] {
  const out: FlatOrgUnitOption[] = [];
  for (const n of nodes) {
    const pad = '\u00a0\u00a0'.repeat(depth);
    const code = n.code ? ` (${n.code})` : '';
    const arch = n.status === 'ARCHIVED' ? ' [archivé]' : '';
    out.push({
      id: n.id,
      label: `${pad}${n.name}${code}${arch}`,
      status: n.status,
    });
    if (n.children?.length) out.push(...flattenOrgUnitsForSelect(n.children, depth + 1));
  }
  return out;
}
