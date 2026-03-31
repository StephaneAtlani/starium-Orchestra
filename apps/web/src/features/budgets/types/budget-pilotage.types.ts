/**
 * Modes d’affichage tableau budget RFC-024 (même grille explorateur).
 */

/** `synthese` = vue explorateur historique (KPI par ligne, tri). */
export type BudgetPilotageMode =
  | 'dashboard'
  | 'synthese'
  | 'previsionnel'
  | 'atterrissage'
  | 'forecast';

/** Densité : Prévisionnel uniquement (atterrissage / forecast implicites condensés). */
export type BudgetPilotageDensity = 'mensuel' | 'condense';

/** Scénario Forecast — MVP : baseline seul. */
export type BudgetForecastScenario = 'baseline';
