import { Injectable } from '@nestjs/common';
import {
  CollaboratorSource,
  DirectoryProviderType,
  DirectorySyncJobStatus,
  DirectorySyncMode,
  ExternalDirectoryType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CollaboratorsService,
  DirectoryCollaboratorInput,
} from '../collaborators/collaborators.service';
import { RunDirectorySyncDto } from './dto/run-directory-sync.dto';
import { DirectoryConnectionsService } from './directory-connections.service';
import { DirectoryProvider } from './providers/directory-provider.interface';
import { MicrosoftGraphDirectoryProvider } from './providers/microsoft-graph-directory.provider';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

@Injectable()
export class TeamDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly collaborators: CollaboratorsService,
    private readonly connections: DirectoryConnectionsService,
    private readonly microsoftGraphProvider: MicrosoftGraphDirectoryProvider,
  ) {}

  async testConnection(
    clientId: string,
    connectionId: string,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const conn = await this.connections.getConnectionOrThrow(clientId, connectionId);
    const provider = this.resolveProvider(conn.providerType);
    return this.connections.testConnection(
      clientId,
      connectionId,
      provider,
      actorUserId,
      meta,
    );
  }

  async previewSync(clientId: string, dto: RunDirectorySyncDto) {
    const data = await this.collectSyncData(clientId, dto.connectionId);
    const existing = await this.prisma.collaborator.findMany({
      where: { clientId, source: CollaboratorSource.DIRECTORY_SYNC },
      select: { externalDirectoryId: true },
    });
    const existingExternalIds = new Set(
      existing
        .map((c) => c.externalDirectoryId)
        .filter((v): v is string => Boolean(v)),
    );
    return {
      mode: data.mode,
      totalFound: data.users.length,
      createCount: data.createCount,
      updateCount: data.updateCount,
      deactivateCount: data.deactivateCount,
      items: data.users.map((user) => ({
        externalDirectoryId: user.externalDirectoryId,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        department: user.department,
        jobTitle: user.jobTitle,
        isActive: user.isActive,
        action: existingExternalIds.has(user.externalDirectoryId) ? 'update' : 'create',
      })),
      warnings: [] as string[],
      errors: [] as string[],
    };
  }

  async executeSync(
    clientId: string,
    dto: RunDirectorySyncDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const data = await this.collectSyncData(clientId, dto.connectionId);
    const job = await this.prisma.directorySyncJob.create({
      data: {
        clientId,
        connectionId: dto.connectionId,
        status: DirectorySyncJobStatus.RUNNING,
        mode: data.mode,
        totalFound: data.users.length,
        triggeredByUserId: actorUserId ?? null,
      },
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let deactivatedCount = 0;

    try {
      const seenExternalIds = new Set<string>();
      for (const user of data.users) {
        seenExternalIds.add(user.externalDirectoryId);
        const action = await this.collaborators.upsertFromDirectory(clientId, user);
        if (action === 'created') createdCount++;
        else if (action === 'updated') updatedCount++;
        else skippedCount++;
      }

      deactivatedCount = await this.collaborators.deactivateMissingDirectoryCollaborators(
        clientId,
        seenExternalIds,
      );

      await this.prisma.directorySyncJob.update({
        where: { id: job.id },
        data: {
          status: DirectorySyncJobStatus.COMPLETED,
          finishedAt: new Date(),
          createdCount,
          updatedCount,
          skippedCount,
          deactivatedCount,
          errorCount: 0,
          summary: {
            providerType: data.connection.providerType,
            groupFiltered: data.mode === DirectorySyncMode.GROUP_FILTERED,
          },
        },
      });

      await this.auditLogs.create({
        clientId,
        userId: actorUserId,
        action: 'collaborator_sync.executed',
        resourceType: 'directory_sync_job',
        resourceId: job.id,
        newValue: {
          totalFound: data.users.length,
          createdCount,
          updatedCount,
          deactivatedCount,
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });

      return {
        jobId: job.id,
        status: DirectorySyncJobStatus.COMPLETED,
        totalFound: data.users.length,
        createdCount,
        updatedCount,
        deactivatedCount,
        skippedCount,
        errorCount: 0,
      };
    } catch (error) {
      await this.prisma.directorySyncJob.update({
        where: { id: job.id },
        data: {
          status: DirectorySyncJobStatus.FAILED,
          finishedAt: new Date(),
          createdCount,
          updatedCount,
          skippedCount,
          deactivatedCount,
          errorCount: 1,
          summary: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });

      await this.auditLogs.create({
        clientId,
        userId: actorUserId,
        action: 'collaborator_sync.failed',
        resourceType: 'directory_sync_job',
        resourceId: job.id,
        newValue: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        requestId: meta?.requestId,
      });
      throw error;
    }
  }

  listJobs(clientId: string) {
    return this.prisma.directorySyncJob.findMany({
      where: { clientId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getJob(clientId: string, id: string) {
    return this.prisma.directorySyncJob.findFirstOrThrow({
      where: { id, clientId },
    });
  }

  async listProviderGroups(clientId: string, connectionId: string) {
    const connection = await this.connections.getConnectionOrThrow(clientId, connectionId);
    const provider = this.resolveProvider(connection.providerType);
    const groups = await provider.listGroups({
      id: connection.id,
      clientId: connection.clientId,
      providerType: connection.providerType,
    });
    return { items: groups };
  }

  private resolveProvider(providerType: DirectoryProviderType): DirectoryProvider {
    if (providerType === DirectoryProviderType.MICROSOFT_GRAPH) {
      return this.microsoftGraphProvider;
    }
    throw new Error(`Provider non supporté en MVP: ${providerType}`);
  }

  private async collectSyncData(clientId: string, connectionId: string) {
    const connection = await this.connections.getConnectionOrThrow(clientId, connectionId);
    const provider = this.resolveProvider(connection.providerType);
    const scopes = await this.prisma.directoryGroupScope.findMany({
      where: { clientId, connectionId, isActive: true },
      select: { groupId: true },
    });
    const groupIds = scopes.map((s) => s.groupId);
    const mode =
      groupIds.length > 0 ? DirectorySyncMode.GROUP_FILTERED : DirectorySyncMode.FULL;

    const usersRaw = await provider.listUsers(
      {
        id: connection.id,
        clientId: connection.clientId,
        providerType: connection.providerType,
      },
      { groupIds },
    );
    const users: DirectoryCollaboratorInput[] = usersRaw.map((u) => ({
      externalDirectoryId: u.externalDirectoryId,
      externalDirectoryType:
        connection.providerType === DirectoryProviderType.MICROSOFT_GRAPH
          ? ExternalDirectoryType.MICROSOFT_GRAPH
          : ExternalDirectoryType.LDAP,
      externalUsername: u.externalUsername ?? u.username ?? null,
      externalRef: u.managerExternalDirectoryId ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      displayName: u.displayName,
      email: u.email ?? null,
      username: u.username ?? null,
      jobTitle: u.jobTitle ?? null,
      department: u.department ?? null,
      phone: u.phone ?? null,
      mobile: u.mobile ?? null,
      employeeNumber: u.employeeNumber ?? null,
      managerExternalDirectoryId: u.managerExternalDirectoryId ?? null,
      isActive: u.isActive,
      syncHash: this.computeSyncHash(u),
    }));

    const existing = await this.prisma.collaborator.findMany({
      where: { clientId, source: CollaboratorSource.DIRECTORY_SYNC },
      select: { id: true, externalDirectoryId: true },
    });
    const existingMap = new Set(
      existing
        .map((e) => e.externalDirectoryId)
        .filter((v): v is string => Boolean(v)),
    );
    const incoming = new Set(users.map((u) => u.externalDirectoryId));
    let createCount = 0;
    let updateCount = 0;
    for (const user of users) {
      if (existingMap.has(user.externalDirectoryId)) updateCount++;
      else createCount++;
    }
    let deactivateCount = 0;
    for (const e of existingMap) {
      if (!incoming.has(e)) deactivateCount++;
    }

    await this.auditLogs.create({
      clientId,
      action: 'collaborator_sync.previewed',
      resourceType: 'directory_connection',
      resourceId: connection.id,
      newValue: { mode, totalFound: users.length, createCount, updateCount, deactivateCount },
    });

    return { connection, mode, users, createCount, updateCount, deactivateCount };
  }

  private computeSyncHash(user: {
    externalDirectoryId: string;
    displayName: string;
    email?: string | null;
    username?: string | null;
    jobTitle?: string | null;
    department?: string | null;
  }): string {
    return [
      user.externalDirectoryId,
      user.displayName,
      user.email ?? '',
      user.username ?? '',
      user.jobTitle ?? '',
      user.department ?? '',
    ].join('|');
  }
}
