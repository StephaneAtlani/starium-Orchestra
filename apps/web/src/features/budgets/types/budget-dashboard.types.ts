/**
 * Types alignés sur la réponse API budget-dashboard (cockpit).
 */

export type BudgetDashboardLineRiskLevel = 'OK' | 'WARNING' | 'CRITICAL';

export interface BudgetDashboardLineRow {
  lineId: string;
  code: string | null;
  name: string;
  envelopeName: string | null;
  revisedAmount: number;
  committed: number;
  consumed: number;
  forecast: number;
  remaining: number;
  lineRiskLevel: BudgetDashboardLineRiskLevel;
}

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
    /** Projections TTC (agrégat lignes) — `null` si un taux ligne manque. */
    totalBudgetTtc?: number | null;
    committedTtc?: number | null;
    consumedTtc?: number | null;
    forecastTtc?: number | null;
    remainingTtc?: number | null;
  };
  runBuildDistribution: {
    run: number;
    build: number;
    transverse: number;
  };
  alertsSummary: {
    negativeRemaining: number;
    overCommitted: number;
    overConsumed: number;
    forecastOverBudget: number;
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
  topBudgetLines?: BudgetDashboardLineRow[];
  criticalBudgetLines?: BudgetDashboardLineRow[];
}

export interface BudgetDashboardQueryParams {
  exerciseId?: string;
  budgetId?: string;
  includeEnvelopes?: boolean;
  includeLines?: boolean;
}
