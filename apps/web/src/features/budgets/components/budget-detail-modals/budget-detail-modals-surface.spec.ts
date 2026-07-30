import { describe, expect, it } from 'vitest';
import * as budgetDetailModals from './index';

/**
 * Garde-fou RFC-FE-BUD-032 §4.1 : la fiche budget ne conserve qu'une seule modale.
 * Les onglets remplacent Prévisionnel / Scénarios / Sources / Réaffectations, et les scénarios
 * à coefficients inventés (0.94 / 1.11) ne doivent pas revenir.
 */
describe('surface des modales de la fiche budget', () => {
  it('n’expose que la saisie de dépense', () => {
    expect(Object.keys(budgetDetailModals).sort()).toEqual(['BudgetExpenseEntryModal']);
  });

  it('n’expose plus les modales remplacées par les onglets', () => {
    for (const removed of [
      'BudgetPrevisionnelModal',
      'BudgetForecastRevisionModal',
      'BudgetScenariosVersionsModal',
      'BudgetSourcesImportsModal',
      'BudgetReallocationsJournalModal',
    ]) {
      expect(removed in budgetDetailModals).toBe(false);
    }
  });
});
