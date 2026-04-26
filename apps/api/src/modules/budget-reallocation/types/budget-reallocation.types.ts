export interface BudgetReallocationResponse {
  id: string;
  budgetId: string;
  sourceLineId: string;
  targetLineId: string;
  amount: number;
  currency: string;
  reason: string | null;
  createdAt: Date;
}

export type BudgetReallocationListItem = BudgetReallocationResponse;

export interface CreateReallocationContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

export interface ListReallocationsResult {
  items: BudgetReallocationListItem[];
  total: number;
  limit: number;
  offset: number;
}
