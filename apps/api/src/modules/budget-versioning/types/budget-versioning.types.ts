import {
  BudgetVersionKind,
  BudgetVersionStatus,
} from '@prisma/client';

export interface VersionSetListItem {
  id: string;
  clientId: string;
  exerciseId: string;
  code: string;
  name: string;
  description: string | null;
  baselineBudgetId: string | null;
  activeBudgetId: string | null;
  createdAt: Date;
}

export interface BudgetVersionSummary {
  id: string;
  versionNumber: number | null;
  versionLabel: string | null;
  versionKind: BudgetVersionKind | null;
  versionStatus: BudgetVersionStatus | null;
  parentBudgetId: string | null;
  activatedAt: Date | null;
  archivedAt: Date | null;
  code: string;
  name: string;
  status: string;
}

export interface VersionSetDetail extends VersionSetListItem {
  baseline: BudgetVersionSummary | null;
  active: BudgetVersionSummary | null;
  versions: BudgetVersionSummary[];
}

export interface CreateBaselineResponse {
  versionSetId: string;
  budgetId: string;
  versionNumber: number;
  versionLabel: string;
  versionKind: BudgetVersionKind;
  versionStatus: BudgetVersionStatus;
}

export interface CreateRevisionResponse {
  versionSetId: string;
  budgetId: string;
  versionNumber: number;
  versionLabel: string;
  versionKind: BudgetVersionKind;
  versionStatus: BudgetVersionStatus;
  parentBudgetId: string;
}

export interface CompareLineDelta {
  code: string;
  source: {
    revisedAmount: number;
    initialAmount?: number;
    forecastAmount?: number;
  };
  target: {
    revisedAmount: number;
    initialAmount?: number;
    forecastAmount?: number;
  };
  delta: {
    revisedAmount: number;
    initialAmount?: number;
    forecastAmount?: number;
  };
}

export interface CompareVersionsResponse {
  sourceBudgetId: string;
  targetBudgetId: string;
  lines: CompareLineDelta[];
}
