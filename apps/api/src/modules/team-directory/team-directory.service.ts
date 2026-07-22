import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CollaboratorSource,
  ClientUserRole,
  ClientUserStatus,
  DirectoryProviderType,
  DirectorySyncJobStatus,
  DirectorySyncMode,
  ExternalDirectoryType,
  Prisma,
} from '@prisma/client';
import bcrypt from '@/lib/bcrypt-compat';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  CollaboratorsService,
  DirectoryCollaboratorInput,
} from '../collaborators/collaborators.service';
import { RunDirectorySyncDto } from './dto/run-directory-sync.dto';
import { DirectoryConnectionsService } from './directory-connections.service';
import { DirectoryProvider } from './providers/directory-provider.interface';
import { MicrosoftGraphHttpError } from '../microsoft/microsoft-graph.types';
import { MicrosoftGraphDirectoryProvider } from './providers/microsoft-graph-directory.provider';
import { isAutoProvisionUsersEnabled } from '../../common/auth/directory-connection-metadata.util';
import {
  isEmailDomainAllowedForProvisioning,
  readDirectoryProvisioningThresholds,
  type DirectoryProvisioningThresholds,
} from '../../common/auth/directory-connection-metadata.util';
import {
  applyDirectoryIdentityToPlatformUser,
  collectDirectoryEmailCandidates,
  type DirectoryIdentityProvenance,
} from '../../common/auth/directory-identity-provisioning.util';
import {
  EMAIL_COLLISION_CODE,
  EmailReservationService,
} from '../../common/auth/email-reservation.service';
import {
  matchProvisioningFromResolution,
  normalizeEmailCandidates,
  resolveUserIdsByEmails,
} from '../../common/auth/platform-user-email-resolver';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

export type DirectorySyncEntryStatus =
  | 'CREATED'
  | 'UPDATED'
  | 'SKIPPED'
  | 'USER_LINK_REQUIRED';

export type DirectorySyncSummaryEntry = {
  externalDirectoryId: string;
  status: DirectorySyncEntryStatus;
  reasonCode?: string;
};

@Injectable()
export class TeamDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly collaborators: CollaboratorsService,
    private readonly connections: DirectoryConnectionsService,
    private readonly microsoftGraphProvider: MicrosoftGraphDirectoryProvider,
    private readonly emailReservation: EmailReservationService,
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
    const autoProvision = isAutoProvisionUsersEnabled(data.connection);
    let userLinkRequiredCount = 0;
    const entries: DirectorySyncSummaryEntry[] = [];

    for (const user of data.users) {
      const candidates = normalizeEmailCandidates([user.email, user.username]);
      const resolution = await resolveUserIdsByEmails(this.prisma, candidates);
      const match = matchProvisioningFromResolution(resolution);
      let status: DirectorySyncEntryStatus = 'UPDATED';
      if (match.kind === 'not_found' && !autoProvision) {
        status = 'USER_LINK_REQUIRED';
        userLinkRequiredCount++;
      } else if (match.kind === 'ambiguous') {
        status = 'SKIPPED';
      } else if (match.kind === 'not_found' && autoProvision) {
        status = 'CREATED';
      }
      entries.push({
        externalDirectoryId: user.externalDirectoryId,
        status,
        ...(match.kind === 'ambiguous' ? { reasonCode: 'AMBIGUOUS' } : {}),
      });
    }

    return {
      mode: data.mode,
      totalFound: data.users.length,
      createCount: data.createCount,
      updateCount: data.updateCount,
      deactivateCount: data.deactivateCount,
      userLinkRequiredCount,
      entries,
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
        action: entries.find((e) => e.externalDirectoryId === user.externalDirectoryId)
          ?.status,
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
    const autoProvision = isAutoProvisionUsersEnabled(data.connection);
    const thresholds = readDirectoryProvisioningThresholds(data.connection);
    const usersCreatedThisRun = { count: 0 };
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
    let userLinkRequiredCount = 0;
    const summaryEntries: DirectorySyncSummaryEntry[] = [];

    let thresholdExceeded = false;

    try {
      const seenExternalIds = new Set<string>();
      for (const user of data.users) {
        seenExternalIds.add(user.externalDirectoryId);
        try {
          const entryResult = await this.processSyncEntry(
            clientId,
            dto.connectionId,
            data.connection.providerType,
            user,
            autoProvision,
            thresholds,
            usersCreatedThisRun,
            actorUserId,
            meta,
          );
          summaryEntries.push({
            externalDirectoryId: user.externalDirectoryId,
            status: entryResult.status,
            reasonCode: entryResult.reasonCode,
          });
          if (entryResult.status === 'CREATED') createdCount++;
          else if (entryResult.status === 'UPDATED') updatedCount++;
          else if (entryResult.status === 'USER_LINK_REQUIRED') {
            userLinkRequiredCount++;
            updatedCount++;
          } else skippedCount++;
        } catch (error) {
          if (error instanceof SyncThresholdExceededError) {
            thresholdExceeded = true;
            skippedCount++;
            summaryEntries.push({
              externalDirectoryId: user.externalDirectoryId,
              status: 'SKIPPED',
              reasonCode: 'SECURITY_THRESHOLD_EXCEEDED',
            });
            break;
          }
          throw error;
        }
      }

      deactivatedCount = await this.collaborators.deactivateMissingDirectoryCollaborators(
        clientId,
        seenExternalIds,
      );

      await this.prisma.directorySyncJob.update({
        where: { id: job.id },
        data: {
          status: thresholdExceeded
            ? DirectorySyncJobStatus.FAILED
            : DirectorySyncJobStatus.COMPLETED,
          finishedAt: new Date(),
          createdCount,
          updatedCount,
          skippedCount,
          deactivatedCount,
          errorCount: thresholdExceeded ? 1 : 0,
          summary: {
            providerType: data.connection.providerType,
            groupFiltered: data.mode === DirectorySyncMode.GROUP_FILTERED,
            userLinkRequiredCount,
            thresholdExceeded,
            entries: summaryEntries,
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
          userLinkRequiredCount,
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
        userLinkRequiredCount,
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
            entries: summaryEntries,
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

  private async processSyncEntry(
    clientId: string,
    connectionId: string,
    connectionProviderType: DirectoryProviderType,
    user: DirectoryCollaboratorInput,
    autoProvision: boolean,
    thresholds: DirectoryProvisioningThresholds,
    usersCreatedThisRun: { count: number },
    actorUserId?: string,
    meta?: AuditMeta,
  ): Promise<{ status: DirectorySyncEntryStatus; reasonCode?: string }> {
    const provenance: DirectoryIdentityProvenance = {
      directoryConnectionId: connectionId,
      externalDirectoryId: user.externalDirectoryId,
      directorySourceType: connectionProviderType,
      directoryLastSyncedAt: new Date(),
    };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const upsert = await this.collaborators.upsertFromDirectory(clientId, user, tx);
        const candidates = normalizeEmailCandidates([user.email, user.username]);
        if (candidates.length === 0) {
          return {
            status: upsert.action === 'created' ? 'CREATED' : 'UPDATED',
          };
        }

        const resolution = await resolveUserIdsByEmails(tx, candidates);
        const match = matchProvisioningFromResolution(resolution);

        if (match.kind === 'ambiguous') {
          throw new SyncSkipError('AMBIGUOUS');
        }

        if (match.kind === 'not_found') {
          if (!autoProvision) {
            await tx.collaborator.update({
              where: { id: upsert.collaboratorId },
              data: { userId: null },
            });
            await this.auditLogs.create(
              {
                clientId,
                userId: actorUserId,
                action: 'collaborator_sync.entry_user_link_required',
                resourceType: 'collaborator',
                resourceId: upsert.collaboratorId,
                newValue: { externalDirectoryId: user.externalDirectoryId },
                ipAddress: meta?.ipAddress,
                userAgent: meta?.userAgent,
                requestId: meta?.requestId,
              },
              tx,
            );
            return { status: 'USER_LINK_REQUIRED' };
          }
          return this.autoProvisionDirectoryUser(tx, {
            clientId,
            connectionId,
            connectionProviderType,
            user,
            collaboratorId: upsert.collaboratorId,
            actorUserId,
            meta,
            upsertAction: upsert.action,
            thresholds,
            usersCreatedThisRun,
            provenance,
          });
        }

        await tx.collaborator.update({
          where: { id: upsert.collaboratorId },
          data: { userId: match.userId },
        });
        const directorySyncClientCount = await tx.collaborator.count({
          where: { userId: match.userId, source: CollaboratorSource.DIRECTORY_SYNC },
        });
        await applyDirectoryIdentityToPlatformUser(tx, this.emailReservation, {
          clientId,
          userId: match.userId,
          directoryInput: user,
          directorySyncClientCount,
          provenance,
        });
        await this.auditLogs.create(
          {
            clientId,
            userId: actorUserId,
            action: 'collaborator_sync.entry_updated',
            resourceType: 'collaborator',
            resourceId: upsert.collaboratorId,
            newValue: { linkedUserId: match.userId },
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
            requestId: meta?.requestId,
          },
          tx,
        );
        return {
          status: upsert.action === 'created' ? 'CREATED' : 'UPDATED',
        };
      });
    } catch (error) {
      if (error instanceof SyncSkipError) {
        await this.auditLogs.create({
          clientId,
          userId: actorUserId,
          action: 'collaborator_sync.entry_skipped',
          resourceType: 'directory_sync_entry',
          resourceId: user.externalDirectoryId,
          newValue: { reasonCode: error.reasonCode },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          requestId: meta?.requestId,
        });
        return { status: 'SKIPPED', reasonCode: error.reasonCode };
      }
      if (error instanceof ConflictException) {
        const response = error.getResponse() as { code?: string };
        const reasonCode =
          response?.code === EMAIL_COLLISION_CODE ? 'EMAIL_COLLISION' : 'EMAIL_COLLISION';
        await this.auditLogs.create({
          clientId,
          userId: actorUserId,
          action: 'collaborator_sync.entry_skipped',
          resourceType: 'directory_sync_entry',
          resourceId: user.externalDirectoryId,
          newValue: { reasonCode },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          requestId: meta?.requestId,
        });
        return { status: 'SKIPPED', reasonCode };
      }
      throw error;
    }
  }

  private async autoProvisionDirectoryUser(
    tx: Prisma.TransactionClient,
    params: {
      clientId: string;
      connectionId: string;
      connectionProviderType: DirectoryProviderType;
      user: DirectoryCollaboratorInput;
      collaboratorId: string;
      actorUserId?: string;
      meta?: AuditMeta;
      upsertAction: 'created' | 'updated' | 'skipped';
      thresholds: DirectoryProvisioningThresholds;
      usersCreatedThisRun: { count: number };
      provenance: DirectoryIdentityProvenance;
    },
  ): Promise<{ status: DirectorySyncEntryStatus }> {
    const primaryEmail =
      params.user.email?.trim() || params.user.username?.trim() || null;
    if (!primaryEmail?.includes('@')) {
      throw new SyncSkipError('INVALID_EMAIL');
    }
    if (
      !isEmailDomainAllowedForProvisioning(
        primaryEmail,
        params.thresholds.allowedEmailDomains,
      )
    ) {
      throw new SyncSkipError('SECURITY_DOMAIN_DENIED');
    }
    if (params.usersCreatedThisRun.count >= params.thresholds.maxUsersCreatedPerRun) {
      if (params.thresholds.stopOnThresholdExceeded) {
        throw new SyncThresholdExceededError();
      }
      throw new SyncSkipError('SECURITY_THRESHOLD_EXCEEDED');
    }
    const emailCandidates = collectDirectoryEmailCandidates(params.user);
    await this.emailReservation.reserveEmailsForNewUser(tx, emailCandidates);

    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    const platformUser = await tx.user.create({
      data: {
        email: primaryEmail.toLowerCase(),
        passwordHash,
        firstName: params.user.firstName ?? null,
        lastName: params.user.lastName ?? null,
        department: params.user.department ?? null,
        jobTitle: params.user.jobTitle ?? null,
      },
      select: { id: true },
    });
    await this.emailReservation.registerPrimaryEmail(tx, platformUser.id, primaryEmail);
    params.usersCreatedThisRun.count += 1;

    await tx.clientUser.create({
      data: {
        userId: platformUser.id,
        clientId: params.clientId,
        role: ClientUserRole.CLIENT_USER,
        status:
          params.user.isActive === false
            ? ClientUserStatus.SUSPENDED
            : ClientUserStatus.ACTIVE,
      },
    });

    await tx.collaborator.update({
      where: { id: params.collaboratorId },
      data: { userId: platformUser.id },
    });

    await applyDirectoryIdentityToPlatformUser(tx, this.emailReservation, {
      clientId: params.clientId,
      userId: platformUser.id,
      directoryInput: params.user,
      directorySyncClientCount: 1,
      provenance: params.provenance,
    });

    await this.auditLogs.create(
      {
        clientId: params.clientId,
        userId: params.actorUserId,
        action: 'collaborator_sync.entry_created',
        resourceType: 'collaborator',
        resourceId: params.collaboratorId,
        newValue: { linkedUserId: platformUser.id, autoProvisioned: true },
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
        requestId: params.meta?.requestId,
      },
      tx,
    );

    return {
      status: params.upsertAction === 'created' ? 'CREATED' : 'UPDATED',
    };
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
    try {
      const groups = await provider.listGroups({
        id: connection.id,
        clientId: connection.clientId,
        providerType: connection.providerType,
      });
      return { items: groups };
    } catch (e) {
      this.rethrowGraphProviderError(e);
    }
  }

  private rethrowGraphProviderError(e: unknown): never {
    if (e instanceof MicrosoftGraphHttpError) {
      if (e.statusCode === 401) {
        throw new UnauthorizedException(
          e.graphMessage ??
            'Accès Microsoft Graph non autorisé. Reconnectez la connexion Microsoft.',
        );
      }
      if (e.statusCode === 403) {
        throw new ForbiddenException(
          e.graphMessage ??
            'Accès Microsoft Graph refusé (scope Group.Read.All requis).',
        );
      }
      if (e.statusCode === 0) {
        throw new BadGatewayException(
          e.graphMessage ??
            'Impossible de joindre Microsoft Graph. Vérifiez la connectivité réseau du serveur.',
        );
      }
      throw new BadGatewayException(e.graphMessage ?? 'Erreur Microsoft Graph');
    }
    throw e;
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

class SyncSkipError extends Error {
  constructor(public readonly reasonCode: string) {
    super(reasonCode);
  }
}

class SyncThresholdExceededError extends Error {
  constructor() {
    super('SECURITY_THRESHOLD_EXCEEDED');
  }
}
