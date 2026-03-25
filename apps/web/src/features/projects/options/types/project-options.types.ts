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
  total: number;
  synced: number;
  failed: number;
};

export type SyncDocumentsResult = {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
};
