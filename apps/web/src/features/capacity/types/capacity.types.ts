export type CapacitySource =
  | 'CALENDAR'
  | 'CLIENT_PARAM'
  | 'MEMBER_EXCEPTION'
  | 'SIRH';

export type CapacityAllocationSourceType =
  | 'MANUAL'
  | 'PROJECT'
  | 'PROJECT_RISK'
  | 'ACTION_PLAN';

export type CapacityCommitmentKind = 'FORECAST' | 'COMMITTED' | 'EXCLUDED';

export type MonthlyCapacityRow = {
  yearMonth: string;
  days: number;
  source: CapacitySource;
};

export type MemberMonthlyCapacityRow = {
  yearMonth: string;
  days: number | null;
  resolvedDays: number;
  source: CapacitySource;
  inherits: boolean;
};

export type CapacityAllocationDto = {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  comment: string | null;
  workTeamId: string | null;
  workTeamName: string | null;
  resourceId: string | null;
  resourceName: string | null;
  sourceType: CapacityAllocationSourceType;
  sourceId: string | null;
  sourceRestricted: boolean;
  sourceRef: { type: CapacityAllocationSourceType; id: string; label: string } | null;
  commitmentKind: CapacityCommitmentKind;
  months: Array<{ yearMonth: string; days: number }>;
};

export type CapacityDashboardRow = {
  id: string;
  label: string;
  yearMonth: string;
  capacity: number;
  allocated: number;
  forecast?: number;
  committed?: number;
  available: number;
  bucket?: 'NO_ACTIVE_WORK_TEAM';
};

export type CapacityPortfolioSummary = {
  yearMonth: string;
  capacity: number;
  allocated: number;
  forecast?: number;
  committed?: number;
  available: number;
};
