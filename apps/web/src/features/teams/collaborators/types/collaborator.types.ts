export type CollaboratorStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED_SYNC';
export type CollaboratorSource = 'MANUAL' | 'DIRECTORY_SYNC';

export type CollaboratorInternalTags = Record<string, unknown> | null;

export type CollaboratorListItem = {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  username: string | null;
  jobTitle: string | null;
  department: string | null;
  managerId: string | null;
  managerDisplayName: string | null;
  status: CollaboratorStatus;
  source: CollaboratorSource;
  internalTags: CollaboratorInternalTags;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollaboratorsListResponse = {
  items: CollaboratorListItem[];
  total: number;
  offset: number;
  limit: number;
};

export type CollaboratorsListParams = {
  search?: string;
  status?: CollaboratorStatus[];
  source?: CollaboratorSource[];
  tag?: string[];
  managerId?: string;
  offset?: number;
  limit?: number;
};

export type CollaboratorManagerOption = {
  id: string;
  displayName: string;
  email?: string | null;
  jobTitle?: string | null;
};

export type CollaboratorOptionsResponse = {
  items: CollaboratorManagerOption[];
  total: number;
  offset: number;
  limit: number;
};

/** POST /api/collaborators — aligné sur CreateCollaboratorDto backend. */
export type CollaboratorCreatePayload = {
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  managerId?: string | null;
  jobTitle?: string | null;
};

export type CollaboratorUpdatePayload = Partial<{
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  email: string | null;
  username: string | null;
  jobTitle: string | null;
  department: string | null;
  managerId: string | null;
  internalNotes: string | null;
  internalTags: Record<string, unknown> | null;
}>;
