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
  days: string | number;
  source: CapacitySource;
};

export type MemberMonthlyCapacityRow = {
  yearMonth: string;
  days: string | number | null;
  resolvedDays: string | number;
  source: CapacitySource;
  inherits: boolean;
};

export type CapacityAllocationDto = {
  id: string;
  startDate: string;
  endDate: string;
  /** J/H — string côté API. */
  totalDays: string | number;
  comment: string | null;
  workTeam: { id: string; name: string; status?: string } | null;
  resource: { id: string; name: string } | null;
  sourceType: CapacityAllocationSourceType;
  sourceId: string | null;
  sourceRestricted: boolean;
  sourceRef: { id: string; label: string } | null;
  commitmentKind: CapacityCommitmentKind;
  months: Array<{ yearMonth: string; days: string | number }>;
  createdAt?: string;
  updatedAt?: string;
};

export type CapacityDashboardRow = {
  id: string;
  label: string;
  yearMonth: string;
  capacity: number | string;
  allocated: number | string;
  forecast?: number | string;
  committed?: number | string;
  available: number | string;
  bucket?: 'NO_ACTIVE_WORK_TEAM';
};

export type CapacityPortfolioSummary = {
  yearMonth: string;
  capacity: number | string;
  allocated: number | string;
  forecast?: number | string;
  committed?: number | string;
  available: number | string;
};

/** Onglets de la page unique capacité. */
export type CapacityWorkspaceTab = 'pilotage' | 'affectations' | 'reglages';

export const CAPACITY_WORKSPACE_TABS: CapacityWorkspaceTab[] = [
  'pilotage',
  'affectations',
  'reglages',
];

export function parseCapacityTab(raw: string | null | undefined): CapacityWorkspaceTab {
  if (raw === 'affectations' || raw === 'reglages' || raw === 'pilotage') return raw;
  if (raw === 'allocations') return 'affectations';
  if (raw === 'settings' || raw === 'members') return 'reglages';
  if (raw === 'dashboard') return 'pilotage';
  return 'pilotage';
}
