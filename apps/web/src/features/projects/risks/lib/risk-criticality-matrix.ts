/**
 * Grille de criticité P×I — source unique partagée par la fiche EBIOS
 * (`project-risk-ebios-dialog`) et la matrice du registre (`risks-registry-matrix`).
 *
 * Les seuils reproduisent ceux du serveur
 * (`apps/api/src/modules/projects/lib/project-risk-criticality.util.ts`).
 */

import type { ProjectRiskCriticalityLevel } from '../../types/project.types';

/** Échelle EBIOS RM : vraisemblance et gravité de 1 à 5 → score 1–25. */
export const RISK_PI_SCALE = [1, 2, 3, 4, 5] as const;

/** Lignes de la matrice : vraisemblance décroissante (5 en haut). */
export const RISK_MATRIX_PROBABILITY_ROWS = [5, 4, 3, 2, 1] as const;

/** Colonnes de la matrice : gravité croissante (1 à gauche). */
export const RISK_MATRIX_IMPACT_COLS = RISK_PI_SCALE;

/** Seuils MVP RFC-PROJ-RISK-001 — identiques au calcul serveur. */
export function criticalityLevelFromPiScore(score: number): ProjectRiskCriticalityLevel {
  if (score <= 4) return 'LOW';
  if (score <= 9) return 'MEDIUM';
  if (score <= 16) return 'HIGH';
  return 'CRITICAL';
}

/** Surface colorée d'une case de matrice, par niveau de criticité. */
export function matrixCellSurfaceClass(level: ProjectRiskCriticalityLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'bg-violet-500/25 text-violet-950 dark:bg-violet-500/20 dark:text-violet-100';
    case 'HIGH':
      return 'bg-red-500/20 text-red-950 dark:bg-red-500/15 dark:text-red-100';
    case 'MEDIUM':
      return 'bg-amber-500/20 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100';
    default:
      return 'bg-emerald-500/15 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100';
  }
}

/** Pastilles de légende — mêmes libellés et teintes que la fiche EBIOS. */
export const RISK_MATRIX_LEGEND: ReadonlyArray<{ label: string; dotClass: string }> = [
  { label: 'Faible', dotClass: 'bg-emerald-500/40' },
  { label: 'Moyenne', dotClass: 'bg-amber-500/40' },
  { label: 'Haute', dotClass: 'bg-red-500/35' },
  { label: 'Critique', dotClass: 'bg-violet-500/40' },
];

export type RiskMatrixCell = {
  probability: number;
  impact: number;
  score: number;
  level: ProjectRiskCriticalityLevel;
  /** Nombre de risques positionnés sur cette case. */
  count: number;
};

type RiskLike = { probability: number; impact: number };

function clampToScale(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

/**
 * Compte les risques par case (vraisemblance × gravité).
 *
 * Les lignes hors échelle 1–5 (données héritées, valeurs nulles) sont ignorées et
 * remontées via `outOfScale` pour rester explicites côté UI.
 */
export function buildRiskMatrix(rows: ReadonlyArray<RiskLike>): {
  cells: RiskMatrixCell[][];
  total: number;
  outOfScale: number;
} {
  const counts = new Map<string, number>();
  let total = 0;
  let outOfScale = 0;

  for (const row of rows) {
    const p = clampToScale(row.probability);
    const i = clampToScale(row.impact);
    if (p == null || i == null) {
      outOfScale += 1;
      continue;
    }
    counts.set(`${p}:${i}`, (counts.get(`${p}:${i}`) ?? 0) + 1);
    total += 1;
  }

  const cells = RISK_MATRIX_PROBABILITY_ROWS.map((probability) =>
    RISK_MATRIX_IMPACT_COLS.map((impact) => {
      const score = probability * impact;
      return {
        probability,
        impact,
        score,
        level: criticalityLevelFromPiScore(score),
        count: counts.get(`${probability}:${impact}`) ?? 0,
      } satisfies RiskMatrixCell;
    }),
  );

  return { cells, total, outOfScale };
}
