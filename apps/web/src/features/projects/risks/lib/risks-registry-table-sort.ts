import type { ProjectRiskCriticalityLevel } from '../../types/project.types';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';

export type RisksRegistrySortKey =
  | 'title'
  | 'projectName'
  | 'domain'
  | 'riskType'
  | 'status'
  | 'criticality'
  | 'owner'
  | 'reviewDate'
  | 'dueDate';

const CRIT_ORDER: Record<ProjectRiskCriticalityLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function domainLabel(r: ProjectRiskRegistryRow): string {
  return r.riskType?.domain?.name?.trim() ?? '';
}

/** Libellé type taxonomique, sinon catégorie héritée. */
function riskTypeLabel(r: ProjectRiskRegistryRow): string {
  if (r.riskType?.name) return r.riskType.name.trim();
  return r.category?.trim() ?? '';
}

function compareDateNullable(a: string | null, b: string | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return ta - tb;
}

/** Ordre par défaut lorsqu’on active une nouvelle colonne (premier clic après changement de colonne). */
export function defaultSortOrderForKey(key: RisksRegistrySortKey): 'asc' | 'desc' {
  if (key === 'reviewDate' || key === 'dueDate') return 'desc';
  return 'asc';
}

export function sortRisksRegistryRows(
  rows: ProjectRiskRegistryRow[],
  sortKey: RisksRegistrySortKey,
  order: 'asc' | 'desc',
): ProjectRiskRegistryRow[] {
  const mul = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'title':
        cmp = a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
        break;
      case 'projectName':
        cmp = a.projectName.localeCompare(b.projectName, 'fr', { sensitivity: 'base' });
        break;
      case 'domain':
        cmp = domainLabel(a).localeCompare(domainLabel(b), 'fr', { sensitivity: 'base' });
        break;
      case 'riskType':
        cmp = riskTypeLabel(a).localeCompare(riskTypeLabel(b), 'fr', { sensitivity: 'base' });
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status, 'fr');
        break;
      case 'criticality': {
        const ca = CRIT_ORDER[a.criticalityLevel as ProjectRiskCriticalityLevel] ?? 99;
        const cb = CRIT_ORDER[b.criticalityLevel as ProjectRiskCriticalityLevel] ?? 99;
        cmp = ca - cb;
        break;
      }
      case 'owner':
        cmp = a.ownerDisplayLabel.localeCompare(b.ownerDisplayLabel, 'fr', {
          sensitivity: 'base',
        });
        break;
      case 'reviewDate':
        cmp = compareDateNullable(a.reviewDate, b.reviewDate);
        break;
      case 'dueDate':
        cmp = compareDateNullable(a.dueDate, b.dueDate);
        break;
      default:
        cmp = 0;
    }
    if (cmp !== 0) return mul * cmp;
    return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
  });
}
