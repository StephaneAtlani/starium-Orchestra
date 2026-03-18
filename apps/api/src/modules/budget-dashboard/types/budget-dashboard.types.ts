export type BudgetDashboardResponse = {
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
    // Projections TTC (montants budgétés) pour affichage uniquement.
    // Si au moins un taux effectif est absent pour une ligne, alors ces valeurs sont à `null`.
    totalBudgetTtc?: number | null;
    committedTtc?: number | null;
    consumedTtc?: number | null;
    forecastTtc?: number | null;
    remainingTtc?: number | null;
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
};
