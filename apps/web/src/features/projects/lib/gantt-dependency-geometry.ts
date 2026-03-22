import type { TimelineBounds } from './gantt-timeline-layout';
import { dateMsToPx } from './gantt-timeline-layout';

/** Ligne de tâche dans la zone corps (sans en-tête mois/semaines) : positionnement barre + dépendance. */
export type GanttTaskRowGeom = {
  taskId: string;
  rowIndex: number;
  leftPx: number;
  barW: number;
  startMs: number;
  endMs: number;
  dependsOnTaskId: string | null;
  dependencyType: string | null;
};

export type DependencyPath = {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  path: string;
};

const DEFAULT_TYPE = 'FINISH_TO_START';

/** Ancres prédécesseur / successeur selon le type de dépendance (MVP : affichage aligné MS Project). */
export function anchorsForDependencyType(dependencyType: string | null): {
  from: 'start' | 'end';
  to: 'start' | 'end';
} {
  const t = dependencyType ?? DEFAULT_TYPE;
  switch (t) {
    case 'START_TO_START':
      return { from: 'start', to: 'start' };
    case 'FINISH_TO_FINISH':
      return { from: 'end', to: 'end' };
    case 'START_TO_FINISH':
      return { from: 'start', to: 'end' };
    case 'FINISH_TO_START':
    default:
      return { from: 'end', to: 'start' };
  }
}

function xAtAnchor(leftPx: number, barW: number, anchor: 'start' | 'end'): number {
  return anchor === 'end' ? leftPx + barW : leftPx;
}

/** Centre vertical d’une ligne dans la zone corps (0 = première ligne tâche). */
export function rowCenterY(rowIndex: number, rowHeightPx: number): number {
  return rowIndex * rowHeightPx + rowHeightPx / 2;
}

/**
 * Chemin orthogonal type « marches » entre deux points (coords dans le repère du corps SVG).
 */
export function orthogonalLinkPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  gap = 12,
): string {
  const xOut = x1 + gap;
  if (xOut < x2) {
    return `M ${x1} ${y1} L ${xOut} ${y1} L ${xOut} ${y2} L ${x2} ${y2}`;
  }
  const xDetour = Math.max(x1, x2) + gap * 2;
  return `M ${x1} ${y1} L ${xDetour} ${y1} L ${xDetour} ${y2} L ${x2} ${y2}`;
}

/**
 * Construit les chemins SVG pour toutes les dépendances affichables (prédécesseur et successeur avec barres).
 */
export function buildDependencyPaths(
  rows: GanttTaskRowGeom[],
  rowHeightPx: number,
): DependencyPath[] {
  const byId = new Map(rows.map((r) => [r.taskId, r]));
  const out: DependencyPath[] = [];

  for (const succ of rows) {
    const predId = succ.dependsOnTaskId;
    if (!predId || predId === succ.taskId) continue;
    const pred = byId.get(predId);
    if (!pred) continue;

    const { from, to } = anchorsForDependencyType(succ.dependencyType);
    const x1 = xAtAnchor(pred.leftPx, pred.barW, from);
    const y1 = rowCenterY(pred.rowIndex, rowHeightPx);
    const x2 = xAtAnchor(succ.leftPx, succ.barW, to);
    const y2 = rowCenterY(succ.rowIndex, rowHeightPx);

    const path = orthogonalLinkPath(x1, y1, x2, y2);
    out.push({
      id: `dep-${predId}-${succ.taskId}`,
      fromTaskId: predId,
      toTaskId: succ.taskId,
      path,
    });
  }

  return out;
}

/** Aide : calcule leftPx / barW à partir des dates (même logique que la frise). */
export function taskBarGeometry(
  startMs: number,
  endMs: number,
  bounds: TimelineBounds,
  pxPerDay: number,
): { leftPx: number; barW: number } {
  const leftPx = dateMsToPx(startMs, bounds, pxPerDay);
  const rightPx = dateMsToPx(endMs, bounds, pxPerDay);
  const barW = Math.max(2, rightPx - leftPx);
  return { leftPx, barW };
}
