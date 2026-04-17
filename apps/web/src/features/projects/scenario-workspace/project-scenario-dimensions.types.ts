/** Types alignés sur les DTO API scénario (RFC-PROJ-SC-002…006). */

import type { PaginatedList } from '../types/project.types';

export type ProjectScenarioFinancialLineApi = {
  id: string;
  clientId: string;
  scenarioId: string;
  projectBudgetLinkId: string | null;
  budgetLineId: string | null;
  label: string;
  costCategory: string | null;
  amountPlanned: string;
  amountForecast: string | null;
  amountActual: string | null;
  currencyCode: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  budgetLine: { id: string; code: string; name: string } | null;
  projectBudgetLink: {
    id: string;
    allocationType: 'FULL' | 'PERCENTAGE' | 'FIXED';
    percentage: string | null;
    amount: string | null;
    budgetLine: { id: string; code: string; name: string };
  } | null;
};

export type ProjectScenarioFinancialSummaryApi = {
  plannedTotal: string;
  forecastTotal: string;
  actualTotal: string;
  varianceVsBaseline: string | null;
  varianceVsActual: string;
  budgetCoverageRate: number | null;
};

export type ProjectScenarioResourcePlanApi = {
  id: string;
  clientId: string;
  scenarioId: string;
  resourceId: string;
  roleLabel: string | null;
  allocationPct: string | null;
  plannedDays: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  resource: { id: string; name: string; code: string | null; type: string };
};

export type ProjectScenarioResourceSummaryApi = {
  plannedDaysTotal: string;
  plannedCostTotal: string;
  plannedFtePeak: string | null;
  distinctResources: number;
};

export type ProjectScenarioTaskType = 'TASK' | 'MILESTONE';

export type ProjectScenarioTaskApi = {
  id: string;
  clientId: string;
  scenarioId: string;
  sourceProjectTaskId: string | null;
  title: string;
  taskType: ProjectScenarioTaskType | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  dependencyIds: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectScenarioTimelineSummaryApi = {
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  criticalPathDuration: string | null;
  milestoneCount: number;
};

export type ProjectScenarioCapacityStatus = 'OVER_CAPACITY' | 'OK' | 'UNDER_CAPACITY';

export type ProjectScenarioCapacitySnapshotApi = {
  id: string;
  clientId: string;
  projectId: string;
  scenarioId: string;
  resourceId: string;
  snapshotDate: string;
  plannedLoadPct: string;
  availableCapacityPct: string;
  variancePct: string;
  status: ProjectScenarioCapacityStatus;
  resource: { id: string; name: string; type: string } | null;
};

export type ProjectScenarioCapacitySummaryApi = {
  overCapacityCount: number;
  underCapacityCount: number;
  peakLoadPct: string | null;
  averageLoadPct: string | null;
};

export type ProjectScenarioCapacityRecomputeApi = {
  scenarioId: string;
  deletedCount: number;
  createdCount: number;
};

export type ProjectScenarioRiskApi = {
  id: string;
  clientId: string;
  scenarioId: string;
  riskTypeId: string | null;
  title: string;
  description: string | null;
  probability: number;
  impact: number;
  criticalityScore: number;
  mitigationPlan: string | null;
  ownerLabel: string | null;
  createdAt: string;
  updatedAt: string;
  riskType: { id: string; code: string; label: string } | null;
};

export type ProjectScenarioRiskSummaryApi = {
  criticalRiskCount: number;
  averageCriticality: number | null;
  maxCriticality: number | null;
};

export type ScenarioBootstrapFromPlanApi = {
  scenarioId: string;
  createdCount: number;
  skippedDependencyCount: number;
};

export type PaginatedScenario<T> = PaginatedList<T>;
