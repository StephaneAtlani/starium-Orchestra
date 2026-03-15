export interface BudgetDashboardResponse {
  exercise: {
    id: string;
    name: string;
    code: string | null;
  };
  budget: {
    id: string;
    name: string;
    code: string | null;
    currency: string;
    status: string;
  };
  kpis: {
    totalBudget: number;
    committed: number;
    consumed: number;
    forecast: number;
    remaining: number;
    consumptionRate: number;
  };
  capexOpexDistribution: {
    capex: number;
    opex: number;
  };
  monthlyTrend: {
    month: string;
    committed: number;
    consumed: number;
  }[];
  topEnvelopes?: {
    envelopeId: string;
    code: string | null;
    name: string;
    totalBudget: number;
    consumed: number;
    remaining: number;
  }[];
  riskEnvelopes?: {
    envelopeId: string;
    code: string | null;
    name: string;
    forecast: number;
    budgetAmount: number;
    riskRatio: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
  topBudgetLines?: {
    lineId: string;
    code: string | null;
    name: string;
    envelopeName: string | null;
    consumed: number;
    forecast: number;
    remaining: number;
  }[];
}

export interface BudgetDashboardQueryParams {
  exerciseId?: string;
  budgetId?: string;
  includeEnvelopes?: boolean;
  includeLines?: boolean;
}
