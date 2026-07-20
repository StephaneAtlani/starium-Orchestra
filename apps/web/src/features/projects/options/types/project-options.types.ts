/** Aligné sur GET/PUT /api/projects/:projectId/microsoft-link (Prisma ProjectMicrosoftLink). */
export type ProjectMicrosoftLinkDto = {
  id: string;
  clientId: string;
  projectId: string;
  microsoftConnectionId: string | null;

  isEnabled: boolean;

  teamId: string | null;
  teamName: string | null;
  channelId: string | null;
  channelName: string | null;
  plannerPlanId: string | null;
  plannerPlanTitle: string | null;

  filesDriveId: string | null;
  filesFolderId: string | null;

  syncTasksEnabled: boolean;
  syncDocumentsEnabled: boolean;
  /** Buckets planning = colonnes Planner (remplace les buckets Starium). */
  useMicrosoftPlannerBuckets: boolean;

  /** Labels planning (Planner categories) appliqués aux tâches (tâches uniquement). */
  useMicrosoftPlannerLabels: boolean;

  lastSyncAt: string | null;

  createdAt: string;
  updatedAt: string;
};

export type ProjectMicrosoftTeamsProvisioningSettingsDto = {
  id: string | null;
  clientId: string;
  isEnabled: boolean;
  offerOnProjectCreate: boolean;
  teamNameTemplate: string;
  teamDescriptionTemplate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ProjectMicrosoftTeamsChannelTemplateDto = {
  id: string;
  clientId: string;
  settingsId: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateTeamsProvisioningSettingsPayload = {
  isEnabled: boolean;
  offerOnProjectCreate: boolean;
  teamNameTemplate: string;
  teamDescriptionTemplate?: string;
};

export type CreateTeamsChannelTemplatePayload = {
  displayName: string;
  description?: string;
  isPrimary: boolean;
};

export type UpdateTeamsChannelTemplatePayload = Partial<CreateTeamsChannelTemplatePayload>;

export type ReorderTeamsChannelTemplatesPayload = {
  items: Array<{ id: string; sortOrder: number }>;
};

export type ProjectMicrosoftTeamsProvisioningDto = {
  id: string;
  clientId: string;
  projectId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  teamDisplayName: string;
  teamDescription: string | null;
  microsoftTeamId: string | null;
  teamWebUrl: string | null;
  graphOperationUrl: string | null;
  graphContentLocation: string | null;
  graphCreateRequestedAt: string | null;
  retryCount: number;
  retryRequestedAt: string | null;
  currentJobId: string | null;
  lastHeartbeatAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  resolvedAt: string | null;
  resolutionType: 'TEAM_FOUND' | 'CONFIRMED_NOT_CREATED' | null;
  createdAt: string;
  updatedAt: string;
};

export type ResolveProjectMicrosoftTeamsProvisioningPayload =
  | {
      resolutionType: 'TEAM_FOUND';
      teamId: string;
    }
  | {
      resolutionType: 'CONFIRMED_NOT_CREATED';
      confirmation: true;
    };

/** Payload PUT — aligné sur UpdateProjectMicrosoftLinkDto backend. */
export type UpdateProjectMicrosoftLinkPayload = {
  isEnabled: boolean;
  teamId?: string;
  channelId?: string;
  plannerPlanId?: string;
  teamName?: string;
  channelName?: string;
  plannerPlanTitle?: string;
  filesDriveId?: string;
  filesFolderId?: string;
  syncTasksEnabled?: boolean;
  syncDocumentsEnabled?: boolean;
  useMicrosoftPlannerBuckets?: boolean;
  useMicrosoftPlannerLabels?: boolean;
};

export type SyncTasksResult = {
  projectId: string;
  status: 'success' | 'failed';
  summary: {
    plannerTasksRead: number;
    createdInStarium: number;
    updatedInStarium: number;
    syncedToPlanner: number;
    conflictsResolvedByStarium: number;
    errors: number;
  };
  lastSyncAt: string | null;
};

export type SyncDocumentsResult = {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
};
