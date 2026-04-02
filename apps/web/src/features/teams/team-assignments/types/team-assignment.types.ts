/** Aligné sur `ActivityTaxonomyKind` Prisma / réponse API. */
export type ActivityTaxonomyKind =
  | 'PROJECT'
  | 'RUN'
  | 'SUPPORT'
  | 'TRANSVERSE'
  | 'OTHER';

export type TeamResourceAssignment = {
  id: string;
  clientId: string;
  collaboratorId: string;
  collaboratorDisplayName: string;
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  activityTypeId: string;
  activityTypeName: string;
  activityTypeKind: ActivityTaxonomyKind;
  projectTeamRoleId: string | null;
  roleLabel: string;
  startDate: string;
  endDate: string | null;
  allocationPercent: number;
  notes: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamResourceAssignmentsListResponse = {
  items: TeamResourceAssignment[];
  total: number;
  limit: number;
  offset: number;
};

/** Query GET /api/team-resource-assignments — aligné ListTeamResourceAssignmentsQueryDto. */
export type TeamResourceAssignmentsListParams = {
  offset?: number;
  limit?: number;
  collaboratorId?: string;
  projectId?: string;
  activityTypeId?: string;
  includeCancelled?: boolean;
  from?: string;
  to?: string;
  activeOn?: string;
};

export type CreateTeamResourceAssignmentPayload = {
  collaboratorId: string;
  projectId?: string;
  activityTypeId: string;
  projectTeamRoleId?: string;
  roleLabel: string;
  startDate: string;
  endDate?: string;
  allocationPercent: number;
  notes?: string;
};

export type UpdateTeamResourceAssignmentPayload = {
  collaboratorId?: string;
  projectId?: string | null;
  activityTypeId?: string;
  projectTeamRoleId?: string | null;
  roleLabel?: string;
  startDate?: string;
  endDate?: string;
  allocationPercent?: number;
  notes?: string;
};

/** RFC-TEAM-008 — création depuis projet (pas de projectId dans le body). */
export type CreateProjectResourceAssignmentPayload = {
  collaboratorId: string;
  activityTypeId: string;
  projectTeamRoleId?: string;
  roleLabel: string;
  startDate: string;
  endDate?: string;
  allocationPercent: number;
  notes?: string;
};

export type UpdateProjectResourceAssignmentPayload =
  UpdateTeamResourceAssignmentPayload;

export type ProjectResourceAssignmentsListParams =
  TeamResourceAssignmentsListParams;
