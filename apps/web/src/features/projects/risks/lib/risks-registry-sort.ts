import type { ProjectRiskApi, ProjectRiskCriticalityLevel } from '../../types/project.types';

const CRIT_ORDER: Record<ProjectRiskCriticalityLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function effectiveDateMs(r: ProjectRiskApi): number | null {
  const raw = r.reviewDate ?? r.dueDate;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Tri par défaut registre transverse : criticité (fort d’abord) → date revue/échéance la plus proche → titre.
 */
function domainSortKey(r: ProjectRiskApi): string {
  const n = r.riskType?.domain?.name ?? r.riskType?.domain?.code;
  return n ?? '\uFFFF';
}

export function sortRisksRegistryDefault<T extends ProjectRiskApi>(rows: T[]): T[] {
  const now = Date.now();
  return [...rows].sort((a, b) => {
    const ca = CRIT_ORDER[a.criticalityLevel as ProjectRiskCriticalityLevel] ?? 99;
    const cb = CRIT_ORDER[b.criticalityLevel as ProjectRiskCriticalityLevel] ?? 99;
    if (ca !== cb) return ca - cb;

    const domCmp = domainSortKey(a).localeCompare(domainSortKey(b), 'fr', { sensitivity: 'base' });
    if (domCmp !== 0) return domCmp;

    const da = effectiveDateMs(a);
    const db = effectiveDateMs(b);
    if (da != null && db != null && da !== db) {
      return Math.abs(da - now) - Math.abs(db - now);
    }
    if (da != null && db == null) return -1;
    if (da == null && db != null) return 1;

    return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
  });
}
