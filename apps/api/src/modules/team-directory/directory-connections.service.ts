import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DirectoryProviderType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateDirectoryConnectionDto } from './dto/create-directory-connection.dto';
import { CreateDirectoryGroupScopeDto } from './dto/create-directory-group-scope.dto';
import { UpdateDirectoryConnectionDto } from './dto/update-directory-connection.dto';
import { DirectoryProvider } from './providers/directory-provider.interface';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

@Injectable()
export class DirectoryConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listConnections(clientId: string) {
    return this.prisma.directoryConnection.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createConnection(
    clientId: string,
    dto: CreateDirectoryConnectionDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const row = await this.prisma.directoryConnection.create({
      data: {
        clientId,
        name: dto.name,
        providerType: dto.providerType ?? DirectoryProviderType.MICROSOFT_GRAPH,
        isActive: dto.isActive ?? true,
        isSyncEnabled: dto.isSyncEnabled ?? false,
        lockSyncedCollaborators: dto.lockSyncedCollaborators ?? true,
        usersScope:
          dto.usersScope === undefined
            ? undefined
            : (dto.usersScope as Prisma.InputJsonValue),
        metadata:
          dto.metadata === undefined
            ? undefined
            : (dto.metadata as Prisma.InputJsonValue),
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'directory_connection.created',
      resourceType: 'directory_connection',
      resourceId: row.id,
      newValue: { name: row.name, providerType: row.providerType },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return row;
  }

  async updateConnection(
    clientId: string,
    id: string,
    dto: UpdateDirectoryConnectionDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.directoryConnection.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('DirectoryConnection introuvable');

    const updated = await this.prisma.directoryConnection.update({
      where: { id: existing.id },
      data: {
        name: dto.name ?? undefined,
        providerType: dto.providerType ?? undefined,
        isActive: dto.isActive ?? undefined,
        isSyncEnabled: dto.isSyncEnabled ?? undefined,
        lockSyncedCollaborators: dto.lockSyncedCollaborators ?? undefined,
        usersScope:
          dto.usersScope === undefined
            ? undefined
            : (dto.usersScope as Prisma.InputJsonValue),
        metadata:
          dto.metadata === undefined
            ? undefined
            : (dto.metadata as Prisma.InputJsonValue),
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'directory_connection.updated',
      resourceType: 'directory_connection',
      resourceId: updated.id,
      oldValue: { name: existing.name, isSyncEnabled: existing.isSyncEnabled },
      newValue: { name: updated.name, isSyncEnabled: updated.isSyncEnabled },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return updated;
  }

  async testConnection(
    clientId: string,
    connectionId: string,
    provider: DirectoryProvider,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const conn = await this.getConnectionOrThrow(clientId, connectionId);
    const result = await provider.testConnection({
      id: conn.id,
      clientId: conn.clientId,
      providerType: conn.providerType,
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'directory_connection.tested',
      resourceType: 'directory_connection',
      resourceId: conn.id,
      newValue: { ok: result.ok, providerType: conn.providerType },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return result;
  }

  async listGroupScopes(clientId: string, connectionId: string) {
    await this.getConnectionOrThrow(clientId, connectionId);
    return this.prisma.directoryGroupScope.findMany({
      where: { clientId, connectionId },
      orderBy: [{ groupName: 'asc' }],
    });
  }

  async addGroupScope(
    clientId: string,
    connectionId: string,
    dto: CreateDirectoryGroupScopeDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    await this.getConnectionOrThrow(clientId, connectionId);
    const row = await this.prisma.directoryGroupScope.create({
      data: {
        clientId,
        connectionId,
        groupId: dto.groupId,
        groupName: dto.groupName ?? null,
      },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'directory_group_scope.created',
      resourceType: 'directory_group_scope',
      resourceId: row.id,
      newValue: { groupId: row.groupId, groupName: row.groupName },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return row;
  }

  async deleteGroupScope(
    clientId: string,
    connectionId: string,
    groupScopeId: string,
    actorUserId?: string,
    meta?: AuditMeta,
  ): Promise<void> {
    await this.getConnectionOrThrow(clientId, connectionId);
    const existing = await this.prisma.directoryGroupScope.findFirst({
      where: { id: groupScopeId, clientId, connectionId },
    });
    if (!existing) throw new NotFoundException('DirectoryGroupScope introuvable');
    await this.prisma.directoryGroupScope.delete({ where: { id: existing.id } });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'directory_group_scope.deleted',
      resourceType: 'directory_group_scope',
      resourceId: existing.id,
      oldValue: { groupId: existing.groupId, groupName: existing.groupName },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
  }

  async getConnectionOrThrow(clientId: string, connectionId: string) {
    const row = await this.prisma.directoryConnection.findFirst({
      where: { id: connectionId, clientId },
    });
    if (!row) throw new NotFoundException('DirectoryConnection introuvable');
    return row;
  }
}
