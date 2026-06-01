export type GovernanceCycleStatus =
  | 'DRAFT'
  | 'PREPARING'
  | 'TO_ARBITRATE'
  | 'ARBITRATED'
  | 'IN_EXECUTION'
  | 'CLOSED'
  | 'ARCHIVED';

export type GovernanceCycleCadence =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMESTERLY'
  | 'YEARLY'
  | 'ONE_SHOT'
  | 'CONTINUOUS'
  | 'CUSTOM';

export type GovernanceCycleItemDecisionStatus =
  | 'CANDIDATE'
  | 'TO_ARBITRATE'
  | 'ACCEPTED'
  | 'DEFERRED'
  | 'REJECTED'
  | 'NEEDS_INFORMATION'
  | 'ACCEPTED_WITH_RESERVE';

export type GovernanceCycleItemSourceType =
  | 'PROJECT'
  | 'STRATEGIC_OBJECTIVE'
  | 'BUDGET'
  | 'BUDGET_LINE'
  | 'RISK'
  | 'MANUAL';

export type GovernanceCycleSummaryDto = {
  itemsCount: number;
  acceptedItemsCount: number;
  deferredItemsCount: number;
};

export type GovernanceCycleGlobalSummaryDto = {
  cycleId: string;
  totalItems: number;
  candidateCount: number;
  toArbitrateCount: number;
  acceptedCount: number;
  deferredCount: number;
  rejectedCount: number;
  needsInformationCount: number;
  acceptedWithReserveCount: number;
  estimatedBudgetTotal: string;
  estimatedCapacityDaysTotal: string;
  averagePriorityScore: number | null;
  highRiskItemsCount: number;
  generatedAt: string;
};

export type GovernanceCycleResponseDto = {
  id: string;
  name: string;
  code: string | null;
  cadence: GovernanceCycleCadence;
  status: GovernanceCycleStatus;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  sponsorLabel: string | null;
  objectiveSummary: string | null;
  decisionSummary: string | null;
  validatedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  summary: GovernanceCycleSummaryDto;
  governanceConfig?: import('./governance-cycle-instance.types').NormalizedGovernanceCycleConfig;
};

export type GovernanceCycleListResponseDto = {
  items: GovernanceCycleResponseDto[];
  total: number;
  limit: number;
  offset: number;
};

export type GovernanceCycleItemSourceRefDto = {
  id: string;
  label: string;
};

export type GovernanceCycleItemResponseDto = {
  id: string;
  cycleId: string;
  sourceType: GovernanceCycleItemSourceType;
  title: string;
  description: string | null;
  decisionStatus: GovernanceCycleItemDecisionStatus;
  decisionReason: string | null;
  valueScore: number | null;
  riskScore: number | null;
  budgetScore: number | null;
  capacityScore: number | null;
  alignmentScore: number | null;
  priorityScore: number | null;
  estimatedBudgetAmount: string | null;
  estimatedCapacityDays: string | null;
  projectId: string | null;
  budgetId: string | null;
  budgetLineId: string | null;
  strategicObjectiveId: string | null;
  riskId: string | null;
  sourceRef: GovernanceCycleItemSourceRefDto | null;
  createdAt: string;
  updatedAt: string;
};

export type GovernanceCycleItemListResponseDto = {
  items: GovernanceCycleItemResponseDto[];
  total: number;
  limit: number;
  offset: number;
};

export type ListGovernanceCyclesParams = {
  search?: string;
  status?: GovernanceCycleStatus;
  cadence?: GovernanceCycleCadence;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
};

export type ListGovernanceCycleItemsParams = {
  search?: string;
  decisionStatus?: GovernanceCycleItemDecisionStatus;
  sourceType?: GovernanceCycleItemSourceType;
  limit?: number;
  offset?: number;
};

export type GovernanceCycleByProjectItemDto = {
  cycleId: string;
  cycleName: string;
  cadence: GovernanceCycleCadence;
  periodLabel: string;
  decisionStatus: GovernanceCycleItemDecisionStatus;
  priorityScore: number | null;
  lastInstanceId: string | null;
  lastInstancePeriodLabel: string | null;
  lastInstanceScheduledDecisionAt: string | null;
};

export type GovernanceCyclesByProjectResponseDto = {
  items: GovernanceCycleByProjectItemDto[];
};
