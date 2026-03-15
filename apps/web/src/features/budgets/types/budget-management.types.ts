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
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetEnvelope {
  id: string;
  clientId: string;
  budgetId: string;
  name: string;
  code: string | null;
  description: string | null;
  type: string;
  parentId: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
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
  generalLedgerAccountId: string;
  analyticalLedgerAccountId: string | null;
  allocationScope: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  currency: string;
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
