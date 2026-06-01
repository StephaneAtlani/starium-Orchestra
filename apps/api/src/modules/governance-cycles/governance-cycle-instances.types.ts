import type {
  GovernanceCycleInstanceMode,
  GovernanceCycleInstanceStatus,
  GovernanceCycleItemDecisionStatus,
} from '@prisma/client';
import type { GovernanceCycleItemResponseDto } from './governance-cycles.types';

export type GovernanceCycleInstanceAgendaEntryDto = {
  itemId: string;
  sortOrder: number;
  item: GovernanceCycleItemResponseDto;
};

export type GovernanceCycleInstanceDecisionDto = {
  id: string;
  itemId: string;
  decisionStatus: GovernanceCycleItemDecisionStatus;
  decisionReason: string | null;
  decidedAt: string | null;
  decidedByUserId: string | null;
};

export type GovernanceCycleInstanceResponseDto = {
  id: string;
  cycleId: string;
  periodLabel: string | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  label: string | null;
  scheduledDecisionAt: string | null;
  endsAt: string | null;
  mode: GovernanceCycleInstanceMode;
  status: GovernanceCycleInstanceStatus;
  locationLabel: string | null;
  meetingUrl: string | null;
  decisionSummary: string | null;
  openedAt: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  agendaCount: number;
  decidedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GovernanceCycleInstanceDetailDto = GovernanceCycleInstanceResponseDto & {
  agenda: GovernanceCycleInstanceAgendaEntryDto[];
  decisions: GovernanceCycleInstanceDecisionDto[];
};

export type GovernanceCycleInstanceListResponseDto = {
  items: GovernanceCycleInstanceResponseDto[];
};
