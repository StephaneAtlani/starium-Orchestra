import { DirectoryProviderType } from '@prisma/client';

export type DirectoryUserRecord = {
  externalDirectoryId: string;
  externalUsername?: string | null;
  externalRef?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  email?: string | null;
  username?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  mobile?: string | null;
  employeeNumber?: string | null;
  managerExternalDirectoryId?: string | null;
  isActive: boolean;
};

export type DirectoryGroupRecord = {
  id: string;
  name: string;
};

export type DirectoryProviderConnection = {
  id: string;
  clientId: string;
  providerType: DirectoryProviderType;
};

export interface DirectoryProvider {
  readonly providerType: DirectoryProviderType;
  testConnection(connection: DirectoryProviderConnection): Promise<{ ok: true; message: string }>;
  listUsers(
    connection: DirectoryProviderConnection,
    options: { groupIds?: string[] },
  ): Promise<DirectoryUserRecord[]>;
  listGroups(connection: DirectoryProviderConnection): Promise<DirectoryGroupRecord[]>;
}
