/** Vues métier du tableau pilotage (RFC-024). */
export type BudgetPilotageView = 'previsionnel' | 'atterrissage' | 'forecast';

/** Densité — édition autorisée uniquement en mensuel (vue prévisionnel). */
export type BudgetPilotageDensity = 'mensuel' | 'condense';

/** MVP : seul Baseline est actif ; autres réservés côté API. */
export type BudgetForecastScenario = 'baseline';
