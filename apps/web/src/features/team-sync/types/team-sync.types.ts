export type DirectoryConnection = {
  id: string;
  name: string;
  providerType: 'MICROSOFT_GRAPH' | 'LDAP';
  isActive: boolean;
  isSyncEnabled: boolean;
  lockSyncedCollaborators: boolean;
  usersScope?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type DirectoryGroupScope = {
  id: string;
  connectionId: string;
  groupId: string;
  groupName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DirectoryProviderGroup = {
  id: string;
  name: string;
};

export type DirectorySyncPreview = {
  mode: 'FULL' | 'GROUP_FILTERED';
  totalFound: number;
  createCount: number;
  updateCount: number;
  deactivateCount: number;
  items: Array<{
    externalDirectoryId: string;
    displayName: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    username?: string | null;
    department?: string | null;
    jobTitle?: string | null;
    isActive: boolean;
    action: 'create' | 'update';
  }>;
  warnings: string[];
  errors: string[];
};

export type DirectorySyncExecution = {
  jobId: string;
  status: 'COMPLETED' | 'FAILED' | 'RUNNING';
  totalFound: number;
  createdCount: number;
  updatedCount: number;
  deactivatedCount: number;
  skippedCount: number;
  errorCount: number;
};

export type DirectorySyncJob = {
  id: string;
  clientId: string;
  connectionId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  mode: 'FULL' | 'GROUP_FILTERED';
  startedAt: string;
  finishedAt: string | null;
  totalFound: number;
  createdCount: number;
  updatedCount: number;
  deactivatedCount: number;
  skippedCount: number;
  errorCount: number;
  summary?: Record<string, unknown> | null;
};
