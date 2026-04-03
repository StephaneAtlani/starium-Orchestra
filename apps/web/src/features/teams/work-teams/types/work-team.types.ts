export type WorkTeamStatus = 'ACTIVE' | 'ARCHIVED';

export type WorkTeamMemberRole = 'MEMBER' | 'LEAD' | 'DEPUTY';

export type ManagerScopeMode = 'DIRECT_REPORTS_ONLY' | 'TEAM_SUBTREE' | 'HYBRID';

export type WorkTeamDto = {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  parentId: string | null;
  status: WorkTeamStatus;
  archivedAt: string | null;
  sortOrder: number;
  leadCollaboratorId: string | null;
  createdAt: string;
  updatedAt: string;
  parentTeamName: string | null;
  leadDisplayName: string | null;
  pathLabel: string;
};

export type WorkTeamTreeNode = {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  status: WorkTeamStatus;
  sortOrder: number;
  hasChildren: boolean;
  leadDisplayName: string | null;
};

export type WorkTeamsListParams = {
  limit?: number;
  offset?: number;
  q?: string;
  parentId?: string | null;
  status?: WorkTeamStatus;
  includeArchived?: boolean;
};

export type WorkTeamsListResponse = {
  items: WorkTeamDto[];
  total: number;
  limit: number;
  offset: number;
};

export type WorkTeamsTreeParams = {
  parentId?: string | null;
  includeArchived?: boolean;
};

export type WorkTeamsTreeResponse = {
  nodes: WorkTeamTreeNode[];
};

export type WorkTeamMemberRow = {
  id: string;
  workTeamId: string;
  collaboratorId: string;
  role: WorkTeamMemberRole;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  collaboratorDisplayName: string;
  collaboratorEmail: string | null;
};

export type WorkTeamMembersParams = {
  limit?: number;
  offset?: number;
  q?: string;
};

export type WorkTeamMembersResponse = {
  items: WorkTeamMemberRow[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateWorkTeamPayload = {
  name: string;
  code?: string | null;
  parentId?: string | null;
  /** Responsable d’équipe — obligatoire à la création (équipe active). */
  leadCollaboratorId: string;
  sortOrder?: number;
};

export type UpdateWorkTeamPayload = {
  name?: string;
  code?: string | null;
  parentId?: string | null;
  leadCollaboratorId?: string | null;
  sortOrder?: number;
};

export type AddWorkTeamMemberPayload = {
  collaboratorId: string;
  role: WorkTeamMemberRole;
};

export type ManagerScopeDto = {
  id: string | null;
  clientId: string;
  managerCollaboratorId: string;
  mode: ManagerScopeMode;
  includeDirectReports: boolean;
  includeTeamSubtree: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  rootTeams: Array<{
    workTeamId: string;
    teamName: string;
    teamCode: string | null;
  }>;
};

export type PutManagerScopePayload = {
  mode: ManagerScopeMode;
  includeDirectReports: boolean;
  includeTeamSubtree: boolean;
  rootTeamIds: string[];
};

export type ManagerScopePreviewParams = {
  limit?: number;
  offset?: number;
  q?: string;
};

export type ManagerScopePreviewItem = {
  collaboratorId: string;
  displayName: string;
  email: string | null;
  status: string;
};

export type ManagerScopePreviewResponse = {
  items: ManagerScopePreviewItem[];
  total: number;
  limit: number;
  offset: number;
};
