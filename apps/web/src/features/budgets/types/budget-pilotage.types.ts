/**
 * Modes d’affichage tableau budget RFC-024 (même grille explorateur).
 */

/** `synthese` = vue explorateur historique (KPI par ligne, tri). `previsionnel` = grille 12 mois. `forecast` = KPI agrégés (pas la grille). */
export type BudgetPilotageMode =
  | 'dashboard'
  | 'synthese'
  | 'previsionnel'
  | 'atterrissage'
  | 'forecast'
  | 'comparaison'
  | 'decisions';

/** Densité : mode planning mensuel uniquement (atterrissage / forecast : condensé implicite). */
export type BudgetPilotageDensity = 'mensuel' | 'condense';

/** Scénario Forecast — MVP : baseline seul. */
export type BudgetForecastScenario = 'baseline';
