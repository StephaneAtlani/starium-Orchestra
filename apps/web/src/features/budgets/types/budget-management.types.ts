/**
 * Types alignés sur les réponses API budget-management (exercices, budgets, enveloppes, lignes).
 */

export interface BudgetExercise {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface Budget {
  id: string;
  clientId: string;
  exerciseId: string;
  name: string;
  code: string | null;
  description: string | null;
  currency: string;
  status: string;
  taxMode: 'HT' | 'TTC';
  defaultTaxRate: number | null;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Présent quand l’API joint l’exercice (liste / détail budgets). */
  exerciseName?: string;
  exerciseCode?: string | null;
}

export interface BudgetEnvelope {
  id: string;
  clientId: string;
  budgetId: string;
  name: string;
  code: string | null;
  description: string | null;
  type: string;
  status: string;
  parentId: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetLineCostCenterSplit {
  id: string;
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  percentage: number;
}

export interface BudgetLine {
  id: string;
  clientId: string;
  budgetId: string;
  envelopeId: string;
  name: string;
  code: string | null;
  description: string | null;
  expenseType: string;
  generalLedgerAccountId: string | null;
  /** Présents quand l’API joint les comptes (GET ligne). */
  generalLedgerAccountCode?: string;
  generalLedgerAccountName?: string;
  analyticalLedgerAccountId: string | null;
  analyticalLedgerAccountCode?: string | null;
  analyticalLedgerAccountName?: string | null;
  allocationScope: string;
  costCenterSplits?: BudgetLineCostCenterSplit[];
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  currency: string;
  taxRate?: number | null;
  initialTaxAmount?: number | null;
  initialAmountTtc?: number | null;
  revisedTaxAmount?: number | null;
  revisedAmountTtc?: number | null;
  forecastTaxAmount?: number | null;
  forecastAmountTtc?: number | null;
  committedTaxAmount?: number | null;
  committedAmountTtc?: number | null;
  consumedTaxAmount?: number | null;
  consumedAmountTtc?: number | null;
  remainingTaxAmount?: number | null;
  remainingAmountTtc?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListBudgetExercisesQuery {
  status?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface ListBudgetsQuery {
  exerciseId?: string;
  status?: string;
  ownerUserId?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface ListBudgetEnvelopesQuery {
  budgetId: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface ListBudgetLinesQuery {
  budgetId?: string;
  envelopeId?: string;
  status?: string;
  expenseType?: string;
  search?: string;
  offset?: number;
  limit?: number;
}
