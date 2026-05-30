import type {
  GovernanceCycleCadence,
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
