export type BudgetDashboardLineRiskLevel = 'OK' | 'WARNING' | 'CRITICAL';

export type BudgetDashboardLineRow = {
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
};

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
  /** Montants budgétés (revised) par type d’enveloppe — distinct de CAPEX/OPEX (ExpenseType). */
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
  /** Top lignes par montant consommé (max. 10). */
  topBudgetLines?: BudgetDashboardLineRow[];
  /** Lignes à risque (WARNING/CRITICAL), tri par gravité puis consommation (max. 10). */
  criticalBudgetLines?: BudgetDashboardLineRow[];
};
