export {
  BudgetExpenseEntryModal,
  type BudgetExpenseNature,
  type BudgetExpenseLaunchKind,
} from './budget-expense-entry-modal';

/**
 * Seule modale résiduelle de la fiche budget : la saisie de dépense (formulaire unique).
 */
export type BudgetDetailModal = 'expense' | null;
