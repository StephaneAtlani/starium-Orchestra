/**
 * Factory centralisée — en-têtes et métadonnées de colonnes par mode × densité (RFC-024).
 * Le rendu JSX reste dans les composants explorateur ; pas de logique métier backend ici.
 */

import type { BudgetPilotageDensity, BudgetPilotageMode } from '../types/budget-pilotage.types';

export interface BudgetPilotageColumnHeader {
  id: string;
  label: string;
  align: 'left' | 'right';
}

const ATTER_COLS: BudgetPilotageColumnHeader[] = [
  { id: 'revised', label: 'Budget révisé', align: 'right' },
  { id: 'consumed', label: 'Consommé', align: 'right' },
  { id: 'committed', label: 'Engagé', align: 'right' },
  { id: 'remainingPlanning', label: 'Prévision restante', align: 'right' },
  { id: 'landing', label: 'Atterrissage', align: 'right' },
  { id: 'landingVariance', label: 'Écart', align: 'right' },
];

const FORECAST_BASELINE_COLS: BudgetPilotageColumnHeader[] = [
  { id: 'revised', label: 'Budget révisé', align: 'right' },
  { id: 'forecastBaseline', label: 'Forecast (baseline)', align: 'right' },
  { id: 'landing', label: 'Atterrissage', align: 'right' },
  { id: 'landingVariance', label: 'Écart', align: 'right' },
];

function previsionnelMensuelHeaders(monthLabels: string[]): BudgetPilotageColumnHeader[] {
  const months = monthLabels.map((label, i) => ({
    id: `m${i + 1}`,
    label,
    align: 'right' as const,
  }));
  return [...months, { id: 'total', label: 'Total', align: 'right' as const }];
}

const CONDENSE_HEADERS: BudgetPilotageColumnHeader[] = [
  { id: 't1', label: 'T1', align: 'right' },
  { id: 't2', label: 'T2', align: 'right' },
  { id: 't3', label: 'T3', align: 'right' },
  { id: 't4', label: 'T4', align: 'right' },
  { id: 'total', label: 'Total', align: 'right' },
];

/**
 * En-têtes des colonnes de données (hors colonne arbre « Sous-budget »).
 */
export function getBudgetPilotageColumnHeaders(
  mode: BudgetPilotageMode,
  density: BudgetPilotageDensity,
  monthLabels: string[],
): BudgetPilotageColumnHeader[] {
  if (mode === 'dashboard') {
    throw new Error(
      'getBudgetPilotageColumnHeaders: mode dashboard — pas de colonnes pilotage',
    );
  }
  if (mode === 'synthese') {
    throw new Error(
      'getBudgetPilotageColumnHeaders: le mode synthèse utilise le tableau classique, pas la factory',
    );
  }
  if (monthLabels.length !== 12) {
    throw new RangeError('getBudgetPilotageColumnHeaders: monthLabels must have length 12');
  }
  if (mode === 'previsionnel') {
    return density === 'mensuel' ? previsionnelMensuelHeaders(monthLabels) : CONDENSE_HEADERS;
  }
  if (mode === 'atterrissage') {
    return ATTER_COLS;
  }
  return FORECAST_BASELINE_COLS;
}

export function countBudgetPilotageDataColumns(
  mode: BudgetPilotageMode,
  density: BudgetPilotageDensity,
): number {
  if (mode === 'dashboard') {
    throw new Error('countBudgetPilotageDataColumns: mode dashboard — pas de colonnes pilotage');
  }
  if (mode === 'synthese') {
    throw new Error('countBudgetPilotageDataColumns: mode synthèse — tableau classique');
  }
  if (mode === 'previsionnel') {
    return density === 'mensuel' ? 13 : 5;
  }
  if (mode === 'atterrissage') {
    return 6;
  }
  return 4;
}
