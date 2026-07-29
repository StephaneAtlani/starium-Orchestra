export { BudgetExpenseEntryModal, type BudgetExpenseLaunchKind } from './budget-expense-entry-modal';
export { BudgetPrevisionnelModal } from './budget-previsionnel-modal';
export { BudgetForecastRevisionModal } from './budget-forecast-revision-modal';
export { BudgetReallocationsJournalModal } from './budget-reallocations-journal-modal';
export { BudgetScenariosVersionsModal } from './budget-scenarios-versions-modal';
export { BudgetSourcesImportsModal } from './budget-sources-imports-modal';

export type BudgetDetailModal =
  | 'sources'
  | 'forecast'
  | 'reallocations'
  | 'scenarios'
  | 'expense'
  | null;
