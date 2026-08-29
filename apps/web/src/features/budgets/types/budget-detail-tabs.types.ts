/**
 * Onglets métier de la fiche budget cockpit (RFC-FE-BUD-032 §3.B).
 *
 * Remplace les 7 modes `BudgetPilotageMode` côté navigation. `BudgetPilotageMode` reste le
 * vocabulaire interne de `BudgetExplorerTable` : le mapping ci-dessous fait le pont.
 */
import type { BudgetPilotageMode } from './budget-pilotage.types';
import { BUDGET_LABELS } from '../lib/budget-display-labels';

export type BudgetDetailTabId =
  | 'overview'
  | 'previsionnel'
  | 'suivi'
  | 'comparaisons'
  | 'reallocations'
  | 'historique';

/** Vue de travail : 6 onglets métier + panneau PA hors tablist (RFC-BUD-041 C5). */
export type BudgetDetailWorkspaceId = BudgetDetailTabId | 'pa';

/** Sous-vue de l'onglet Suivi : synthèse d'exécution ou projection d'atterrissage. */
export type BudgetSuiviView = 'synthese' | 'atterrissage';

export const BUDGET_DETAIL_TABS: { id: BudgetDetailTabId; label: string }[] = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'previsionnel', label: BUDGET_LABELS.planningTab },
  { id: 'suivi', label: 'Suivi' },
  { id: 'comparaisons', label: 'Comparaisons' },
  { id: 'reallocations', label: 'Réaffectations' },
  { id: 'historique', label: 'Historique' },
];

export const BUDGET_SUIVI_VIEWS: { id: BudgetSuiviView; label: string }[] = [
  { id: 'synthese', label: 'Synthèse d’exécution' },
  { id: 'atterrissage', label: 'Atterrissage' },
];

export const DEFAULT_BUDGET_DETAIL_TAB: BudgetDetailTabId = 'overview';

export function isBudgetDetailTabId(value: unknown): value is BudgetDetailTabId {
  return (
    typeof value === 'string' &&
    BUDGET_DETAIL_TABS.some((tab) => tab.id === value)
  );
}

export function isBudgetDetailWorkspaceId(
  value: unknown,
): value is BudgetDetailWorkspaceId {
  return value === 'pa' || isBudgetDetailTabId(value);
}

/** Mode explorateur correspondant à l'onglet (null : l'onglet n'utilise pas l'explorateur). */
export function budgetDetailTabToExplorerMode(
  tab: BudgetDetailTabId,
  suiviView: BudgetSuiviView,
): BudgetPilotageMode | null {
  switch (tab) {
    case 'overview':
      return 'dashboard';
    case 'previsionnel':
      return 'previsionnel';
    case 'suivi':
      return suiviView;
    case 'comparaisons':
      return 'comparaison';
    case 'historique':
      return 'decisions';
    case 'reallocations':
      return null;
  }
}

/** Onglets dont le contenu est alimenté par la grille explorateur (filtres + densité utiles). */
export function budgetDetailTabUsesExplorerGrid(tab: BudgetDetailTabId): boolean {
  return tab === 'previsionnel' || tab === 'suivi';
}
