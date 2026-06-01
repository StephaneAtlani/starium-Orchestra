import type {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemResponseDto,
} from './governance-cycle.types';

export type GovernanceCycleInstanceMode = 'MEETING' | 'DECISION_RECORD' | 'VOTE';

export type GovernanceCycleInstanceStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'OPEN'
  | 'CLOSED'
  | 'CANCELLED'
  | 'ARCHIVED';

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

export type GovernanceCycleInstanceDetailDto = GovernanceCycleInstanceResponseDto & {
  agenda: GovernanceCycleInstanceAgendaEntryDto[];
  decisions: GovernanceCycleInstanceDecisionDto[];
};

export type GovernanceCycleInstanceListResponseDto = {
  items: GovernanceCycleInstanceResponseDto[];
};

export type NormalizedGovernanceCycleConfig = {
  version: 1;
  allowedSourceTypes: string[];
  defaultInstanceMode?: GovernanceCycleInstanceMode;
  instanceSchedule?: {
    enabled: boolean;
    count?: number;
    firstDecisionAt?: string;
    stepMonths?: number;
  };
  propagation: {
    project: 'NONE' | 'WRITE_ARBITRATION_CODIR';
    budget: 'NONE' | 'WRITE_BUDGET_GOVERNANCE_DECISION';
  };
  readinessRules?: {
    enforceOnInstanceClose: boolean;
    onAcceptedDecision?: Record<string, boolean>;
  };
};
