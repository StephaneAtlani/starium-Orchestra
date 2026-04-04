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
  leadResourceId: string | null;
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
  /** Équipes dont cette ressource Humaine est responsable (`WorkTeam.leadResourceId`). */
  leadResourceId?: string;
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
  resourceId: string;
  role: WorkTeamMemberRole;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  resourceDisplayName: string;
  resourceEmail: string | null;
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
  /** Responsable d’équipe — Resource HUMAN, obligatoire à la création (équipe active). */
  leadResourceId: string;
  sortOrder?: number;
};

export type UpdateWorkTeamPayload = {
  name?: string;
  code?: string | null;
  parentId?: string | null;
  leadResourceId?: string | null;
  sortOrder?: number;
};

export type AddWorkTeamMemberPayload = {
  resourceId: string;
  role: WorkTeamMemberRole;
};

export type ManagerScopeDto = {
  id: string | null;
  clientId: string;
  managerResourceId: string;
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
  resourceId: string;
  displayName: string;
  email: string | null;
};

export type ManagerScopePreviewResponse = {
  items: ManagerScopePreviewItem[];
  total: number;
  limit: number;
  offset: number;
};
