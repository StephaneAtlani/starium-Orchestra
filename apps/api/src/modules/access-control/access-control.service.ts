import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  Prisma,
  ResourceAclPermission,
  ResourceAclSubjectType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { CreateResourceAclEntryDto, ResourceAclEntryInputDto } from './dto/resource-acl-entry.dto';
import {
  RESOURCE_ACL_CUID_REGEX,
  RESOURCE_ACL_RESOURCE_ID_MAX_LENGTH,
  RESOURCE_ACL_RESOURCE_TYPE_MAX_LENGTH,
  RESOURCE_ACL_RESOURCE_TYPE_WHITELIST,
  ResourceAclCanonicalResourceType,
} from './resource-acl.constants';

const WHITELIST_SET = new Set<string>(RESOURCE_ACL_RESOURCE_TYPE_WHITELIST);

const PERM_RANK: Record<ResourceAclPermission, number> = {
  [ResourceAclPermission.READ]: 1,
  [ResourceAclPermission.WRITE]: 2,
  [ResourceAclPermission.ADMIN]: 3,
};

const MIN_PERMISSION_BY_OPERATION: Record<'read' | 'write' | 'admin', ResourceAclPermission> = {
  read: ResourceAclPermission.READ,
  write: ResourceAclPermission.WRITE,
  admin: ResourceAclPermission.ADMIN,
};

export type ResourceAclEntryRow = {
  id: string;
  subjectType: ResourceAclSubjectType;
  subjectId: string;
  permission: ResourceAclPermission;
  subjectLabel: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ResourceAclListResponse = {
  restricted: boolean;
  entries: ResourceAclEntryRow[];
};

export type ReplaceContext = {
  actorUserId?: string;
  meta?: RequestMeta;
};

/** Snapshots ACL sérialisables pour audit (`oldValue` / `newValue`). */
export type ResourceAclAuditEntrySnapshot = {
  id: string;
  subjectType: ResourceAclSubjectType;
  subjectId: string;
  permission: ResourceAclPermission;
  /** ISO8601 UTC — exploitable hors runtime Date. */
  createdAtUtc?: string;
  updatedAtUtc?: string;
};

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Validation unique utilisée par GET/PUT/POST/DELETE (+ garde métier RFC-ACL-006).
   * À appeler **avant** toute requête Prisma avec ces clés.
   */
  resolveResourceAclRoute(
    rawResourceType: string,
    rawResourceId: string,
  ): {
    resourceType: ResourceAclCanonicalResourceType;
    resourceId: string;
  } {
    return {
      resourceType: this.parseResourceTypeFromRoute(rawResourceType),
      resourceId: this.parseResourceIdFromRoute(rawResourceId),
    };
  }

  parseResourceTypeFromRoute(raw: string): ResourceAclCanonicalResourceType {
    const normalized = (raw ?? '').trim().toUpperCase();
    if (!normalized.length || normalized.length > RESOURCE_ACL_RESOURCE_TYPE_MAX_LENGTH) {
      throw new BadRequestException('resourceType invalide ou vide');
    }
    if (!WHITELIST_SET.has(normalized)) {
      throw new BadRequestException(
        `resourceType non autorisé : attendu l’un de ${RESOURCE_ACL_RESOURCE_TYPE_WHITELIST.join(', ')}`,
      );
    }
    return normalized as ResourceAclCanonicalResourceType;
  }

  parseResourceIdFromRoute(raw: string): string {
    const id = (raw ?? '').trim();
    if (!id.length) {
      throw new BadRequestException('resourceId ne peut pas être vide');
    }
    if (id.length > RESOURCE_ACL_RESOURCE_ID_MAX_LENGTH) {
      throw new BadRequestException('resourceId trop long');
    }
    if (!RESOURCE_ACL_CUID_REGEX.test(id)) {
      throw new BadRequestException('resourceId doit être un identifiant CUID valide');
    }
    return id;
  }

  /** Snapshots stabiles pour comparaisons diff / recherche métier audit. */
  private snapshotsFromAclRows(
    rows: Array<{
      id: string;
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
      createdAt?: Date;
      updatedAt?: Date;
    }>,
  ): ResourceAclAuditEntrySnapshot[] {
    return rows.map((r) => ({
      id: r.id,
      subjectType: r.subjectType,
      subjectId: r.subjectId,
      permission: r.permission,
      createdAtUtc: r.createdAt?.toISOString(),
      updatedAtUtc: r.updatedAt?.toISOString(),
    }));
  }

  /** Toujours `resourceType` normalisé (whitelist upper) + `resourceId` validé avant Prisma. */
  private async loadAclPayloadForResolvedRoute(
    clientId: string,
    resourceType: ResourceAclCanonicalResourceType,
    resourceId: string,
  ): Promise<ResourceAclListResponse> {
    const rows = await this.prisma.resourceAcl.findMany({
      where: { clientId, resourceType, resourceId },
      orderBy: [{ subjectType: 'asc' }, { subjectId: 'asc' }],
    });
    const entries = await this.enrichEntries(clientId, rows);
    return { restricted: rows.length > 0, entries };
  }

  async assertSubjectInClient(
    clientId: string,
    subjectType: ResourceAclSubjectType,
    subjectId: string,
  ): Promise<void> {
    if (subjectType === ResourceAclSubjectType.USER) {
      const cu = await this.prisma.clientUser.findFirst({
        where: {
          clientId,
          userId: subjectId,
          status: ClientUserStatus.ACTIVE,
        },
      });
      if (!cu) {
        throw new BadRequestException(
          'Sujet USER invalide ou inactif pour ce client',
        );
      }
      return;
    }
    const g = await this.prisma.accessGroup.findFirst({
      where: { id: subjectId, clientId },
    });
    if (!g) {
      throw new BadRequestException('Sujet GROUP invalide pour ce client');
    }
  }

  private async enrichEntries(
    clientId: string,
    rows: Array<{
      id: string;
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): Promise<ResourceAclEntryRow[]> {
    const userIds = new Set<string>();
    const groupIds = new Set<string>();
    for (const r of rows) {
      if (r.subjectType === ResourceAclSubjectType.USER) {
        userIds.add(r.subjectId);
      } else {
        groupIds.add(r.subjectId);
      }
    }
    const [users, groups] = await Promise.all([
      userIds.size
        ? this.prisma.user.findMany({
            where: { id: { in: [...userIds] } },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          })
        : [],
      groupIds.size
        ? this.prisma.accessGroup.findMany({
            where: { id: { in: [...groupIds] }, clientId },
            select: { id: true, name: true },
          })
        : [],
    ]);
    const userMap = new Map(users.map((u) => [u.id, u] as const));
    const groupMap = new Map(groups.map((g) => [g.id, g.name] as const));

    return rows.map((r) => {
      let subjectLabel = r.subjectId;
      if (r.subjectType === ResourceAclSubjectType.USER) {
        const u = userMap.get(r.subjectId);
        if (u) {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          subjectLabel = name ? `${name} (${u.email})` : u.email;
        }
      } else {
        const gn = groupMap.get(r.subjectId);
        if (gn) subjectLabel = gn;
      }
      return {
        id: r.id,
        subjectType: r.subjectType,
        subjectId: r.subjectId,
        permission: r.permission,
        subjectLabel,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  }

  async listEntries(
    clientId: string,
    rawResourceType: string,
    rawResourceId: string,
  ): Promise<ResourceAclListResponse> {
    const { resourceType, resourceId } = this.resolveResourceAclRoute(
      rawResourceType,
      rawResourceId,
    );
    return this.loadAclPayloadForResolvedRoute(clientId, resourceType, resourceId);
  }

  private assertNoDuplicateSubjects(entries: ResourceAclEntryInputDto[]): void {
    const seen = new Set<string>();
    for (const e of entries) {
      const k = `${e.subjectType}:${e.subjectId}`;
      if (seen.has(k)) {
        throw new BadRequestException(
          `Doublon dans le corps : sujet ${e.subjectType} / ${e.subjectId} présent plusieurs fois`,
        );
      }
      seen.add(k);
    }
  }

  async replaceEntries(
    clientId: string,
    rawResourceType: string,
    rawResourceId: string,
    entries: ResourceAclEntryInputDto[],
    context?: ReplaceContext,
  ): Promise<ResourceAclListResponse> {
    const { resourceType, resourceId } = this.resolveResourceAclRoute(
      rawResourceType,
      rawResourceId,
    );

    if (!entries?.length) {
      throw new BadRequestException(
        'Le tableau entries ne peut pas être vide : aucune suppression des ACL existantes ne sera effectuée.',
      );
    }

    this.assertNoDuplicateSubjects(entries);
    for (const e of entries) {
      await this.assertSubjectInClient(clientId, e.subjectType, e.subjectId);
    }

    const previous = await this.prisma.resourceAcl.findMany({
      where: { clientId, resourceType, resourceId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.resourceAcl.deleteMany({
        where: { clientId, resourceType, resourceId },
      });
      await tx.resourceAcl.createMany({
        data: entries.map((e) => ({
          clientId,
          resourceType,
          resourceId,
          subjectType: e.subjectType,
          subjectId: e.subjectId,
          permission: e.permission,
        })),
      });
    });

    const afterRows = await this.prisma.resourceAcl.findMany({
      where: { clientId, resourceType, resourceId },
      orderBy: [{ subjectType: 'asc' }, { subjectId: 'asc' }],
    });

    await this.auditLogs.create(
      this.buildAuditInput({
        clientId,
        businessResourceId: resourceId,
        context,
        action: 'resource_acl.replaced',
        oldValue: {
          aclResourceType: resourceType,
          resourceId,
          restricted: previous.length > 0,
          entryCount: previous.length,
          entries: this.snapshotsFromAclRows(previous),
        },
        newValue: {
          aclResourceType: resourceType,
          resourceId,
          restricted: afterRows.length > 0,
          entryCount: afterRows.length,
          entries: this.snapshotsFromAclRows(afterRows),
        },
      }),
    );

    const entriesOut = await this.enrichEntries(clientId, afterRows);
    return { restricted: afterRows.length > 0, entries: entriesOut };
  }

  async addEntry(
    clientId: string,
    rawResourceType: string,
    rawResourceId: string,
    dto: CreateResourceAclEntryDto,
    context?: ReplaceContext,
  ): Promise<ResourceAclEntryRow> {
    const { resourceType, resourceId } = this.resolveResourceAclRoute(
      rawResourceType,
      rawResourceId,
    );
    await this.assertSubjectInClient(clientId, dto.subjectType, dto.subjectId);

    try {
      const row = await this.prisma.resourceAcl.create({
        data: {
          clientId,
          resourceType,
          resourceId,
          subjectType: dto.subjectType,
          subjectId: dto.subjectId,
          permission: dto.permission,
        },
      });
      await this.auditLogs.create(
        this.buildAuditInput({
          clientId,
          businessResourceId: resourceId,
          context,
          action: 'resource_acl.entry_created',
          newValue: {
            aclResourceType: resourceType,
            resourceId,
            entryId: row.id,
            subjectType: dto.subjectType,
            subjectId: dto.subjectId,
            permission: dto.permission,
          },
        }),
      );
      const [enriched] = await this.enrichEntries(clientId, [row]);
      return enriched;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          'Une entrée ACL existe déjà pour ce sujet sur cette ressource',
        );
      }
      throw e;
    }
  }

  async removeEntry(
    clientId: string,
    rawResourceType: string,
    rawResourceId: string,
    entryId: string,
    context?: ReplaceContext,
  ): Promise<void> {
    const { resourceType, resourceId } = this.resolveResourceAclRoute(
      rawResourceType,
      rawResourceId,
    );

    const existing = await this.prisma.resourceAcl.findFirst({
      where: {
        id: entryId,
        clientId,
        resourceType,
        resourceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Entrée ACL non trouvée pour cette ressource');
    }

    await this.prisma.resourceAcl.delete({
      where: { id: existing.id },
    });

    const remainingEntryCount = await this.prisma.resourceAcl.count({
      where: { clientId, resourceType, resourceId },
    });

    await this.auditLogs.create(
      this.buildAuditInput({
        clientId,
        businessResourceId: resourceId,
        context,
        action: 'resource_acl.entry_deleted',
        oldValue: {
          aclResourceType: resourceType,
          resourceId,
          restrictedBefore: true,
          entriesBeforeSnapshot: this.snapshotsFromAclRows([existing]),
        },
        newValue: {
          aclResourceType: resourceType,
          resourceId,
          removedEntryId: existing.id,
          remainingEntryCount,
          restrictedAfter: remainingEntryCount > 0,
        },
      }),
    );
  }

  private buildAuditInput(params: {
    clientId: string;
    businessResourceId: string;
    context?: ReplaceContext;
    action: string;
    oldValue?: unknown;
    newValue?: unknown;
  }): CreateAuditLogInput {
    const meta = params.context?.meta;
    return {
      clientId: params.clientId,
      userId: params.context?.actorUserId,
      action: params.action,
      resourceType: 'resource_acl',
      resourceId: params.businessResourceId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    };
  }

  private async computeRestrictedMaxRank(
    clientId: string,
    userId: string,
    resourceType: ResourceAclCanonicalResourceType,
    resourceId: string,
  ): Promise<{ unrestricted: boolean; maxRank: number }> {
    const total = await this.prisma.resourceAcl.count({
      where: { clientId, resourceType, resourceId },
    });
    if (total === 0) {
      return { unrestricted: true, maxRank: 0 };
    }

    const members = await this.prisma.accessGroupMember.findMany({
      where: { clientId, userId },
      select: { groupId: true },
    });
    const groupIds = members.map((m) => m.groupId);
    const orClause: Prisma.ResourceAclWhereInput[] = [
      { subjectType: ResourceAclSubjectType.USER, subjectId: userId },
    ];
    if (groupIds.length > 0) {
      orClause.push({
        subjectType: ResourceAclSubjectType.GROUP,
        subjectId: { in: groupIds },
      });
    }

    const applicable = await this.prisma.resourceAcl.findMany({
      where: {
        clientId,
        resourceType,
        resourceId,
        OR: orClause,
      },
      select: { permission: true },
    });

    let maxRank = 0;
    for (const a of applicable) {
      maxRank = Math.max(maxRank, PERM_RANK[a.permission]);
    }
    return { unrestricted: false, maxRank };
  }

  private async loadUserGroupIds(clientId: string, userId: string): Promise<string[]> {
    const members = await this.prisma.accessGroupMember.findMany({
      where: { clientId, userId },
      select: { groupId: true },
    });
    return members.map((m) => m.groupId);
  }

  async filterReadableResourceIds(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceIds: string[];
    operation?: 'read' | 'write' | 'admin';
  }): Promise<string[]> {
    const uniqueIds = Array.from(new Set(params.resourceIds.filter(Boolean)));
    if (uniqueIds.length === 0) return [];

    const minPermission =
      MIN_PERMISSION_BY_OPERATION[params.operation ?? 'read'];
    const minRank = PERM_RANK[minPermission];
    const groupIds = await this.loadUserGroupIds(params.clientId, params.userId);

    const rows = await this.prisma.resourceAcl.findMany({
      where: {
        clientId: params.clientId,
        resourceType: params.resourceTypeNormalized,
        resourceId: { in: uniqueIds },
      },
      select: { resourceId: true, subjectType: true, subjectId: true, permission: true },
    });

    if (rows.length === 0) {
      return uniqueIds;
    }

    const restrictedIds = new Set(rows.map((r) => r.resourceId));
    const groupSet = new Set(groupIds);
    const maxRankByResource = new Map<string, number>();

    for (const row of rows) {
      const allowedByUser =
        row.subjectType === ResourceAclSubjectType.USER && row.subjectId === params.userId;
      const allowedByGroup =
        row.subjectType === ResourceAclSubjectType.GROUP && groupSet.has(row.subjectId);
      if (!allowedByUser && !allowedByGroup) continue;
      const current = maxRankByResource.get(row.resourceId) ?? 0;
      maxRankByResource.set(row.resourceId, Math.max(current, PERM_RANK[row.permission]));
    }

    return uniqueIds.filter((resourceId) => {
      if (!restrictedIds.has(resourceId)) return true;
      return (maxRankByResource.get(resourceId) ?? 0) >= minRank;
    });
  }

  async canReadResource(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
  }): Promise<boolean> {
    const { unrestricted, maxRank } = await this.computeRestrictedMaxRank(
      params.clientId,
      params.userId,
      params.resourceTypeNormalized,
      params.resourceId,
    );
    if (unrestricted) return true;
    return maxRank >= PERM_RANK[ResourceAclPermission.READ];
  }

  async canWriteResource(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
  }): Promise<boolean> {
    const { unrestricted, maxRank } = await this.computeRestrictedMaxRank(
      params.clientId,
      params.userId,
      params.resourceTypeNormalized,
      params.resourceId,
    );
    if (unrestricted) return true;
    return maxRank >= PERM_RANK[ResourceAclPermission.WRITE];
  }

  async canAdminResource(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
  }): Promise<boolean> {
    const { unrestricted, maxRank } = await this.computeRestrictedMaxRank(
      params.clientId,
      params.userId,
      params.resourceTypeNormalized,
      params.resourceId,
    );
    if (unrestricted) return true;
    return maxRank >= PERM_RANK[ResourceAclPermission.ADMIN];
  }
}
