import type { ProjectRiskCriticalityLevel } from '../../types/project.types';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';

/** Colonnes registre EBIOS RM (vue tableau). */
export type RisksRegistrySortKey =
  | 'domain'
  | 'fearedEvent'
  | 'threatSource'
  | 'scenario'
  | 'impact'
  | 'probability'
  | 'initialRisk'
  | 'existingMeasures'
  | 'complementaryTreatment'
  | 'residualTarget';

const CRIT_ORDER: Record<ProjectRiskCriticalityLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function domainLabel(r: ProjectRiskRegistryRow): string {
  return r.riskType?.domain?.name?.trim() ?? '';
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

function textOrDash(value: string | null | undefined): string {
  const t = value?.trim();
  return t && t !== '—' ? t : '';
}

/** Ordre par défaut lorsqu’on active une nouvelle colonne (premier clic). */
export function defaultSortOrderForKey(key: RisksRegistrySortKey): 'asc' | 'desc' {
  if (key === 'initialRisk') return 'asc';
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
      case 'domain':
        cmp = domainLabel(a).localeCompare(domainLabel(b), 'fr', { sensitivity: 'base' });
        break;
      case 'fearedEvent':
        cmp = textOrDash(a.fearedEvent).localeCompare(textOrDash(b.fearedEvent), 'fr', {
          sensitivity: 'base',
        });
        break;
      case 'threatSource':
        cmp = textOrDash(a.threatSource).localeCompare(textOrDash(b.threatSource), 'fr', {
          sensitivity: 'base',
        });
        break;
      case 'scenario':
        cmp = textOrDash(a.description).localeCompare(textOrDash(b.description), 'fr', {
          sensitivity: 'base',
        });
        break;
      case 'impact':
        cmp = a.impact - b.impact;
        break;
      case 'probability':
        cmp = a.probability - b.probability;
        break;
      case 'initialRisk': {
        const ca = CRIT_ORDER[a.criticalityLevel as ProjectRiskCriticalityLevel] ?? 99;
        const cb = CRIT_ORDER[b.criticalityLevel as ProjectRiskCriticalityLevel] ?? 99;
        cmp = ca - cb;
        if (cmp === 0) cmp = a.criticalityScore - b.criticalityScore;
        break;
      }
      case 'existingMeasures':
        cmp = textOrDash(a.existingSecurityMeasures).localeCompare(
          textOrDash(b.existingSecurityMeasures),
          'fr',
          { sensitivity: 'base' },
        );
        break;
      case 'complementaryTreatment':
        cmp = textOrDash(a.complementaryTreatmentMeasures).localeCompare(
          textOrDash(b.complementaryTreatmentMeasures),
          'fr',
          { sensitivity: 'base' },
        );
        break;
      case 'residualTarget': {
        const ra = a.residualRiskLevel
          ? (CRIT_ORDER[a.residualRiskLevel as ProjectRiskCriticalityLevel] ?? 99)
          : 99;
        const rb = b.residualRiskLevel
          ? (CRIT_ORDER[b.residualRiskLevel as ProjectRiskCriticalityLevel] ?? 99)
          : 99;
        cmp = ra - rb;
        break;
      }
      default:
        cmp = 0;
    }
    if (cmp !== 0) return mul * cmp;
    return textOrDash(a.fearedEvent || a.title).localeCompare(
      textOrDash(b.fearedEvent || b.title),
      'fr',
      { sensitivity: 'base' },
    );
  });
}
