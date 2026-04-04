export type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED';

export type ResourceTimeEntryDto = {
  id: string;
  clientId: string;
  resourceId: string;
  resourceDisplayName: string;
  workDate: string;
  durationHours: number;
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  activityTypeId: string | null;
  activityTypeName: string | null;
  status: TimeEntryStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResourceTimeEntriesListParams = {
  offset?: number;
  limit?: number;
  resourceId?: string;
  projectId?: string;
  status?: TimeEntryStatus;
  from?: string;
  to?: string;
};

export type ResourceTimeEntriesListResponse = {
  items: ResourceTimeEntryDto[];
  total: number;
  limit: number;
  offset: number;
};
