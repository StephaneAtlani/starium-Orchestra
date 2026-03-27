import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserRole,
  CollaboratorSource,
  CollaboratorStatus,
  ExternalDirectoryType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ListCollaboratorsQueryDto } from './dto/list-collaborators.query.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

export type DirectoryCollaboratorInput = {
  externalDirectoryId: string;
  externalUsername?: string | null;
  externalRef?: string | null;
  externalDirectoryType: ExternalDirectoryType;
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
  isActive?: boolean;
  syncHash?: string | null;
};

const LOCAL_MUTABLE_FIELDS = new Set([
  'skills',
  'internalNotes',
  'internalTags',
  'assignments',
  'metadata',
]);

@Injectable()
export class CollaboratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(clientId: string, query: ListCollaboratorsQueryDto) {
    const where: Prisma.CollaboratorWhereInput = { clientId };
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { displayName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { department: { contains: s, mode: 'insensitive' } },
      ];
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.collaborator.count({ where }),
      this.prisma.collaborator.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ displayName: 'asc' }],
      }),
    ]);

    return { items, total, offset, limit };
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateCollaboratorDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.collaborator.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Collaborator introuvable');
    }

    const isClientAdmin = actorUserId
      ? await this.isClientAdmin(clientId, actorUserId)
      : false;
    const lockPolicy = await this.getLockPolicy(clientId);
    if (
      lockPolicy.isSyncEnabled &&
      lockPolicy.lockSyncedCollaborators &&
      existing.source === CollaboratorSource.DIRECTORY_SYNC &&
      !isClientAdmin
    ) {
      for (const key of Object.keys(dto)) {
        if (!LOCAL_MUTABLE_FIELDS.has(key)) {
          throw new ForbiddenException(
            'Ce collaborator est synchronisé par annuaire et en lecture seule pour ce champ.',
          );
        }
      }
    }

    const data: Prisma.CollaboratorUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.jobTitle !== undefined) data.jobTitle = dto.jobTitle;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.externalDirectoryType !== undefined) {
      data.externalDirectoryType = dto.externalDirectoryType;
    }
    if (dto.managerId !== undefined) {
      if (dto.managerId === null || dto.managerId === '') {
        data.manager = { disconnect: true };
      } else {
        const manager = await this.prisma.collaborator.findFirst({
          where: { id: dto.managerId, clientId },
          select: { id: true },
        });
        if (!manager) {
          throw new BadRequestException('Manager collaborator introuvable');
        }
        data.manager = { connect: { id: manager.id } };
      }
    }
    if (dto.skills !== undefined) {
      data.skills =
        dto.skills === null ? Prisma.JsonNull : (dto.skills as Prisma.InputJsonValue);
    }
    if (dto.internalNotes !== undefined) data.internalNotes = dto.internalNotes;
    if (dto.internalTags !== undefined) {
      data.internalTags =
        dto.internalTags === null
          ? Prisma.JsonNull
          : (dto.internalTags as Prisma.InputJsonValue);
    }
    if (dto.assignments !== undefined) {
      data.assignments =
        dto.assignments === null
          ? Prisma.JsonNull
          : (dto.assignments as Prisma.InputJsonValue);
    }
    if (dto.metadata !== undefined) {
      data.metadata =
        dto.metadata === null ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue);
    }

    const updated = await this.prisma.collaborator.update({
      where: { id: existing.id },
      data,
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator.updated',
      resourceType: 'collaborator',
      resourceId: updated.id,
      oldValue: { displayName: existing.displayName, status: existing.status },
      newValue: { displayName: updated.displayName, status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return updated;
  }

  async upsertFromDirectory(
    clientId: string,
    input: DirectoryCollaboratorInput,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const byExternalId = await this.prisma.collaborator.findFirst({
      where: { clientId, externalDirectoryId: input.externalDirectoryId },
    });

    const byFallback =
      byExternalId ??
      (await this.prisma.collaborator.findFirst({
        where: {
          clientId,
          OR: [
            ...(input.username
              ? [{ username: { equals: input.username, mode: 'insensitive' as const } }]
              : []),
            ...(input.email
              ? [{ email: { equals: input.email, mode: 'insensitive' as const } }]
              : []),
          ],
        },
      }));

    const payload: Prisma.CollaboratorUncheckedCreateInput = {
      clientId,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      displayName: input.displayName,
      email: input.email ?? null,
      username: input.username ?? null,
      jobTitle: input.jobTitle ?? null,
      department: input.department ?? null,
      phone: input.phone ?? null,
      mobile: input.mobile ?? null,
      employeeNumber: input.employeeNumber ?? null,
      status: input.isActive === false ? CollaboratorStatus.DISABLED_SYNC : CollaboratorStatus.ACTIVE,
      source: CollaboratorSource.DIRECTORY_SYNC,
      externalDirectoryId: input.externalDirectoryId,
      externalDirectoryType: input.externalDirectoryType,
      externalUsername: input.externalUsername ?? input.username ?? null,
      externalRef: input.externalRef ?? null,
      lastSyncedAt: new Date(),
      syncHash: input.syncHash ?? null,
    };

    if (!byFallback) {
      await this.prisma.collaborator.create({ data: payload });
      return 'created';
    }

    await this.prisma.collaborator.update({
      where: { id: byFallback.id },
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        displayName: payload.displayName,
        email: payload.email,
        username: payload.username,
        jobTitle: payload.jobTitle,
        department: payload.department,
        phone: payload.phone,
        mobile: payload.mobile,
        employeeNumber: payload.employeeNumber,
        status: payload.status,
        source: CollaboratorSource.DIRECTORY_SYNC,
        externalDirectoryId: payload.externalDirectoryId,
        externalDirectoryType: payload.externalDirectoryType,
        externalUsername: payload.externalUsername,
        externalRef: payload.externalRef,
        lastSyncedAt: payload.lastSyncedAt,
        syncHash: payload.syncHash,
      },
    });
    return 'updated';
  }

  async reconcileManagers(clientId: string): Promise<void> {
    const synced = await this.prisma.collaborator.findMany({
      where: {
        clientId,
        source: CollaboratorSource.DIRECTORY_SYNC,
        externalRef: { not: null },
      },
      select: { id: true, externalRef: true },
    });
    if (synced.length === 0) return;

    const byExternal = new Map<string, string>();
    for (const row of synced) {
      if (row.externalRef) byExternal.set(row.externalRef, row.id);
    }

    for (const row of synced) {
      const managerId = row.externalRef ? byExternal.get(row.externalRef) : null;
      if (!managerId || managerId === row.id) continue;
      await this.prisma.collaborator.update({
        where: { id: row.id },
        data: { managerId },
      });
    }
  }

  async deactivateMissingDirectoryCollaborators(
    clientId: string,
    seenExternalIds: Set<string>,
  ): Promise<number> {
    const toDisable = await this.prisma.collaborator.findMany({
      where: {
        clientId,
        source: CollaboratorSource.DIRECTORY_SYNC,
        externalDirectoryId: { not: null },
      },
      select: { id: true, externalDirectoryId: true, status: true },
    });

    let count = 0;
    for (const row of toDisable) {
      if (!row.externalDirectoryId || seenExternalIds.has(row.externalDirectoryId)) {
        continue;
      }
      if (row.status === CollaboratorStatus.DISABLED_SYNC) continue;
      await this.prisma.collaborator.update({
        where: { id: row.id },
        data: { status: CollaboratorStatus.DISABLED_SYNC },
      });
      count++;
    }
    return count;
  }

  private async getLockPolicy(clientId: string): Promise<{
    isSyncEnabled: boolean;
    lockSyncedCollaborators: boolean;
  }> {
    const row = await this.prisma.directoryConnection.findFirst({
      where: { clientId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { isSyncEnabled: true, lockSyncedCollaborators: true },
    });
    return {
      isSyncEnabled: row?.isSyncEnabled ?? false,
      lockSyncedCollaborators: row?.lockSyncedCollaborators ?? false,
    };
  }

  private async isClientAdmin(clientId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: { userId, clientId },
      },
      select: { role: true },
    });
    return member?.role === ClientUserRole.CLIENT_ADMIN;
  }
}
