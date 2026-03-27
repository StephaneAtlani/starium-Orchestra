import { Injectable } from '@nestjs/common';
import { DirectoryProviderType } from '@prisma/client';
import { MicrosoftGraphService } from '../../microsoft/microsoft-graph.service';
import { MicrosoftOAuthService } from '../../microsoft/microsoft-oauth.service';
import {
  DirectoryGroupRecord,
  DirectoryProvider,
  DirectoryProviderConnection,
  DirectoryUserRecord,
} from './directory-provider.interface';

type GraphListResponse<T> = {
  value?: T[];
  '@odata.nextLink'?: string;
};

type GraphUser = {
  id?: string;
  givenName?: string | null;
  surname?: string | null;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  businessPhones?: string[] | null;
  mobilePhone?: string | null;
  employeeId?: string | null;
  accountEnabled?: boolean | null;
};

@Injectable()
export class MicrosoftGraphDirectoryProvider implements DirectoryProvider {
  readonly providerType = DirectoryProviderType.MICROSOFT_GRAPH;

  constructor(
    private readonly oauth: MicrosoftOAuthService,
    private readonly graph: MicrosoftGraphService,
  ) {}

  async testConnection(
    connection: DirectoryProviderConnection,
  ): Promise<{ ok: true; message: string }> {
    const token = await this.getClientAccessToken(connection.clientId);
    await this.graph.getJson<{ id: string }>(token, '/organization?$top=1', {
      expectJson: true,
    });
    return { ok: true, message: 'Connexion Microsoft Graph valide.' };
  }

  async listUsers(
    connection: DirectoryProviderConnection,
    options: { groupIds?: string[] },
  ): Promise<DirectoryUserRecord[]> {
    const token = await this.getClientAccessToken(connection.clientId);

    const groupIds = options.groupIds?.filter((v) => v.trim().length > 0) ?? [];
    const users =
      groupIds.length > 0
        ? await this.fetchUsersByGroups(token, groupIds)
        : await this.fetchAllUsers(token);

    return users
      .map((u) => this.mapUser(u))
      .filter((u): u is DirectoryUserRecord => Boolean(u));
  }

  async listGroups(connection: DirectoryProviderConnection): Promise<DirectoryGroupRecord[]> {
    const token = await this.getClientAccessToken(connection.clientId);

    const rows = await this.fetchAllPages<{ id?: string; displayName?: string }>(
      token,
      '/groups?$select=id,displayName&$top=200',
    );
    return rows
      .filter((r): r is { id: string; displayName?: string } => Boolean(r.id))
      .map((r) => ({ id: r.id, name: r.displayName ?? r.id }));
  }

  private async fetchAllUsers(token: string): Promise<GraphUser[]> {
    return this.fetchAllPages<GraphUser>(
      token,
      '/users?$select=id,givenName,surname,displayName,mail,userPrincipalName,jobTitle,department,businessPhones,mobilePhone,employeeId,accountEnabled&$top=200',
    );
  }

  private async fetchUsersByGroups(token: string, groupIds: string[]): Promise<GraphUser[]> {
    const byId = new Map<string, GraphUser>();
    for (const groupId of groupIds) {
      const rows = await this.fetchAllPages<GraphUser>(
        token,
        `/groups/${encodeURIComponent(groupId)}/members/microsoft.graph.user?$select=id,givenName,surname,displayName,mail,userPrincipalName,jobTitle,department,businessPhones,mobilePhone,employeeId,accountEnabled&$top=200`,
      );
      for (const row of rows) {
        if (!row.id) continue;
        byId.set(row.id, row);
      }
    }
    return [...byId.values()];
  }

  private mapUser(user: GraphUser): DirectoryUserRecord | null {
    if (!user.id) return null;
    const displayName =
      user.displayName?.trim() ||
      [user.givenName ?? '', user.surname ?? ''].join(' ').trim() ||
      user.userPrincipalName?.trim() ||
      user.mail?.trim() ||
      user.id;
    return {
      externalDirectoryId: user.id,
      externalUsername: user.userPrincipalName ?? user.mail ?? null,
      firstName: user.givenName ?? null,
      lastName: user.surname ?? null,
      displayName,
      email: user.mail ?? null,
      username: user.userPrincipalName ?? null,
      jobTitle: user.jobTitle ?? null,
      department: user.department ?? null,
      phone: user.businessPhones?.[0] ?? null,
      mobile: user.mobilePhone ?? null,
      employeeNumber: user.employeeId ?? null,
      isActive: user.accountEnabled !== false,
    };
  }

  private async fetchAllPages<T>(token: string, path: string): Promise<T[]> {
    const results: T[] = [];
    let nextPath: string | null = path;
    while (nextPath) {
      const response = (await this.graph.getJson<GraphListResponse<T>>(token, nextPath, {
        expectJson: true,
      })) as GraphListResponse<T> | void;
      if (!response) break;
      if (Array.isArray(response.value)) {
        results.push(...response.value);
      }
      const next = response['@odata.nextLink'];
      if (!next) {
        nextPath = null;
      } else if (next.startsWith('https://graph.microsoft.com/v1.0/')) {
        nextPath = next.replace('https://graph.microsoft.com/v1.0/', '/');
      } else {
        nextPath = next;
      }
    }
    return results;
  }

  private async getClientAccessToken(clientId: string): Promise<string> {
    const activeMicrosoftConnection = await this.oauth.getActiveConnection(clientId);
    if (!activeMicrosoftConnection) {
      throw new Error('Connexion Microsoft introuvable');
    }
    return this.oauth.ensureFreshAccessToken(activeMicrosoftConnection.id, clientId);
  }
}
