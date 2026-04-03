import {
  BadRequestException,
  ConflictException,
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
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { ListCollaboratorOptionsQueryDto } from './dto/list-collaborator-options.query.dto';
import { ListCollaboratorsQueryDto } from './dto/list-collaborators.query.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { UpdateCollaboratorStatusDto } from './dto/update-collaborator-status.dto';

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
  'status',
  'internalNotes',
  'internalTags',
]);

@Injectable()
export class CollaboratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Aligne prénom, nom et displayName d’un collaborateur sur l’identité « Humain » (membre ou ressource).
   * Si `userId` est fourni : rattache le collaborateur au compte plateforme (membre) — recherche d’abord par `(clientId, userId)`.
   * Les collaborateurs DIRECTORY_SYNC ne sont pas modifiés (annuaire = source de vérité).
   */
  async syncFromHumanIdentity(
    clientId: string,
    identity: {
      email: string;
      firstName: string | null;
      /** Nom de famille (User.lastName ou Resource.name pour HUMAN). */
      lastName: string;
      /** Compte plateforme rattaché au client (membre) — lien explicite Collaborator.userId. */
      userId?: string | null;
    },
  ): Promise<void> {
    const emailNorm = this.normalizeEmail(identity.email);
    if (!emailNorm) return;

    const last = (identity.lastName ?? '').trim();
    const first = identity.firstName?.trim() || null;
    const displayName =
      [first, last].filter(Boolean).join(' ') || last || first || emailNorm;

    const uid = identity.userId?.trim() || null;

    let existing =
      uid != null
        ? await this.prisma.collaborator.findFirst({
            where: { clientId, userId: uid },
          })
        : null;

    if (!existing) {
      existing = await this.prisma.collaborator.findFirst({
        where: {
          clientId,
          email: { equals: emailNorm, mode: 'insensitive' },
        },
      });
    }

    if (!existing) {
      await this.prisma.collaborator.create({
        data: {
          clientId,
          source: CollaboratorSource.MANUAL,
          status: CollaboratorStatus.ACTIVE,
          email: emailNorm,
          firstName: first,
          lastName: last || null,
          displayName,
          ...(uid ? { userId: uid } : {}),
        },
      });
      return;
    }

    if (existing.source === CollaboratorSource.DIRECTORY_SYNC) {
      return;
    }

    const data: Prisma.CollaboratorUpdateInput = {
      email: emailNorm,
      firstName: first,
      lastName: last || null,
      displayName,
    };
    if (uid) {
      data.userId = uid;
    }

    await this.prisma.collaborator.update({
      where: { id: existing.id },
      data,
    });
  }

  /**
   * Retire le lien `userId` quand le membre n’est plus rattaché au client (la fiche collaborateur reste).
   */
  async clearMemberUserLink(clientId: string, userId: string): Promise<void> {
    await this.prisma.collaborator.updateMany({
      where: { clientId, userId },
      data: { userId: null },
    });
  }

  async list(clientId: string, query: ListCollaboratorsQueryDto) {
    const where: Prisma.CollaboratorWhereInput = {
      clientId,
      status:
        query.status && query.status.length > 0
          ? { in: query.status }
          : CollaboratorStatus.ACTIVE,
    };
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { displayName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { department: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (query.source?.length) {
      where.source = { in: query.source };
    }
    if (query.managerId) {
      where.managerId = query.managerId;
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;

    // Tag filtering is done in-memory because internalTags is JSON and can have mixed shapes.
    if (query.tag?.length) {
      const all = await this.prisma.collaborator.findMany({
        where,
        orderBy: [{ displayName: 'asc' }],
        include: { manager: { select: { displayName: true } } },
      });
      const filtered = all.filter((row) =>
        this.extractTagLabels(row.internalTags).some((label) =>
          query.tag!.some((tag) => label === tag.toLowerCase()),
        ),
      );
      return {
        items: filtered.slice(offset, offset + limit).map((item) => this.toListItem(item)),
        total: filtered.length,
        offset,
        limit,
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.collaborator.count({ where }),
      this.prisma.collaborator.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ displayName: 'asc' }],
        include: { manager: { select: { displayName: true } } },
      }),
    ]);

    return { items: items.map((item) => this.toListItem(item)), total, offset, limit };
  }

  async create(
    clientId: string,
    dto: CreateCollaboratorDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const source = dto.source ?? CollaboratorSource.MANUAL;
    if (source !== CollaboratorSource.MANUAL) {
      throw new BadRequestException('La création métier autorise uniquement source=MANUAL');
    }

    const status = dto.status ?? CollaboratorStatus.ACTIVE;
    if (status !== CollaboratorStatus.ACTIVE && status !== CollaboratorStatus.INACTIVE) {
      throw new BadRequestException(
        'Statut initial autorisé pour un collaborateur manuel : ACTIVE ou INACTIVE',
      );
    }

    const managerId = dto.managerId?.trim();
    if (managerId) {
      await this.ensureManagerInClient(clientId, managerId);
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    let linkedPlatformUserId: string | null = null;
    if (normalizedEmail) {
      const memberLink = await this.prisma.clientUser.findFirst({
        where: {
          clientId,
          user: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        },
        select: { userId: true },
      });
      linkedPlatformUserId = memberLink?.userId ?? null;

      const existingByEmail = await this.prisma.collaborator.findFirst({
        where: {
          clientId,
          email: { equals: normalizedEmail, mode: 'insensitive' },
        },
      });
      if (existingByEmail) {
        if (existingByEmail.source === CollaboratorSource.DIRECTORY_SYNC) {
          throw new ConflictException(
            'Un collaborateur synchronisé existe déjà avec cet email. Mettre à jour la fiche existante.',
          );
        }
        throw new ConflictException('Un collaborateur existe déjà avec cet email dans ce client.');
      }
    }

    const created = await this.prisma.collaborator.create({
      data: {
        clientId,
        displayName: dto.displayName.trim(),
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        email: normalizedEmail,
        ...(linkedPlatformUserId ? { userId: linkedPlatformUserId } : {}),
        username: dto.username ?? null,
        jobTitle: dto.jobTitle ?? null,
        department: dto.department ?? null,
        status,
        source: CollaboratorSource.MANUAL,
        managerId: managerId || null,
        internalTags:
          dto.internalTags === undefined
            ? Prisma.JsonNull
            : dto.internalTags === null
              ? Prisma.JsonNull
              : (dto.internalTags as Prisma.InputJsonValue),
        internalNotes: dto.internalNotes ?? null,
      },
      include: { manager: { select: { displayName: true } } },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator.created',
      resourceType: 'collaborator',
      resourceId: created.id,
      newValue: {
        displayName: created.displayName,
        status: created.status,
        source: created.source,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return this.toListItem(created);
  }

  async getById(clientId: string, id: string) {
    const collaborator = await this.prisma.collaborator.findFirst({
      where: { id, clientId },
      include: { manager: { select: { displayName: true } } },
    });
    if (!collaborator) throw new NotFoundException('Collaborator introuvable');
    return this.toListItem(collaborator);
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
    if (dto.email !== undefined) {
      const normalizedEmail = this.normalizeEmail(dto.email);
      if (normalizedEmail) {
        const existingByEmail = await this.prisma.collaborator.findFirst({
          where: {
            clientId,
            email: { equals: normalizedEmail, mode: 'insensitive' },
            NOT: { id: existing.id },
          },
        });
        if (existingByEmail) {
          throw new ConflictException('Un collaborateur existe déjà avec cet email dans ce client.');
        }
      }
      data.email = normalizedEmail;
    }
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.jobTitle !== undefined) data.jobTitle = dto.jobTitle;
    if (dto.department !== undefined) data.department = dto.department;
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
        if (dto.managerId !== existing.managerId) {
          await this.auditLogs.create({
            clientId,
            userId: actorUserId,
            action: 'collaborator.manager_changed',
            resourceType: 'collaborator',
            resourceId: existing.id,
            oldValue: { managerId: existing.managerId ?? null },
            newValue: { managerId: dto.managerId },
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
            requestId: meta?.requestId,
          });
        }
        data.manager = { connect: { id: manager.id } };
      }
    }
    if (dto.internalNotes !== undefined) data.internalNotes = dto.internalNotes;
    if (dto.internalTags !== undefined) {
      data.internalTags =
        dto.internalTags === null
          ? Prisma.JsonNull
          : (dto.internalTags as Prisma.InputJsonValue);
    }
    const updated = await this.prisma.collaborator.update({
      where: { id: existing.id },
      data,
      include: { manager: { select: { displayName: true } } },
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

    return this.toListItem(updated);
  }

  async updateStatus(
    clientId: string,
    id: string,
    dto: UpdateCollaboratorStatusDto,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.collaborator.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Collaborator introuvable');
    }

    const from = existing.status;
    const to = dto.status;
    const allowed =
      from === to ||
      (from === CollaboratorStatus.INACTIVE && to === CollaboratorStatus.ACTIVE) ||
      (from === CollaboratorStatus.DISABLED_SYNC && to === CollaboratorStatus.ACTIVE) ||
      (from === CollaboratorStatus.ACTIVE && to === CollaboratorStatus.INACTIVE);
    if (!allowed) {
      throw new BadRequestException(`Transition de statut non autorisée: ${from} -> ${to}`);
    }

    const updated = await this.prisma.collaborator.update({
      where: { id: existing.id },
      data: { status: to },
      include: { manager: { select: { displayName: true } } },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator.status_updated',
      resourceType: 'collaborator',
      resourceId: existing.id,
      oldValue: { status: from },
      newValue: { status: to },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return this.toListItem(updated);
  }

  async softDelete(
    clientId: string,
    id: string,
    actorUserId?: string,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.collaborator.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Collaborator introuvable');
    const targetStatus =
      existing.source === CollaboratorSource.DIRECTORY_SYNC
        ? CollaboratorStatus.DISABLED_SYNC
        : CollaboratorStatus.INACTIVE;
    const updated = await this.prisma.collaborator.update({
      where: { id: existing.id },
      data: { status: targetStatus },
      include: { manager: { select: { displayName: true } } },
    });
    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'collaborator.deleted',
      resourceType: 'collaborator',
      resourceId: existing.id,
      oldValue: { status: existing.status },
      newValue: { status: targetStatus },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });
    return this.toListItem(updated);
  }

  async listManagersOptions(clientId: string, query: ListCollaboratorOptionsQueryDto) {
    const where: Prisma.CollaboratorWhereInput = {
      clientId,
      status: CollaboratorStatus.ACTIVE,
    };
    if (query.search?.trim()) {
      const search = query.search.trim();
      /** Aligné sur les usages « fiche RH / annuaire » : prénom, nom, matricule, pas seulement displayName. */
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.collaborator.count({ where }),
      this.prisma.collaborator.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ displayName: 'asc' }],
        select: { id: true, displayName: true, email: true, jobTitle: true },
      }),
    ]);
    return { items: rows, total, offset, limit };
  }

  async listTagsOptions(clientId: string, query: ListCollaboratorOptionsQueryDto) {
    const rows = await this.prisma.collaborator.findMany({
      where: { clientId, status: CollaboratorStatus.ACTIVE },
      select: { internalTags: true },
    });
    const allTags = new Set<string>();
    for (const row of rows) {
      for (const tag of this.extractTagLabels(row.internalTags)) {
        allTags.add(tag);
      }
    }
    let items = Array.from(allTags)
      .sort((a, b) => a.localeCompare(b))
      .map((label) => ({ id: label, displayName: label }));
    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      items = items.filter((item) => item.displayName.toLowerCase().includes(term));
    }
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
      offset,
      limit,
    };
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
        // Keep local business enrichments untouched when sync updates identity fields.
        internalTags: byFallback.internalTags ?? undefined,
        internalNotes: byFallback.internalNotes ?? undefined,
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

  private async ensureManagerInClient(clientId: string, managerId: string): Promise<void> {
    const manager = await this.prisma.collaborator.findFirst({
      where: { id: managerId, clientId },
      select: { id: true },
    });
    if (!manager) {
      throw new BadRequestException('Manager collaborator introuvable');
    }
  }

  private normalizeEmail(email: string | null | undefined): string | null {
    if (email === undefined || email === null) return null;
    const normalized = email.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private extractTagLabels(value: Prisma.JsonValue | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
        .filter((item) => item.length > 0);
    }
    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .map((key) => key.trim().toLowerCase())
        .filter((key) => key.length > 0);
    }
    return [];
  }

  private toListItem(
    collaborator: Prisma.CollaboratorGetPayload<{
      include: { manager: { select: { displayName: true } } };
    }>,
  ) {
    return {
      id: collaborator.id,
      linkedUserId: collaborator.userId ?? null,
      displayName: collaborator.displayName,
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      email: collaborator.email,
      username: collaborator.username,
      jobTitle: collaborator.jobTitle,
      department: collaborator.department,
      managerId: collaborator.managerId,
      managerDisplayName: collaborator.manager?.displayName ?? null,
      status: collaborator.status,
      source: collaborator.source,
      internalTags: collaborator.internalTags,
      internalNotes: collaborator.internalNotes,
      createdAt: collaborator.createdAt,
      updatedAt: collaborator.updatedAt,
    };
  }
}
