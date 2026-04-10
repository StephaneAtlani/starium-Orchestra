/**
 * Types alignés sur la réponse API GET /api/budget-dashboard (RFC-022).
 */

export type BudgetDashboardLineRiskLevel = 'OK' | 'WARNING' | 'CRITICAL';

export interface BudgetDashboardLineRow {
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
}

export type BudgetDashboardThresholdsConfig = {
  consumptionRateWarning?: number;
  consumptionRateCritical?: number;
  negativeRemaining?: boolean;
  maxAlertItems?: number;
};

export type BudgetCockpitKpiBlock = {
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
  kpis: BudgetCockpitKpiBlock;
  capexOpexDistribution?: { capex: number; opex: number };
  drilldownLinks?: Record<string, string>;
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
      data: {
        items: BudgetDashboardLineRow[];
        totals?: {
          negativeRemaining: number;
          overCommitted: number;
          overConsumed: number;
          forecastOverBudget: number;
        };
      } | null;
    }
  | {
      id: string;
      type: 'ENVELOPE_LIST';
      position: number;
      title: string;
      size: string;
      isActive: boolean;
      settings: Record<string, unknown> | null;
      data: {
        topEnvelopes: BudgetCockpitEnvelopeRow[];
        riskEnvelopes: BudgetCockpitRiskEnvelopeRow[];
      } | null;
    }
  | {
      id: string;
      type: 'LINE_LIST';
      position: number;
      title: string;
      size: string;
      isActive: boolean;
      settings: Record<string, unknown> | null;
      data: {
        topBudgetLines: BudgetDashboardLineRow[];
        criticalBudgetLines: BudgetDashboardLineRow[];
      } | null;
    }
  | {
      id: string;
      type: 'CHART';
      position: number;
      title: string;
      size: string;
      isActive: boolean;
      settings: Record<string, unknown> | null;
      data:
        | {
            chartType: 'RUN_BUILD_BREAKDOWN';
            series: { run: number; build: number; transverse: number };
            labels: { run: string; build: string; transverse: string };
          }
        | {
            chartType: 'CONSUMPTION_TREND';
            series: { month: string; committed: number; consumed: number }[];
            labels: { committed: string; consumed: string };
          }
        | null;
    };

export type BudgetCockpitResponse = {
  config: {
    id: string;
    name: string;
    isDefault: boolean;
    defaultExerciseId: string | null;
    defaultBudgetId: string | null;
    layoutConfig: Record<string, unknown>;
    filtersConfig: Record<string, unknown> | null;
    thresholdsConfig: BudgetDashboardThresholdsConfig | null;
  };
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
  widgets: BudgetCockpitWidgetPayload[];
};

/** Alias historique — préférer `BudgetCockpitResponse`. */
export type BudgetDashboardResponse = BudgetCockpitResponse;

export function getCockpitKpiData(
  r: BudgetCockpitResponse,
): BudgetCockpitWidgetDataKpi | null {
  const w = r.widgets.find((x) => x.type === 'KPI');
  if (w?.type === 'KPI' && w.data) return w.data;
  return null;
}

export function getCockpitAlertsSummary(
  r: BudgetCockpitResponse,
): {
  negativeRemaining: number;
  overCommitted: number;
  overConsumed: number;
  forecastOverBudget: number;
} {
  const w = r.widgets.find((x) => x.type === 'ALERT_LIST');
  const t = w?.type === 'ALERT_LIST' && w.data?.totals ? w.data.totals : null;
  return (
    t ?? {
      negativeRemaining: 0,
      overCommitted: 0,
      overConsumed: 0,
      forecastOverBudget: 0,
    }
  );
}

export interface BudgetDashboardQueryParams {
  exerciseId?: string;
  budgetId?: string;
  includeEnvelopes?: boolean;
  includeLines?: boolean;
  /** true => applique les overrides utilisateur ("Personnaliser"), false => version client globale ("global"). */
  useUserOverrides?: boolean;

  /**
   * Quand true => agrège les données sur tous les budgets d’un même exercice.
   * MVP : drilldown désactivé (pas de budget “réel” à lier).
   */
  aggregateBudgetsForExercise?: boolean;
}

/** Config cockpit (liste / édition). */
export type BudgetDashboardConfigDto = {
  id: string;
  name: string;
  isDefault: boolean;
  defaultExerciseId: string | null;
  defaultBudgetId: string | null;
  layoutConfig: Record<string, unknown>;
  filtersConfig: Record<string, unknown> | null;
  thresholdsConfig: Record<string, unknown> | null;
  widgets: {
    id: string;
    type: string;
    position: number;
    title: string;
    size: string;
    isActive: boolean;
    settings: Record<string, unknown> | null;
  }[];
};
