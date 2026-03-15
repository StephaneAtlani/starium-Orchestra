/**
 * Types pour les listes budgets / exercices (RFC-FE-003).
 * Alignés sur les réponses API et les params de requête avec page/limit.
 */

export type ListResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type BudgetExerciseStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export type BudgetExerciseSummary = {
  id: string;
  name: string;
  code: string | null;
  startDate: string;
  endDate: string;
  status: BudgetExerciseStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type BudgetStatus = 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'ARCHIVED';

export type BudgetSummary = {
  id: string;
  exerciseId: string;
  name: string;
  code: string | null;
  description?: string | null;
  currency: string;
  status: BudgetStatus;
  ownerUserId?: string | null;
  ownerUserName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  exerciseName?: string;
  exerciseCode?: string | null;
};

export type BudgetExercisesListParams = {
  search?: string;
  status?: BudgetExerciseStatus | 'ALL';
  page?: number;
  limit?: number;
};

export type BudgetsListParams = {
  search?: string;
  exerciseId?: string;
  status?: BudgetStatus | 'ALL';
  ownerUserId?: string;
  page?: number;
  limit?: number;
};
