/**
 * Plan de charge ressources — dérivés d'affichage de la matrice `/resources`.
 * Les jours et taux viennent de l'API ; ici on ne fait que classer et totaliser.
 */

import type { ResourceProjectLoadRow } from '../types/capacity.types';

/** Seuil au-delà duquel une ressource est considérée en surcharge. */
export const WORKLOAD_OVERLOAD_PERCENT = 100;
/** Seuil d'entrée en zone de vigilance. */
export const WORKLOAD_WARNING_PERCENT = 70;

export type WorkloadBand = 'none' | 'low' | 'warning' | 'overload';

/** Bande de charge d'une ressource, `none` si aucune capacité n'est résolue. */
export function workloadBand(loadPercent: number | null): WorkloadBand {
  if (loadPercent == null) return 'none';
  if (loadPercent > WORKLOAD_OVERLOAD_PERCENT) return 'overload';
  if (loadPercent >= WORKLOAD_WARNING_PERCENT) return 'warning';
  return 'low';
}

export type ResourceWorkloadStats = {
  /** Ressources humaines listées. */
  resourceCount: number;
  /** Ressources ayant au moins une allocation sur la fenêtre. */
  allocatedResourceCount: number;
  totalCapacityDays: number;
  totalAllocatedDays: number;
  /** Somme des jours restants, plancher à 0 par ressource (pas de compensation). */
  availableDays: number;
  /** Taux d'occupation global : alloué / capacité ; `null` sans capacité. */
  occupancyPercent: number | null;
  /** Ressources strictement au-dessus de 100 %. */
  overloadedCount: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Indicateurs du bandeau KPI.
 *
 * `availableDays` plafonne chaque ressource à 0 : une ressource en surcharge ne
 * doit pas créer de capacité fictive chez une autre.
 */
export function computeResourceWorkloadStats(
  rows: ReadonlyArray<ResourceProjectLoadRow>,
): ResourceWorkloadStats {
  let totalCapacityDays = 0;
  let totalAllocatedDays = 0;
  let availableDays = 0;
  let overloadedCount = 0;
  let allocatedResourceCount = 0;

  for (const row of rows) {
    totalCapacityDays += row.capacityDays;
    totalAllocatedDays += row.allocatedDays;
    availableDays += Math.max(0, row.availableDays);
    if (row.allocatedDays > 0) allocatedResourceCount += 1;
    if (workloadBand(row.loadPercent) === 'overload') overloadedCount += 1;
  }

  return {
    resourceCount: rows.length,
    allocatedResourceCount,
    totalCapacityDays: round1(totalCapacityDays),
    totalAllocatedDays: round1(totalAllocatedDays),
    availableDays: round1(availableDays),
    occupancyPercent:
      totalCapacityDays > 0
        ? Math.round((100 * totalAllocatedDays) / totalCapacityDays)
        : null,
    overloadedCount,
  };
}

/**
 * Trie la matrice par charge décroissante — les ressources à arbitrer d'abord.
 * Les ressources sans capacité résolue passent en fin de liste.
 */
export function sortByWorkloadDesc(
  rows: ReadonlyArray<ResourceProjectLoadRow>,
): ResourceProjectLoadRow[] {
  return rows.slice().sort((a, b) => {
    const aPct = a.loadPercent ?? -1;
    const bPct = b.loadPercent ?? -1;
    if (bPct !== aPct) return bPct - aPct;
    return a.label.localeCompare(b.label, 'fr');
  });
}

/** Projets réellement chargés — évite les colonnes vides dans la matrice. */
export function visibleProjects(
  result: {
    projects: ReadonlyArray<{ id: string; name: string; code: string | null }>;
    items: ReadonlyArray<ResourceProjectLoadRow>;
  },
): Array<{ id: string; name: string; code: string | null }> {
  return result.projects.filter((project) =>
    result.items.some((row) => (row.byProject[project.id] ?? 0) > 0),
  );
}
