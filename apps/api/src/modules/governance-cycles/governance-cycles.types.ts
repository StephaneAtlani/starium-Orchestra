import type {
  GovernanceCycleCadence,
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
  GovernanceCycleStatus,
} from '@prisma/client';

export type GovernanceCycleSummaryDto = {
  itemsCount: number;
  acceptedItemsCount: number;
  deferredItemsCount: number;
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
