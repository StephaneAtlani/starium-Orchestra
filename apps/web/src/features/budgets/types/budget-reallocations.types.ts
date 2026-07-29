export interface BudgetReallocationItem {
  id: string;
  budgetId: string;
  sourceLineId: string;
  targetLineId: string;
  amount: number;
  currency: string;
  reason: string | null;
  createdAt: string;
}

export interface ListBudgetReallocationsResponse {
  items: BudgetReallocationItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListBudgetReallocationsQuery {
  budgetId?: string;
  budgetLineId?: string;
  offset?: number;
  limit?: number;
}

export interface CreateBudgetReallocationPayload {
  sourceLineId: string;
  targetLineId: string;
  amount: number;
  reason?: string;
}
