export type BudgetDashboardLineRiskLevel = 'OK' | 'WARNING' | 'CRITICAL';

export type BudgetDashboardLineRow = {
  lineId: string;
  code: string | null;
  name: string;
  envelopeName: string | null;
  initialAmount: number;
  committed: number;
  consumed: number;
  forecast: number;
  remaining: number;
  lineRiskLevel: BudgetDashboardLineRiskLevel;
};

/** Seuils cockpit (JSON `thresholdsConfig`) — absents ⇒ fallback service. */
export type BudgetDashboardThresholdsConfig = {
  consumptionRateWarning?: number;
  consumptionRateCritical?: number;
  negativeRemaining?: boolean;
  maxAlertItems?: number;
};

export type BudgetCockpitExercise = {
  id: string;
  name: string;
  code: string | null;
};

export type BudgetCockpitBudget = {
  id: string;
  name: string;
  code: string | null;
  currency: string;
  status: string;
};

export type BudgetCockpitConfigBlock = {
  id: string;
  name: string;
  isDefault: boolean;
  defaultExerciseId: string | null;
  defaultBudgetId: string | null;
  layoutConfig: Record<string, unknown>;
  filtersConfig: Record<string, unknown> | null;
  thresholdsConfig: BudgetDashboardThresholdsConfig | null;
};

export type KpiBlock = {
  totalBudget: number;
  committed: number;
  consumed: number;
  forecast: number;
  remaining: number;
  consumptionRate: number;
  totalBudgetTtc?: number | null;
  committedTtc?: number | null;
  consumedTtc?: number | null;
  forecastTtc?: number | null;
  remainingTtc?: number | null;
};

export type BudgetCockpitWidgetDataKpi = {
  kpis: KpiBlock;
  /** Répartition budgétaire CAPEX / OPEX (ExpenseType), distincte du Run/Build. */
  capexOpexDistribution?: { capex: number; opex: number };
  drilldownLinks?: Record<string, string>;
};

export type BudgetCockpitWidgetDataAlertList = {
  items: BudgetDashboardLineRow[];
  totals?: {
    negativeRemaining: number;
    overCommitted: number;
    overConsumed: number;
    forecastOverBudget: number;
  };
};

export type BudgetCockpitEnvelopeRow = {
  envelopeId: string;
  code: string | null;
  name: string;
  totalBudget: number;
  consumed: number;
  remaining: number;
};

export type BudgetCockpitRiskEnvelopeRow = {
  envelopeId: string;
  code: string | null;
  name: string;
  forecast: number;
  budgetAmount: number;
  riskRatio: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
};

export type BudgetCockpitWidgetDataEnvelopeList = {
  topEnvelopes: BudgetCockpitEnvelopeRow[];
  riskEnvelopes: BudgetCockpitRiskEnvelopeRow[];
};

export type BudgetCockpitWidgetDataLineList = {
  topBudgetLines: BudgetDashboardLineRow[];
  criticalBudgetLines: BudgetDashboardLineRow[];
};

export type BudgetCockpitWidgetDataChartRunBuild = {
  chartType: 'RUN_BUILD_BREAKDOWN';
  series: { run: number; build: number; transverse: number };
  labels: { run: string; build: string; transverse: string };
};

export type BudgetCockpitWidgetDataChartTrend = {
  chartType: 'CONSUMPTION_TREND';
  series: { month: string; committed: number; consumed: number }[];
  labels: { committed: string; consumed: string };
};

export type BudgetCockpitWidgetDataChart =
  | BudgetCockpitWidgetDataChartRunBuild
  | BudgetCockpitWidgetDataChartTrend;

export type BudgetCockpitWidgetPayload =
  | {
      id: string;
      type: 'KPI';
      position: number;
      title: string;
      size: string;
      isActive: boolean;
      settings: Record<string, unknown> | null;
      data: BudgetCockpitWidgetDataKpi | null;
    }
  | {
      id: string;
      type: 'ALERT_LIST';
      position: number;
      title: string;
      size: string;
      isActive: boolean;
      settings: Record<string, unknown> | null;
      data: BudgetCockpitWidgetDataAlertList | null;
    }
  | {
      id: string;
      type: 'ENVELOPE_LIST';
      position: number;
      title: string;
      size: string;
      isActive: boolean;
      settings: Record<string, unknown> | null;
      data: BudgetCockpitWidgetDataEnvelopeList | null;
    }
  | {
      id: string;
      type: 'LINE_LIST';
      position: number;
      title: string;
      size: string;
      isActive: boolean;
      settings: Record<string, unknown> | null;
      data: BudgetCockpitWidgetDataLineList | null;
    }
  | {
      id: string;
      type: 'CHART';
      position: number;
      title: string;
      size: string;
      isActive: boolean;
      settings: Record<string, unknown> | null;
      data: BudgetCockpitWidgetDataChart | null;
    };

export type BudgetCockpitResponse = {
  config: BudgetCockpitConfigBlock;
  exercise: BudgetCockpitExercise;
  budget: BudgetCockpitBudget;
  widgets: BudgetCockpitWidgetPayload[];
};

/** @deprecated Utiliser BudgetCockpitResponse (RFC-022). */
export type BudgetDashboardResponse = BudgetCockpitResponse;
