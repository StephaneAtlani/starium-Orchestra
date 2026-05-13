import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  Prisma,
  ResourceAccessPolicyMode,
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
import { PlatformRole } from '@prisma/client';
import { AccessDiagnosticsService } from '../access-diagnostics/access-diagnostics.service';
import {
  evaluateResourceAccessDecision,
  type EffectiveResourceAccessMode,
  type ResourceAccessDecisionOperation,
  type ResourceAccessEvaluationResult,
} from './resource-access-policy.decision';

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
  accessPolicy: ResourceAccessPolicyMode;
  effectiveAccessMode: EffectiveResourceAccessMode;
  entries: ResourceAclEntryRow[];
};

export type ReplaceContext = {
  actorUserId?: string;
  meta?: RequestMeta;
  /** RFC-ACL-014 : uniquement PLATFORM_ADMIN + lockout bypass. */
  force?: boolean;
  platformRole?: string | null;
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
    @Inject(forwardRef(() => AccessDiagnosticsService))
    private readonly accessDiagnostics: AccessDiagnosticsService,
  ) {}

  async resolveAccessPolicy(
    clientId: string,
    resourceType: ResourceAclCanonicalResourceType,
    resourceId: string,
  ): Promise<ResourceAccessPolicyMode> {
    const row = await this.prisma.resourceAccessPolicy.findUnique({
      where: {
        clientId_resourceType_resourceId: { clientId, resourceType, resourceId },
      },
      select: { mode: true },
    });
    return row?.mode ?? ResourceAccessPolicyMode.DEFAULT;
  }

  /**
   * RFC-ACL-017 — résolution batch (un `findMany`), fallback `DEFAULT` par id sans ligne.
   * À réutiliser pour tout filtrage multi-ressources.
   */
  private async resolveAccessPolicies(
    clientId: string,
    resourceType: ResourceAclCanonicalResourceType,
    resourceIds: string[],
  ): Promise<Map<string, ResourceAccessPolicyMode>> {
    const map = new Map<string, ResourceAccessPolicyMode>();
    for (const id of resourceIds) {
      map.set(id, ResourceAccessPolicyMode.DEFAULT);
    }
    if (resourceIds.length === 0) {
      return map;
    }
    const policies = await this.prisma.resourceAccessPolicy.findMany({
      where: { clientId, resourceType, resourceId: { in: resourceIds } },
      select: { resourceId: true, mode: true },
    });
    for (const p of policies) {
      map.set(p.resourceId, p.mode);
    }
    return map;
  }

  private computeMaxRankFromRowsForSubject(
    rows: Array<{ subjectType: ResourceAclSubjectType; subjectId: string; permission: ResourceAclPermission }>,
    userId: string,
    groupIdSet: Set<string>,
  ): number {
    let maxRank = 0;
    for (const row of rows) {
      const allowedByUser =
        row.subjectType === ResourceAclSubjectType.USER && row.subjectId === userId;
      const allowedByGroup =
        row.subjectType === ResourceAclSubjectType.GROUP && groupIdSet.has(row.subjectId);
      if (!allowedByUser && !allowedByGroup) continue;
      maxRank = Math.max(maxRank, PERM_RANK[row.permission]);
    }
    return maxRank;
  }

  private async computeUserMaxAclRankForResource(params: {
    clientId: string;
    userId: string;
    resourceType: ResourceAclCanonicalResourceType;
    resourceId: string;
  }): Promise<number> {
    const groupIds = await this.loadUserGroupIds(params.clientId, params.userId);
    const groupSet = new Set(groupIds);
    const orClause: Prisma.ResourceAclWhereInput[] = [
      { subjectType: ResourceAclSubjectType.USER, subjectId: params.userId },
    ];
    if (groupIds.length > 0) {
      orClause.push({
        subjectType: ResourceAclSubjectType.GROUP,
        subjectId: { in: groupIds },
      });
    }
    const applicable = await this.prisma.resourceAcl.findMany({
      where: {
        clientId: params.clientId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        OR: orClause,
      },
      select: { subjectType: true, subjectId: true, permission: true },
    });
    return this.computeMaxRankFromRowsForSubject(applicable, params.userId, groupSet);
  }

  async evaluateResourceAccess(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    operation: ResourceAccessDecisionOperation;
    /**
     * Ne jamais utiliser comme bypass. Réservé au plancher déjà validé par le guard appelant
     * pour la même opération (read / write / admin). Défaut false.
     */
    sharingFloorAllows?: boolean;
  }): Promise<ResourceAccessEvaluationResult> {
    const [mode, aclEntryCount] = await Promise.all([
      this.resolveAccessPolicy(
        params.clientId,
        params.resourceTypeNormalized,
        params.resourceId,
      ),
      this.prisma.resourceAcl.count({
        where: {
          clientId: params.clientId,
          resourceType: params.resourceTypeNormalized,
          resourceId: params.resourceId,
        },
      }),
    ]);
    const maxRankForSubject =
      aclEntryCount > 0
        ? await this.computeUserMaxAclRankForResource({
            clientId: params.clientId,
            userId: params.userId,
            resourceType: params.resourceTypeNormalized,
            resourceId: params.resourceId,
          })
        : 0;
    return evaluateResourceAccessDecision({
      mode,
      operation: params.operation,
      aclEntryCount,
      maxRankForSubject,
      sharingFloorAllows: params.sharingFloorAllows,
    });
  }

  /**
   * RFC-ACL-017 — même matrice que `evaluateResourceAccess` sur un snapshot de lignes ACL.
   */
  async evaluateResourceAccessWithSimulatedAclRows(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    operation: ResourceAccessDecisionOperation;
    aclRows: Array<{
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
    }>;
    sharingFloorAllows?: boolean;
  }): Promise<ResourceAccessEvaluationResult> {
    const mode = await this.resolveAccessPolicy(
      params.clientId,
      params.resourceTypeNormalized,
      params.resourceId,
    );
    const groupIds = await this.loadUserGroupIds(params.clientId, params.userId);
    const maxRankForSubject = this.computeMaxRankFromRowsForSubject(
      params.aclRows,
      params.userId,
      new Set(groupIds),
    );
    return evaluateResourceAccessDecision({
      mode,
      operation: params.operation,
      aclEntryCount: params.aclRows.length,
      maxRankForSubject,
      sharingFloorAllows: params.sharingFloorAllows,
    });
  }

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
    viewerUserId?: string,
  ): Promise<ResourceAclListResponse> {
    const rows = await this.prisma.resourceAcl.findMany({
      where: { clientId, resourceType, resourceId },
      orderBy: [{ subjectType: 'asc' }, { subjectId: 'asc' }],
    });
    const entries = await this.enrichEntries(clientId, rows);
    const accessPolicy = await this.resolveAccessPolicy(clientId, resourceType, resourceId);
    let maxRankForSubject = 0;
    if (rows.length > 0 && viewerUserId) {
      maxRankForSubject = this.computeMaxRankFromRowsForSubject(
        rows,
        viewerUserId,
        new Set(await this.loadUserGroupIds(clientId, viewerUserId)),
      );
    }
    /**
     * GET resource-acl (CLIENT_ADMIN) : plancher affichage SHARING sans ACL en ALLOW pour l’UI.
     */
    const ev = evaluateResourceAccessDecision({
      mode: accessPolicy,
      operation: 'read',
      aclEntryCount: rows.length,
      maxRankForSubject,
      sharingFloorAllows: true,
    });
    return {
      restricted: rows.length > 0,
      accessPolicy,
      effectiveAccessMode: ev.effectiveAccessMode,
      entries,
    };
  }

  async listEntries(
    clientId: string,
    rawResourceType: string,
    rawResourceId: string,
    viewerUserId?: string,
  ): Promise<ResourceAclListResponse> {
    const { resourceType, resourceId } = this.resolveResourceAclRoute(
      rawResourceType,
      rawResourceId,
    );
    return this.loadAclPayloadForResolvedRoute(
      clientId,
      resourceType,
      resourceId,
      viewerUserId,
    );
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

    await this.assertValidForceContext(clientId, context);

    const simulatedRows = entries.map((e) => ({
      subjectType: e.subjectType,
      subjectId: e.subjectId,
      permission: e.permission,
    }));
    await this.enforceAdminSuccessorLockout({
      clientId,
      resourceType,
      resourceId,
      simulatedRows,
      context,
    });

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
    const accessPolicy = await this.resolveAccessPolicy(clientId, resourceType, resourceId);
    let maxRankForSubject = 0;
    if (afterRows.length > 0 && context?.actorUserId) {
      maxRankForSubject = this.computeMaxRankFromRowsForSubject(
        afterRows,
        context.actorUserId,
        new Set(await this.loadUserGroupIds(clientId, context.actorUserId)),
      );
    }
    const ev = evaluateResourceAccessDecision({
      mode: accessPolicy,
      operation: 'read',
      aclEntryCount: afterRows.length,
      maxRankForSubject,
      sharingFloorAllows: true,
    });
    return {
      restricted: afterRows.length > 0,
      accessPolicy,
      effectiveAccessMode: ev.effectiveAccessMode,
      entries: entriesOut,
    };
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
    await this.assertValidForceContext(clientId, context);

    const previousRows = await this.prisma.resourceAcl.findMany({
      where: { clientId, resourceType, resourceId },
    });
    const simulatedRows = [
      ...previousRows.map((r) => ({
        subjectType: r.subjectType,
        subjectId: r.subjectId,
        permission: r.permission,
      })),
      {
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        permission: dto.permission,
      },
    ];
    await this.enforceAdminSuccessorLockout({
      clientId,
      resourceType,
      resourceId,
      simulatedRows,
      context,
    });

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

    const allRows = await this.prisma.resourceAcl.findMany({
      where: { clientId, resourceType, resourceId },
    });
    const simulatedRows = allRows
      .filter((r) => r.id !== existing.id)
      .map((r) => ({
        subjectType: r.subjectType,
        subjectId: r.subjectId,
        permission: r.permission,
      }));

    await this.assertValidForceContext(clientId, context);
    await this.enforceAdminSuccessorLockout({
      clientId,
      resourceType,
      resourceId,
      simulatedRows,
      context,
    });

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

  private async assertValidForceContext(
    clientId: string,
    context?: ReplaceContext,
  ): Promise<void> {
    if (!context?.force) return;
    if (context.platformRole !== PlatformRole.PLATFORM_ADMIN) {
      try {
        await this.auditLogs.create(
          this.buildAuditInput({
            clientId,
            businessResourceId: clientId,
            context,
            action: 'resource_acl.force_denied',
            newValue: { reason: 'non_platform_admin' },
          }),
        );
      } catch {
        /* audit best-effort */
      }
      throw new ForbiddenException({
        message:
          'Le paramètre force=true est réservé aux administrateurs plateforme.',
        reasonCode: 'RESOURCE_ACL_FORCE_FORBIDDEN',
      });
    }
  }

  private async enforceAdminSuccessorLockout(params: {
    clientId: string;
    resourceType: ResourceAclCanonicalResourceType;
    resourceId: string;
    simulatedRows: Array<{
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
    }>;
    context?: ReplaceContext;
  }): Promise<void> {
    if (params.simulatedRows.length === 0) {
      return;
    }

    const ok =
      await this.accessDiagnostics.hasEffectiveAdminSuccessorAfterSimulation({
        clientId: params.clientId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        simulatedRows: params.simulatedRows,
      });
    if (ok) {
      return;
    }

    const force = !!params.context?.force;
    const platform = params.context?.platformRole === PlatformRole.PLATFORM_ADMIN;

    if (force && platform) {
      await this.auditLogs.create(
        this.buildAuditInput({
          clientId: params.clientId,
          businessResourceId: params.resourceId,
          context: params.context,
          action: 'resource_acl.force_used',
          newValue: {
            aclResourceType: params.resourceType,
            resourceId: params.resourceId,
            reason: 'last_admin_lockout_bypass',
          },
        }),
      );
      return;
    }

    await this.auditLogs.create(
      this.buildAuditInput({
        clientId: params.clientId,
        businessResourceId: params.resourceId,
        context: params.context,
        action: 'resource_acl.lockout_blocked',
        newValue: {
          aclResourceType: params.resourceType,
          resourceId: params.resourceId,
        },
      }),
    );
    throw new ConflictException({
      message:
        'Modification refusée : au moins un successeur effectif avec niveau ADMIN ACL est requis tant que la ressource reste en mode restreint.',
      reasonCode: 'RESOURCE_ACL_LAST_ADMIN_LOCKOUT',
    });
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

  /**
   * Évalue le rang ACL max contre un snapshot de lignes (RFC-ACL-014 lockout / diagnostic),
   * sans lecture Prisma des lignes courantes.
   */
  async maxAclRankAgainstSimulatedRows(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    aclRows: Array<{
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
    }>;
  }): Promise<{ unrestricted: boolean; maxRank: number }> {
    const rows = params.aclRows;
    if (rows.length === 0) {
      return { unrestricted: true, maxRank: 0 };
    }
    const groupIds = await this.loadUserGroupIds(params.clientId, params.userId);
    const groupSet = new Set(groupIds);
    let maxRank = 0;
    for (const row of rows) {
      const allowedByUser =
        row.subjectType === ResourceAclSubjectType.USER &&
        row.subjectId === params.userId;
      const allowedByGroup =
        row.subjectType === ResourceAclSubjectType.GROUP &&
        groupSet.has(row.subjectId);
      if (!allowedByUser && !allowedByGroup) continue;
      maxRank = Math.max(maxRank, PERM_RANK[row.permission]);
    }
    return { unrestricted: false, maxRank };
  }

  async canReadResourceWithSimulatedAcl(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    aclRows: Array<{
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
    }>;
    /**
     * Ne jamais utiliser comme bypass. Réservé au plancher déjà validé par le guard appelant
     * pour la même opération (read). Défaut false.
     */
    sharingFloorAllows?: boolean;
  }): Promise<boolean> {
    const d = await this.evaluateResourceAccessWithSimulatedAclRows({
      ...params,
      operation: 'read',
    });
    return d.allowed;
  }

  async canWriteResourceWithSimulatedAcl(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    aclRows: Array<{
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
    }>;
    /**
     * Ne jamais utiliser comme bypass. Réservé au plancher déjà validé par le guard appelant
     * pour la même opération (write). Défaut false.
     */
    sharingFloorAllows?: boolean;
  }): Promise<boolean> {
    const d = await this.evaluateResourceAccessWithSimulatedAclRows({
      ...params,
      operation: 'write',
    });
    return d.allowed;
  }

  async canAdminResourceWithSimulatedAcl(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    aclRows: Array<{
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
    }>;
    /**
     * Ne jamais utiliser comme bypass. Réservé au plancher déjà validé par le guard appelant
     * pour la même opération (admin). Défaut false.
     */
    sharingFloorAllows?: boolean;
  }): Promise<boolean> {
    const d = await this.evaluateResourceAccessWithSimulatedAclRows({
      ...params,
      operation: 'admin',
    });
    return d.allowed;
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
    /**
     * Ne jamais utiliser comme bypass. Aligné sur `canReadResource` / opération du batch :
     * true seulement si la permission correspondante a déjà été validée par le guard appelant.
     * Défaut false.
     */
    sharingFloorAllows?: boolean;
  }): Promise<string[]> {
    const uniqueIds = Array.from(new Set(params.resourceIds.filter(Boolean)));
    if (uniqueIds.length === 0) return [];

    const op = (params.operation ?? 'read') as ResourceAccessDecisionOperation;
    const policyMap = await this.resolveAccessPolicies(
      params.clientId,
      params.resourceTypeNormalized,
      uniqueIds,
    );
    const groupIds = await this.loadUserGroupIds(params.clientId, params.userId);
    const groupSet = new Set(groupIds);

    const rows = await this.prisma.resourceAcl.findMany({
      where: {
        clientId: params.clientId,
        resourceType: params.resourceTypeNormalized,
        resourceId: { in: uniqueIds },
      },
      select: { resourceId: true, subjectType: true, subjectId: true, permission: true },
    });

    const rowsByResource = new Map<
      string,
      Array<{
        resourceId: string;
        subjectType: ResourceAclSubjectType;
        subjectId: string;
        permission: ResourceAclPermission;
      }>
    >();
    for (const row of rows) {
      const list = rowsByResource.get(row.resourceId) ?? [];
      list.push(row);
      rowsByResource.set(row.resourceId, list);
    }

    return uniqueIds.filter((resourceId) => {
      const mode = policyMap.get(resourceId) ?? ResourceAccessPolicyMode.DEFAULT;
      const resourceRows = rowsByResource.get(resourceId) ?? [];
      const maxRank = this.computeMaxRankFromRowsForSubject(
        resourceRows,
        params.userId,
        groupSet,
      );
      const d = evaluateResourceAccessDecision({
        mode,
        operation: op,
        aclEntryCount: resourceRows.length,
        maxRankForSubject: maxRank,
        sharingFloorAllows: params.sharingFloorAllows,
      });
      return d.allowed;
    });
  }

  async canReadResource(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    /**
     * Ne jamais utiliser comme bypass. Réservé au plancher déjà validé par le guard appelant
     * pour la même opération (read). Défaut false.
     */
    sharingFloorAllows?: boolean;
  }): Promise<boolean> {
    const d = await this.evaluateResourceAccess({
      ...params,
      operation: 'read',
    });
    return d.allowed;
  }

  async canWriteResource(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    /**
     * Ne jamais utiliser comme bypass. Réservé au plancher déjà validé par le guard appelant
     * pour la même opération (write). Défaut false.
     */
    sharingFloorAllows?: boolean;
  }): Promise<boolean> {
    const d = await this.evaluateResourceAccess({
      ...params,
      operation: 'write',
    });
    return d.allowed;
  }

  async canAdminResource(params: {
    clientId: string;
    userId: string;
    resourceTypeNormalized: ResourceAclCanonicalResourceType;
    resourceId: string;
    /**
     * Ne jamais utiliser comme bypass. Réservé au plancher déjà validé par le guard appelant
     * pour la même opération (admin). Défaut false.
     */
    sharingFloorAllows?: boolean;
  }): Promise<boolean> {
    const d = await this.evaluateResourceAccess({
      ...params,
      operation: 'admin',
    });
    return d.allowed;
  }

  async upsertAccessPolicy(
    clientId: string,
    rawResourceType: string,
    rawResourceId: string,
    mode: ResourceAccessPolicyMode,
    context?: ReplaceContext,
  ): Promise<ResourceAclListResponse> {
    const { resourceType, resourceId } = this.resolveResourceAclRoute(
      rawResourceType,
      rawResourceId,
    );
    await this.assertValidForceContext(clientId, context);

    const existing = await this.prisma.resourceAccessPolicy.findUnique({
      where: {
        clientId_resourceType_resourceId: { clientId, resourceType, resourceId },
      },
    });

    const row = await this.prisma.resourceAccessPolicy.upsert({
      where: {
        clientId_resourceType_resourceId: { clientId, resourceType, resourceId },
      },
      create: { clientId, resourceType, resourceId, mode },
      update: { mode },
    });

    await this.auditLogs.create(
      this.buildAuditInput({
        clientId,
        businessResourceId: resourceId,
        context,
        action: 'resource_access_policy.changed',
        oldValue: existing ? { mode: existing.mode } : null,
        newValue: { resourceType, resourceId, mode: row.mode },
      }),
    );

    return this.loadAclPayloadForResolvedRoute(
      clientId,
      resourceType,
      resourceId,
      context?.actorUserId,
    );
  }
}
