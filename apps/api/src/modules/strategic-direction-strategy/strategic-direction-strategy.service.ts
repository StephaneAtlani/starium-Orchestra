import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StrategicDirectionStrategyStatus, NotificationStatus, NotificationType } from '@prisma/client';
import { satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';
import { ArchiveStrategicDirectionStrategyDto } from './dto/archive-strategic-direction-strategy.dto';
import { CreateStrategicDirectionStrategyDto } from './dto/create-strategic-direction-strategy.dto';
import { ListStrategicDirectionStrategiesQueryDto } from './dto/list-strategic-direction-strategies-query.dto';
import { ReviewStrategicDirectionStrategyDto } from './dto/review-strategic-direction-strategy.dto';
import { SubmitStrategicDirectionStrategyDto } from './dto/submit-strategic-direction-strategy.dto';
import { UpdateStrategicDirectionStrategyDto } from './dto/update-strategic-direction-strategy.dto';
import {
  buildStrategyVersionSummaries,
  compareStrategicDirectionStrategies,
} from './strategic-direction-strategy-versioning';
import { ClientStrategicDirectionStrategyWorkflowSettingsService } from '../clients/client-strategic-direction-strategy-workflow-settings.service';
import { toStrategicDirectionStrategyUserSummary } from './strategic-direction-strategy-user.util';
import {
  normalizeStrategySchemaPayload,
  type NormalizedStrategySchema,
} from './strategic-direction-strategy-schema-normalize';
import {
  computeAlignmentScore,
  computeNowMonthOffset,
  computeSchemaMetrics,
  detectInitiativeOverlaps,
  formatEur,
  type VisionAxisRef,
} from './strategic-direction-strategy-schema-metrics';

type StrategicAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

type JsonArrayInput = ReadonlyArray<object> | undefined;

type StrategyWriteNeed = 'create' | 'update';

type StrategyWriteCapabilities = {
  isSponsor: boolean;
  canCreateStrategy: boolean;
  canUpdateStrategy: boolean;
};

type StrategyLifecycleCaps = {
  canEditContent: boolean;
  canSubmit: boolean;
  canAdaptVersion: boolean;
  canArchive: boolean;
};

const STRATEGY_PERM = {
  create: 'strategic_direction_strategy.create',
  update: 'strategic_direction_strategy.update',
} as const;

const directionSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  accentTone: true,
  parentLabel: true,
  sponsorResourceId: true,
  fteCount: true,
  operatingBudgetCents: true,
  sponsorResource: {
    select: { id: true, name: true, firstName: true },
  },
} as const;

const strategyInclude = {
  direction: {
    select: directionSelect,
  },
  alignedVision: {
    select: { id: true, title: true, horizonLabel: true, isActive: true },
  },
  validator: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;

@Injectable()
export class StrategicDirectionStrategyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly workflowSettings: ClientStrategicDirectionStrategyWorkflowSettingsService,
    private readonly emailService: EmailService,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  private async audit(
    clientId: string,
    context: StrategicAuditContext | undefined,
    action: string,
    resourceId: string,
    oldValue?: Prisma.JsonObject,
    newValue?: Prisma.JsonObject,
  ) {
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'strategic_direction_strategy',
      resourceId,
      oldValue,
      newValue,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  private async resolveActorResourceId(
    clientId: string,
    actorUserId: string | undefined,
  ): Promise<string | null> {
    if (!actorUserId) return null;
    const membership = await this.prisma.clientUser.findUnique({
      where: { userId_clientId: { userId: actorUserId, clientId } },
      select: { resourceId: true },
    });
    return membership?.resourceId ?? null;
  }

  private async actorHasStrategyPermission(
    clientId: string,
    actorUserId: string,
    need: StrategyWriteNeed,
  ): Promise<boolean> {
    const codes = await this.effectivePermissions.resolvePermissionCodesForRequest({
      userId: actorUserId,
      clientId,
    });
    return satisfiesPermission(codes, STRATEGY_PERM[need]);
  }

  private async resolveWriteCapabilities(
    clientId: string,
    actorUserId: string | undefined,
    sponsorResourceId: string | null | undefined,
    actorResourceId?: string | null,
  ): Promise<StrategyWriteCapabilities> {
    const resourceId =
      actorResourceId !== undefined
        ? actorResourceId
        : await this.resolveActorResourceId(clientId, actorUserId);
    const isSponsor = Boolean(
      resourceId && sponsorResourceId && resourceId === sponsorResourceId,
    );
    if (!actorUserId) {
      return { isSponsor, canCreateStrategy: false, canUpdateStrategy: false };
    }
    const [hasCreate, hasUpdate] = await Promise.all([
      this.actorHasStrategyPermission(clientId, actorUserId, 'create'),
      this.actorHasStrategyPermission(clientId, actorUserId, 'update'),
    ]);
    return {
      isSponsor,
      canCreateStrategy: hasCreate || isSponsor,
      canUpdateStrategy: hasUpdate || isSponsor,
    };
  }

  /** Caps dérivés statut + droit d’écriture (RBAC ou sponsor). */
  private deriveLifecycleCaps(
    status: StrategicDirectionStrategyStatus | null | undefined,
    canUpdateStrategy: boolean,
  ): StrategyLifecycleCaps {
    const canWrite = canUpdateStrategy;
    const editable = status === 'DRAFT' || status === 'REJECTED';
    const approved = status === 'APPROVED';
    return {
      canEditContent: canWrite && editable,
      canSubmit: canWrite && editable,
      canAdaptVersion: canWrite && approved,
      canArchive: canWrite && approved,
    };
  }

  /**
   * RBAC create/update **ou** sponsor de la direction
   * (`ClientUser.resourceId` === `StrategicDirection.sponsorResourceId`).
   * Le guard HTTP laisse passer via `…read` ; cette assert est la barrière métier.
   */
  async assertActorCanWriteStrategy(
    clientId: string,
    actorUserId: string | undefined,
    directionId: string,
    need: StrategyWriteNeed,
  ): Promise<void> {
    if (!actorUserId) {
      throw new ForbiddenException('Contexte utilisateur manquant');
    }
    if (await this.actorHasStrategyPermission(clientId, actorUserId, need)) {
      return;
    }
    const direction = await this.prisma.strategicDirection.findFirst({
      where: { id: directionId, clientId },
      select: { sponsorResourceId: true },
    });
    if (!direction) {
      throw new BadRequestException('strategic direction not found for active client');
    }
    const caps = await this.resolveWriteCapabilities(
      clientId,
      actorUserId,
      direction.sponsorResourceId,
    );
    if (need === 'create' ? caps.canCreateStrategy : caps.canUpdateStrategy) {
      return;
    }
    throw new ForbiddenException(
      need === 'create'
        ? 'Seul le sponsor de la direction ou un utilisateur autorisé peut créer ce schéma directeur'
        : 'Seul le sponsor de la direction ou un utilisateur autorisé peut modifier ce schéma directeur',
    );
  }

  private async resolveDirectionForClient(
    clientId: string,
    directionId: string,
    options?: { mustBeActive?: boolean },
  ) {
    const direction = await this.prisma.strategicDirection.findFirst({
      where: { id: directionId, clientId },
      select: { id: true, isActive: true },
    });
    if (!direction) {
      throw new BadRequestException('strategic direction not found for active client');
    }
    if (options?.mustBeActive && !direction.isActive) {
      throw new BadRequestException('strategic direction is inactive');
    }
    return direction;
  }

  private async resolveVisionForClient(clientId: string, visionId: string) {
    const vision = await this.prisma.strategicVision.findFirst({
      where: { id: visionId, clientId },
      select: { id: true, title: true, horizonLabel: true, isActive: true },
    });
    if (!vision) {
      throw new BadRequestException('strategic vision not found for active client');
    }
    return vision;
  }

  private normalizeOptionalString(value: string | undefined): string | null {
    if (value === undefined) return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private asJsonArray(value: JsonArrayInput): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return value as Prisma.InputJsonValue;
  }

  private asJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return value as Prisma.InputJsonValue;
  }

  private validateBudgetsByYear(
    value: Record<string, number> | undefined,
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    const out: Record<string, number> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (!/^\d{4}$/.test(key)) {
        throw new BadRequestException(
          `budgetsByYear key must be a 4-digit year (received "${key}")`,
        );
      }
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        throw new BadRequestException(
          `budgetsByYear["${key}"] must be a non-negative number`,
        );
      }
      out[key] = Math.round(n);
    }
    return out as Prisma.InputJsonValue;
  }

  private validateAxisContributions(
    value: Record<string, number> | undefined,
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    const out: Record<string, number> = {};
    for (const [key, raw] of Object.entries(value)) {
      const id = key.trim();
      if (!id) {
        throw new BadRequestException('axisContributions keys must be non-empty');
      }
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new BadRequestException(
          `axisContributions["${id}"] must be between 0 and 100`,
        );
      }
      out[id] = Math.round(n);
    }
    return out as Prisma.InputJsonValue;
  }

  private mapSponsorLabel(
    sponsorResource:
      | { id: string; name: string; firstName: string | null }
      | null
      | undefined,
  ): string | null {
    if (!sponsorResource) return null;
    const label = [sponsorResource.firstName, sponsorResource.name]
      .filter(Boolean)
      .join(' ')
      .trim();
    return label || sponsorResource.name || null;
  }

  private mapDirectionIdentity<
    T extends {
      operatingBudgetCents?: bigint | number | null;
      sponsorResource?: {
        id: string;
        name: string;
        firstName: string | null;
      } | null;
    },
  >(direction: T) {
    const { sponsorResource, operatingBudgetCents, ...rest } = direction;
    return {
      ...rest,
      operatingBudgetCents:
        operatingBudgetCents == null ? null : Number(operatingBudgetCents),
      sponsorLabel: this.mapSponsorLabel(sponsorResource),
    };
  }

  private mapStrategy<
    T extends {
      validator?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null;
      direction?: {
        operatingBudgetCents?: bigint | number | null;
        sponsorResource?: {
          id: string;
          name: string;
          firstName: string | null;
        } | null;
      } | null;
      ownAxes?: unknown;
      majorInitiatives?: unknown;
      expectedOutcomes?: unknown;
      kpis?: unknown;
      risks?: unknown;
      contentBlocks?: unknown;
      strategicPriorities?: unknown;
      budgetsByYear?: unknown;
      axisContributions?: unknown;
      horizonStartYear?: number | null;
      horizonYearCount?: number | null;
      horizonLabel?: string | null;
    },
  >(strategy: T) {
    const { validator, direction, ...rest } = strategy;
    return {
      ...rest,
      direction: direction ? this.mapDirectionIdentity(direction) : direction,
      validatorSummary: validator
        ? toStrategicDirectionStrategyUserSummary(validator)
        : null,
      schema: normalizeStrategySchemaPayload(strategy),
    };
  }

  private pickLatestStrategy<
    T extends { alignedVisionId: string; updatedAt: Date; createdAt: Date },
  >(strategies: T[], preferredVisionId?: string): T | null {
    if (strategies.length === 0) return null;
    const preferred = preferredVisionId
      ? strategies.filter((s) => s.alignedVisionId === preferredVisionId)
      : [];
    const pool = preferred.length > 0 ? preferred : strategies;
    return [...pool].sort((a, b) => {
      const byUpdated = b.updatedAt.getTime() - a.updatedAt.getTime();
      if (byUpdated !== 0) return byUpdated;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })[0]!;
  }

  private async loadVisionAxes(
    clientId: string,
    visionId: string,
  ): Promise<VisionAxisRef[]> {
    const axes = await this.prisma.strategicAxis.findMany({
      where: { clientId, visionId },
      select: { id: true, name: true, orderIndex: true },
      orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
    });
    return axes.map((a) => ({ id: a.id, name: a.name }));
  }

  private schemaMetricsInput(
    strategy: {
      ambition?: string | null;
      approvedAt?: Date | null;
      updatedAt: Date;
      ownAxes?: unknown;
      majorInitiatives?: unknown;
      expectedOutcomes?: unknown;
      kpis?: unknown;
      risks?: unknown;
      contentBlocks?: unknown;
      strategicPriorities?: unknown;
      budgetsByYear?: unknown;
      axisContributions?: unknown;
      horizonStartYear?: number | null;
      horizonYearCount?: number | null;
      horizonLabel?: string | null;
    },
    visionAxes: VisionAxisRef[],
    schema?: NormalizedStrategySchema,
  ) {
    const normalized = schema ?? normalizeStrategySchemaPayload(strategy);
    const lastReviewAt = strategy.approvedAt ?? strategy.updatedAt ?? null;
    return {
      schema: normalized,
      ambition: strategy.ambition,
      visionAxes,
      lastReviewAt,
      nowMonthOffset: computeNowMonthOffset(normalized.horizonStartYear),
    };
  }

  async validatorOptions(clientId: string, actorUserId: string) {
    const { stored } = await this.workflowSettings.getActive(clientId);
    return this.workflowSettings.listEligibleValidators(clientId, stored, {
      excludeUserId: stored.allowSelfValidation ? undefined : actorUserId,
    });
  }

  /**
   * Décision revue : permission `strategic_direction_strategy.review` (garde HTTP).
   * Le `validatorUserId` sert au routage / notification — tout détenteur de `review`
   * (ex. Gestionnaire Strategic Board) peut trancher.
   * Auto-validation interdite sauf si `allowSelfValidation` est activé dans les options.
   */
  private assertCanReview(
    existing: {
      submittedByUserId: string | null;
      validatorUserId: string | null;
    },
    actorUserId: string | undefined,
    options?: { allowSelfValidation?: boolean },
  ): void {
    if (!actorUserId) {
      throw new ForbiddenException('Authentification requise');
    }
    if (
      !options?.allowSelfValidation &&
      existing.submittedByUserId &&
      existing.submittedByUserId === actorUserId
    ) {
      throw new ForbiddenException(
        'Le soumissionnaire ne peut pas valider sa propre stratégie',
      );
    }
  }

  private assertStrategyEditableForLinks(existing: {
    status: StrategicDirectionStrategyStatus;
  }) {
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('archived strategy is read-only');
    }
    if (existing.status === 'APPROVED') {
      throw new BadRequestException('approved strategy is locked');
    }
    if (existing.status === 'SUBMITTED') {
      throw new BadRequestException('submitted strategy cannot be edited');
    }
  }

  async getLinks(clientId: string, strategyId: string) {
    const strategy = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id: strategyId, clientId },
      select: { id: true, alignedVisionId: true },
    });
    if (!strategy) throw new NotFoundException('Strategic direction strategy not found');

    const [axisLinkRows, objectiveLinkRows, visionAxisRows] = await Promise.all([
      this.prisma.strategicDirectionStrategyAxisLink.findMany({
        where: { strategyId, clientId },
        include: {
          axis: { select: { id: true, name: true, orderIndex: true } },
        },
      }),
      this.prisma.strategicDirectionStrategyObjectiveLink.findMany({
        where: { strategyId, clientId },
        include: {
          objective: {
            select: {
              id: true,
              title: true,
              status: true,
              axis: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.strategicAxis.findMany({
        where: { clientId, visionId: strategy.alignedVisionId },
        select: { id: true, name: true, orderIndex: true },
        orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const sortAxes = (
      list: Array<{ id: string; name: string; orderIndex: number | null }>,
    ) =>
      [...list].sort((a, b) => {
        const ao = a.orderIndex ?? 0;
        const bo = b.orderIndex ?? 0;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name, 'fr');
      });

    const axes = sortAxes(
      axisLinkRows.map((row) => ({
        id: row.axis.id,
        name: row.axis.name,
        orderIndex: row.axis.orderIndex,
      })),
    );

    const visionAxes = sortAxes(
      visionAxisRows.map((row) => ({
        id: row.id,
        name: row.name,
        orderIndex: row.orderIndex,
      })),
    );

    const objectives = [...objectiveLinkRows]
      .map((row) => ({
        id: row.objective.id,
        title: row.objective.title,
        status: row.objective.status,
        axis: { id: row.objective.axis.id, name: row.objective.axis.name },
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'));

    return { axes, objectives, visionAxes };
  }

  async replaceStrategyAxes(
    clientId: string,
    strategyId: string,
    strategicAxisIds: string[],
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id: strategyId, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic direction strategy not found');
    await this.assertActorCanWriteStrategy(
      clientId,
      context?.actorUserId,
      existing.directionId,
      'update',
    );
    this.assertStrategyEditableForLinks(existing);

    const uniqueAxisIds = [...new Set(strategicAxisIds.filter((id) => id?.trim()))];
    let oldAxisIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const prev = await tx.strategicDirectionStrategyAxisLink.findMany({
        where: { strategyId, clientId },
        select: { strategicAxisId: true },
      });
      oldAxisIds = prev.map((p) => p.strategicAxisId);

      if (uniqueAxisIds.length > 0) {
        const axes = await tx.strategicAxis.findMany({
          where: {
            id: { in: uniqueAxisIds },
            clientId,
            visionId: existing.alignedVisionId,
          },
          select: { id: true },
        });
        if (axes.length !== uniqueAxisIds.length) {
          throw new BadRequestException(
            'one or more axes are invalid or not aligned to the strategy vision',
          );
        }
      }

      await tx.strategicDirectionStrategyAxisLink.deleteMany({
        where: { strategyId, clientId },
      });

      if (uniqueAxisIds.length > 0) {
        await tx.strategicDirectionStrategyAxisLink.createMany({
          data: uniqueAxisIds.map((strategicAxisId) => ({
            clientId,
            strategyId,
            strategicAxisId,
          })),
        });
      }

      if (uniqueAxisIds.length === 0) {
        await tx.strategicDirectionStrategyObjectiveLink.deleteMany({
          where: { strategyId, clientId },
        });
      } else {
        await tx.strategicDirectionStrategyObjectiveLink.deleteMany({
          where: {
            strategyId,
            clientId,
            objective: { axisId: { notIn: uniqueAxisIds } },
          },
        });
      }
    });

    await this.audit(
      clientId,
      context,
      'strategic_direction_strategy.axes_replaced',
      strategyId,
      { strategicAxisIds: oldAxisIds } as unknown as Prisma.JsonObject,
      { strategicAxisIds: uniqueAxisIds } as unknown as Prisma.JsonObject,
    );

    return this.getLinks(clientId, strategyId);
  }

  async replaceStrategyObjectives(
    clientId: string,
    strategyId: string,
    strategicObjectiveIds: string[],
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id: strategyId, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic direction strategy not found');
    await this.assertActorCanWriteStrategy(
      clientId,
      context?.actorUserId,
      existing.directionId,
      'update',
    );
    this.assertStrategyEditableForLinks(existing);

    const uniqueObjectiveIds = [...new Set(strategicObjectiveIds.filter((id) => id?.trim()))];
    let oldObjectiveIds: string[] = [];

    const linkedAxisIds = await this.prisma.strategicDirectionStrategyAxisLink.findMany({
      where: { strategyId, clientId },
      select: { strategicAxisId: true },
    });
    const allowedAxisIdSet = new Set(linkedAxisIds.map((r) => r.strategicAxisId));
    const enforceAxisSubset = allowedAxisIdSet.size > 0;

    await this.prisma.$transaction(async (tx) => {
      const prev = await tx.strategicDirectionStrategyObjectiveLink.findMany({
        where: { strategyId, clientId },
        select: { strategicObjectiveId: true },
      });
      oldObjectiveIds = prev.map((p) => p.strategicObjectiveId);

      if (uniqueObjectiveIds.length > 0) {
        const objectives = await tx.strategicObjective.findMany({
          where: { id: { in: uniqueObjectiveIds }, clientId },
          select: {
            id: true,
            axisId: true,
            axis: { select: { visionId: true } },
          },
        });
        if (objectives.length !== uniqueObjectiveIds.length) {
          throw new BadRequestException('one or more strategic objectives were not found');
        }
        for (const obj of objectives) {
          if (obj.axis.visionId !== existing.alignedVisionId) {
            throw new BadRequestException(
              'each objective must belong to an axis of the aligned vision',
            );
          }
          if (enforceAxisSubset && !allowedAxisIdSet.has(obj.axisId)) {
            throw new BadRequestException(
              'each objective must belong to one of the strategy linked axes',
            );
          }
        }
      }

      await tx.strategicDirectionStrategyObjectiveLink.deleteMany({
        where: { strategyId, clientId },
      });

      if (uniqueObjectiveIds.length > 0) {
        await tx.strategicDirectionStrategyObjectiveLink.createMany({
          data: uniqueObjectiveIds.map((strategicObjectiveId) => ({
            clientId,
            strategyId,
            strategicObjectiveId,
          })),
        });
      }
    });

    await this.audit(
      clientId,
      context,
      'strategic_direction_strategy.objectives_replaced',
      strategyId,
      { strategicObjectiveIds: oldObjectiveIds } as unknown as Prisma.JsonObject,
      { strategicObjectiveIds: uniqueObjectiveIds } as unknown as Prisma.JsonObject,
    );

    return this.getLinks(clientId, strategyId);
  }

  async list(clientId: string, query: ListStrategicDirectionStrategiesQueryDto) {
    if (query.directionId) {
      await this.resolveDirectionForClient(clientId, query.directionId);
    }
    if (query.alignedVisionId) {
      await this.resolveVisionForClient(clientId, query.alignedVisionId);
    }
    const hideArchived =
      query.includeArchived !== true && query.status !== StrategicDirectionStrategyStatus.ARCHIVED;
    return this.prisma.strategicDirectionStrategy
      .findMany({
        where: {
          clientId,
          ...(hideArchived ? { NOT: { status: StrategicDirectionStrategyStatus.ARCHIVED } } : {}),
          ...(query.directionId ? { directionId: query.directionId } : {}),
          ...(query.alignedVisionId ? { alignedVisionId: query.alignedVisionId } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.search
            ? {
                OR: [
                  { title: { contains: query.search, mode: 'insensitive' } },
                  { ambition: { contains: query.search, mode: 'insensitive' } },
                  { statement: { contains: query.search, mode: 'insensitive' } },
                  {
                    direction: {
                      OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { code: { contains: query.search, mode: 'insensitive' } },
                      ],
                    },
                  },
                ],
              }
            : {}),
        },
        include: strategyInclude,
        orderBy: [{ updatedAt: 'desc' }],
      })
      .then((rows) => rows.map((row) => this.mapStrategy(row)));
  }

  async getById(clientId: string, id: string, actorUserId?: string) {
    const strategy = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id, clientId },
      include: strategyInclude,
    });
    if (!strategy) throw new NotFoundException('Strategic direction strategy not found');
    const mapped = this.mapStrategy(strategy);
    const caps = await this.resolveWriteCapabilities(
      clientId,
      actorUserId,
      strategy.direction?.sponsorResourceId,
    );
    return {
      ...mapped,
      ...caps,
      ...this.deriveLifecycleCaps(strategy.status, caps.canUpdateStrategy),
    };
  }

  async getPortfolio(
    clientId: string,
    query?: { alignedVisionId?: string; search?: string },
    actorUserId?: string,
  ) {
    if (query?.alignedVisionId) {
      await this.resolveVisionForClient(clientId, query.alignedVisionId);
    }

    const search = query?.search?.trim();
    const directions = await this.prisma.strategicDirection.findMany({
      where: {
        clientId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { parentLabel: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                {
                  sponsorResource: {
                    OR: [
                      { name: { contains: search, mode: 'insensitive' } },
                      { firstName: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        ...directionSelect,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    if (directions.length === 0) {
      return { items: [] as const };
    }

    const [actorResourceId, actorPermCodes] = await Promise.all([
      this.resolveActorResourceId(clientId, actorUserId),
      actorUserId
        ? this.effectivePermissions.resolvePermissionCodesForRequest({
            userId: actorUserId,
            clientId,
          })
        : Promise.resolve(new Set<string>()),
    ]);
    const hasCreate = satisfiesPermission(actorPermCodes, STRATEGY_PERM.create);
    const hasUpdate = satisfiesPermission(actorPermCodes, STRATEGY_PERM.update);

    const directionIds = directions.map((d) => d.id);
    const strategies = await this.prisma.strategicDirectionStrategy.findMany({
      where: {
        clientId,
        directionId: { in: directionIds },
        NOT: { status: StrategicDirectionStrategyStatus.ARCHIVED },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const familyRows = await this.prisma.strategicDirectionStrategy.findMany({
      where: {
        clientId,
        directionId: { in: directionIds },
      },
      select: {
        id: true,
        directionId: true,
        alignedVisionId: true,
        status: true,
        title: true,
        archivedAt: true,
        archivedReason: true,
        approvedAt: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const visionIds = [
      ...new Set(
        strategies
          .map((s) => s.alignedVisionId)
          .concat(query?.alignedVisionId ? [query.alignedVisionId] : []),
      ),
    ];
    const axesRows =
      visionIds.length > 0
        ? await this.prisma.strategicAxis.findMany({
            where: { clientId, visionId: { in: visionIds } },
            select: { id: true, name: true, visionId: true, orderIndex: true },
            orderBy: [{ orderIndex: 'asc' }, { name: 'asc' }],
          })
        : [];
    const axesByVision = new Map<string, VisionAxisRef[]>();
    for (const axis of axesRows) {
      const list = axesByVision.get(axis.visionId) ?? [];
      list.push({ id: axis.id, name: axis.name });
      axesByVision.set(axis.visionId, list);
    }

    const byDirection = new Map<string, typeof strategies>();
    for (const strategy of strategies) {
      const list = byDirection.get(strategy.directionId) ?? [];
      list.push(strategy);
      byDirection.set(strategy.directionId, list);
    }

    const items = directions.map((direction) => {
      const mappedDirection = this.mapDirectionIdentity(direction);
      const picked = this.pickLatestStrategy(
        byDirection.get(direction.id) ?? [],
        query?.alignedVisionId,
      );
      const isSponsor = Boolean(
        actorResourceId &&
          mappedDirection.sponsorResourceId &&
          actorResourceId === mappedDirection.sponsorResourceId,
      );
      const writeCaps = {
        sponsorResourceId: mappedDirection.sponsorResourceId ?? null,
        isSponsor,
        canCreateStrategy: hasCreate || isSponsor,
        canUpdateStrategy: hasUpdate || isSponsor,
      };
      const lifecycleCaps = this.deriveLifecycleCaps(
        picked?.status ?? null,
        writeCaps.canUpdateStrategy,
      );

      if (!picked) {
        return {
          directionId: mappedDirection.id,
          code: mappedDirection.code,
          name: mappedDirection.name,
          description: mappedDirection.description,
          accentTone: mappedDirection.accentTone,
          parentLabel: mappedDirection.parentLabel,
          sponsorLabel: mappedDirection.sponsorLabel,
          fteCount: mappedDirection.fteCount,
          operatingBudgetCents: mappedDirection.operatingBudgetCents,
          strategyId: null as string | null,
          needsStrategy: true,
          status: null as StrategicDirectionStrategyStatus | null,
          versionLabel: null as string | null,
          horizonLabel: null as string | null,
          ambition: null as string | null,
          context: null as string | null,
          initiativesCount: 0,
          initiativesDone: 0,
          score: null as number | null,
          lastReviewAt: null as string | null,
          ...writeCaps,
          ...lifecycleCaps,
        };
      }

      const schema = normalizeStrategySchemaPayload(picked);
      const visionAxes = axesByVision.get(picked.alignedVisionId) ?? [];
      const score = computeAlignmentScore(schema, visionAxes);
      const family = familyRows.filter(
        (row) =>
          row.directionId === picked.directionId &&
          row.alignedVisionId === picked.alignedVisionId,
      );
      const version = buildStrategyVersionSummaries(family, picked.id).find(
        (row) => row.id === picked.id,
      );
      const lastReview = picked.approvedAt ?? picked.updatedAt;

      return {
        directionId: mappedDirection.id,
        code: mappedDirection.code,
        name: mappedDirection.name,
        description: mappedDirection.description,
        accentTone: mappedDirection.accentTone,
        parentLabel: mappedDirection.parentLabel,
        sponsorLabel: mappedDirection.sponsorLabel ?? picked.ownerLabel ?? null,
        fteCount: mappedDirection.fteCount,
        operatingBudgetCents: mappedDirection.operatingBudgetCents,
        strategyId: picked.id,
        needsStrategy: false,
        status: picked.status,
        versionLabel: version?.versionLabel ?? 'v1',
        horizonLabel: picked.horizonLabel,
        ambition: picked.ambition,
        context: picked.context,
        initiativesCount: schema.majorInitiatives.length,
        initiativesDone: schema.majorInitiatives.filter((c) => c.progressPct >= 100)
          .length,
        score,
        lastReviewAt: lastReview?.toISOString() ?? null,
        ...writeCaps,
        ...lifecycleCaps,
      };
    });

    return { items };
  }

  async getSchemaMetrics(clientId: string, id: string) {
    const strategy = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id, clientId },
    });
    if (!strategy) throw new NotFoundException('Strategic direction strategy not found');

    const linkedRows = await this.prisma.strategicDirectionStrategyAxisLink.findMany({
      where: { strategyId: id, clientId },
      include: {
        axis: { select: { id: true, name: true, orderIndex: true } },
      },
    });
    const retainedAxes = [...linkedRows]
      .map((row) => ({
        id: row.axis.id,
        name: row.axis.name,
        orderIndex: row.axis.orderIndex,
      }))
      .sort((a, b) => {
        const ao = a.orderIndex ?? 0;
        const bo = b.orderIndex ?? 0;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name, 'fr');
      })
      .map((a) => ({ id: a.id, name: a.name }));

    // Score + alertes « axe non couvert / contribution » = axes retenus uniquement
    // (Alignement → « Axes du groupe pour cette direction »). Pas de repli sur toute la vision.
    return computeSchemaMetrics(this.schemaMetricsInput(strategy, retainedAxes));
  }

  async getConsolidation(
    clientId: string,
    query?: { alignedVisionId?: string },
  ) {
    let visionId = query?.alignedVisionId?.trim() || null;
    if (visionId) {
      await this.resolveVisionForClient(clientId, visionId);
    } else {
      const activeVision = await this.prisma.strategicVision.findFirst({
        where: { clientId, isActive: true },
        select: { id: true },
        orderBy: [{ updatedAt: 'desc' }],
      });
      visionId = activeVision?.id ?? null;
    }

    const visionAxes = visionId
      ? await this.loadVisionAxes(clientId, visionId)
      : [];

    const directions = await this.prisma.strategicDirection.findMany({
      where: { clientId, isActive: true },
      select: directionSelect,
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    const directionIds = directions.map((d) => d.id);
    const strategies =
      directionIds.length === 0
        ? []
        : await this.prisma.strategicDirectionStrategy.findMany({
            where: {
              clientId,
              directionId: { in: directionIds },
              NOT: { status: StrategicDirectionStrategyStatus.ARCHIVED },
              ...(visionId ? { alignedVisionId: visionId } : {}),
            },
            orderBy: [{ updatedAt: 'desc' }],
          });

    type CardRow = {
      direction: {
        id: string;
        code: string;
        name: string;
        accentTone: string | null;
        sponsorLabel: string | null;
        fteCount: number | null;
        operatingBudgetCents: number | null;
      };
      strategy: (typeof strategies)[number];
      schema: NormalizedStrategySchema;
      score: number;
      maturity: ReturnType<typeof computeSchemaMetrics>['maturity'];
    };

    const cards: CardRow[] = [];
    const byDirection = new Map<string, typeof strategies>();
    for (const strategy of strategies) {
      const list = byDirection.get(strategy.directionId) ?? [];
      list.push(strategy);
      byDirection.set(strategy.directionId, list);
    }

    let horizonStartYear = new Date().getFullYear();
    let horizonYearCount = 3;

    for (const direction of directions) {
      const picked = this.pickLatestStrategy(
        byDirection.get(direction.id) ?? [],
        visionId ?? undefined,
      );
      if (!picked) continue;
      const schema = normalizeStrategySchemaPayload(picked);
      const metrics = computeSchemaMetrics(
        this.schemaMetricsInput(picked, visionAxes, schema),
      );
      horizonStartYear = schema.horizonStartYear;
      horizonYearCount = schema.horizonYearCount;
      cards.push({
        direction: this.mapDirectionIdentity(direction),
        strategy: picked,
        schema,
        score: metrics.score,
        maturity: metrics.maturity,
      });
    }

    if (cards.length > 0) {
      horizonStartYear = Math.min(...cards.map((c) => c.schema.horizonStartYear));
      horizonYearCount = Math.max(...cards.map((c) => c.schema.horizonYearCount));
    }

    const nowMonthOffset = computeNowMonthOffset(horizonStartYear);
    const allInitiatives = cards.flatMap((card) =>
      card.schema.majorInitiatives.map((initiative) => ({
        directionId: card.direction.id,
        directionCode: card.direction.code,
        directionName: card.direction.name,
        accentTone: card.direction.accentTone,
        initiative,
      })),
    );

    const budgetHorizonCents = cards.reduce(
      (sum, card) =>
        sum + Object.values(card.schema.budgetsByYear).reduce((a, b) => a + b, 0),
      0,
    );
    const overlaps = detectInitiativeOverlaps(
      cards.map((card) => ({
        directionId: card.direction.id,
        directionCode: card.direction.code,
        initiatives: card.schema.majorInitiatives,
      })),
      horizonYearCount * 12,
    );
    const averageAlignmentScore =
      cards.length > 0
        ? Math.round(cards.reduce((s, c) => s + c.score, 0) / cards.length)
        : null;

    const axisNameById = new Map(visionAxes.map((a) => [a.id, a.name]));

    return {
      alignedVisionId: visionId,
      horizonStartYear,
      horizonYearCount,
      nowMonthOffset,
      visionAxes,
      kpis: {
        directionsCount: cards.length,
        approvedCount: cards.filter((c) => c.strategy.status === 'APPROVED').length,
        initiativesCount: allInitiatives.length,
        initiativesInProgress: allInitiatives.filter(
          (row) => row.initiative.progressPct > 0 && row.initiative.progressPct < 100,
        ).length,
        budgetHorizonCents,
        budgetHorizonLabel: formatEur(budgetHorizonCents),
        averageAlignmentScore,
        overlapsCount: overlaps.length,
      },
      matrix: cards.map((card) => {
        const budgetSchemaCents = Object.values(card.schema.budgetsByYear).reduce(
          (a, b) => a + b,
          0,
        );
        const progressAvg =
          card.schema.majorInitiatives.length > 0
            ? Math.round(
                card.schema.majorInitiatives.reduce((s, c) => s + c.progressPct, 0) /
                  card.schema.majorInitiatives.length,
              )
            : 0;
        return {
          directionId: card.direction.id,
          strategyId: card.strategy.id,
          directionCode: card.direction.code,
          directionName: card.direction.name,
          accentTone: card.direction.accentTone,
          sponsorLabel: card.direction.sponsorLabel ?? card.strategy.ownerLabel ?? null,
          score: card.score,
          status: card.strategy.status,
          ambition: card.strategy.ambition,
          horizonLabel: card.strategy.horizonLabel,
          fteCount: card.direction.fteCount ?? null,
          operatingBudgetCents: card.direction.operatingBudgetCents ?? null,
          budgetSchemaCents,
          ownAxesCount: card.schema.ownAxes.length,
          outcomesCount: card.schema.expectedOutcomes.length,
          risksCount: card.schema.risks.length,
          initiativesCount: card.schema.majorInitiatives.length,
          initiativesProgressAvg: progressAvg,
          lastReviewAt:
            card.strategy.approvedAt?.toISOString() ??
            card.strategy.updatedAt?.toISOString() ??
            null,
          cells: visionAxes.map((axis) => ({
            axisId: axis.id,
            axisName: axis.name,
            contributionPct: card.schema.axisContributions[axis.id] ?? 0,
            initiativesCount: card.schema.majorInitiatives.filter((c) =>
              c.strategicAxisIds.includes(axis.id),
            ).length,
          })),
        };
      }),
      maturity: cards.map((card) => ({
        directionId: card.direction.id,
        strategyId: card.strategy.id,
        directionCode: card.direction.code,
        directionName: card.direction.name,
        accentTone: card.direction.accentTone,
        maturity: card.maturity,
      })),
      timeline: cards.map((card) => ({
        directionId: card.direction.id,
        strategyId: card.strategy.id,
        directionCode: card.direction.code,
        directionName: card.direction.name,
        accentTone: card.direction.accentTone,
        initiatives: [...card.schema.majorInitiatives].sort(
          (a, b) => a.startMonthOffset - b.startMonthOffset,
        ),
      })),
      portfolioInitiatives: [...allInitiatives]
        .sort((a, b) => a.initiative.startMonthOffset - b.initiative.startMonthOffset)
        .map((row) => {
          const card = cards.find((c) => c.direction.id === row.directionId);
          return {
            directionId: row.directionId,
            strategyId: card?.strategy.id ?? null,
            directionCode: row.directionCode,
            directionName: row.directionName,
            accentTone: row.accentTone,
            initiative: row.initiative,
            axisNames: row.initiative.strategicAxisIds
              .map((id) => axisNameById.get(id))
              .filter((name): name is string => Boolean(name)),
          };
        }),
      overlaps: overlaps.map((pair) => ({
        severity: pair.severity,
        shared: pair.shared,
        overlapMonths: pair.overlapMonths,
        a: {
          directionId: pair.a.directionId,
          directionCode: pair.a.directionCode,
          strategyId:
            cards.find((c) => c.direction.id === pair.a.directionId)?.strategy.id ?? null,
          initiative: pair.a.initiative,
        },
        b: {
          directionId: pair.b.directionId,
          directionCode: pair.b.directionCode,
          strategyId:
            cards.find((c) => c.direction.id === pair.b.directionId)?.strategy.id ?? null,
          initiative: pair.b.initiative,
        },
      })),
    };
  }

  async create(
    clientId: string,
    dto: CreateStrategicDirectionStrategyDto,
    context?: StrategicAuditContext,
  ) {
    await this.resolveDirectionForClient(clientId, dto.directionId, { mustBeActive: true });
    await this.assertActorCanWriteStrategy(
      clientId,
      context?.actorUserId,
      dto.directionId,
      'create',
    );
    await this.resolveVisionForClient(clientId, dto.alignedVisionId);
    const payload: Prisma.StrategicDirectionStrategyUncheckedCreateInput = {
      clientId,
      directionId: dto.directionId,
      alignedVisionId: dto.alignedVisionId,
      title: dto.title.trim(),
      ambition: dto.ambition.trim(),
      context: dto.context.trim(),
      statement: dto.statement?.trim() || dto.ambition.trim(),
      strategicPriorities: this.asJsonArray(dto.strategicPriorities),
      expectedOutcomes: this.asJsonArray(dto.expectedOutcomes),
      kpis: this.asJsonArray(dto.kpis),
      majorInitiatives: this.asJsonArray(dto.majorInitiatives),
      risks: this.asJsonArray(dto.risks),
      ownAxes: this.asJsonValue(dto.ownAxes),
      horizonStartYear: dto.horizonStartYear ?? null,
      horizonYearCount: dto.horizonYearCount ?? undefined,
      budgetsByYear: this.validateBudgetsByYear(dto.budgetsByYear),
      axisContributions: this.validateAxisContributions(dto.axisContributions),
      contentBlocks: this.asJsonValue(dto.contentBlocks),
      horizonLabel: dto.horizonLabel.trim(),
      ownerLabel: this.normalizeOptionalString(dto.ownerLabel),
      status: StrategicDirectionStrategyStatus.DRAFT,
      submittedAt: null,
      submittedByUserId: null,
      approvedAt: null,
      approvedByUserId: null,
      rejectionReason: null,
    };
    try {
      const created = await this.prisma.strategicDirectionStrategy.create({
        data: payload,
        include: strategyInclude,
      });
      await this.audit(
        clientId,
        context,
        'strategic_direction_strategy.created',
        created.id,
        undefined,
        {
          directionId: created.directionId,
          alignedVisionId: created.alignedVisionId,
          title: created.title,
          ambition: created.ambition,
          status: created.status,
        },
      );
      return this.mapStrategy(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('strategic direction strategy already exists');
      }
      throw error;
    }
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateStrategicDirectionStrategyDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic direction strategy not found');
    await this.assertActorCanWriteStrategy(
      clientId,
      context?.actorUserId,
      existing.directionId,
      'update',
    );
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('archived strategy is read-only');
    }
    if (existing.status === 'SUBMITTED') {
      throw new BadRequestException('submitted strategy cannot be edited');
    }
    const isApprovedAdaptation = existing.status === 'APPROVED';
    if (isApprovedAdaptation && !dto.archiveReason?.trim()) {
      throw new BadRequestException('archiveReason is required to adapt an APPROVED strategy');
    }

    const data: Prisma.StrategicDirectionStrategyUncheckedUpdateInput = {};
    if (dto.alignedVisionId !== undefined) {
      await this.resolveVisionForClient(clientId, dto.alignedVisionId);
      data.alignedVisionId = dto.alignedVisionId;
    }
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.ambition !== undefined) data.ambition = dto.ambition.trim();
    if (dto.context !== undefined) data.context = dto.context.trim();
    if (dto.statement !== undefined) data.statement = dto.statement.trim();
    if (dto.horizonLabel !== undefined) data.horizonLabel = dto.horizonLabel.trim();
    if (dto.ownerLabel !== undefined) data.ownerLabel = this.normalizeOptionalString(dto.ownerLabel);
    if (dto.strategicPriorities !== undefined) data.strategicPriorities = this.asJsonArray(dto.strategicPriorities);
    if (dto.expectedOutcomes !== undefined) data.expectedOutcomes = this.asJsonArray(dto.expectedOutcomes);
    if (dto.kpis !== undefined) data.kpis = this.asJsonArray(dto.kpis);
    if (dto.majorInitiatives !== undefined) data.majorInitiatives = this.asJsonArray(dto.majorInitiatives);
    if (dto.risks !== undefined) data.risks = this.asJsonArray(dto.risks);
    if (dto.ownAxes !== undefined) data.ownAxes = this.asJsonValue(dto.ownAxes);
    if (dto.horizonStartYear !== undefined) data.horizonStartYear = dto.horizonStartYear;
    if (dto.horizonYearCount !== undefined) data.horizonYearCount = dto.horizonYearCount;
    if (dto.budgetsByYear !== undefined) {
      data.budgetsByYear = this.validateBudgetsByYear(dto.budgetsByYear);
    }
    if (dto.axisContributions !== undefined) {
      data.axisContributions = this.validateAxisContributions(dto.axisContributions);
    }
    if (dto.contentBlocks !== undefined) {
      data.contentBlocks = this.asJsonValue(dto.contentBlocks);
    }
    // Adaptation APPROVED : autoriser un body avec seul archiveReason (nouvelle version).
    if (Object.keys(data).length === 0 && !(isApprovedAdaptation && dto.archiveReason?.trim())) {
      return this.getById(clientId, id, context?.actorUserId);
    }

    if (existing.status === 'REJECTED') {
      data.status = 'DRAFT';
      data.rejectionReason = null;
      data.submittedAt = null;
      data.submittedByUserId = null;
      data.validatorUserId = null;
      data.approvedAt = null;
      data.approvedByUserId = null;
    }

    let updated:
      | (Prisma.StrategicDirectionStrategyGetPayload<{
          include: typeof strategyInclude;
        }>)
      | null = null;

    try {
      if (isApprovedAdaptation) {
        const adaptationReason = dto.archiveReason!.trim();
        updated = await this.prisma.$transaction(async (tx) => {
        const archivedSnapshot = await tx.strategicDirectionStrategy.create({
          data: {
            clientId: existing.clientId,
            directionId: existing.directionId,
            alignedVisionId: existing.alignedVisionId,
            title: existing.title,
            ambition: existing.ambition,
            context: existing.context,
            statement: existing.statement,
            strategicPriorities: existing.strategicPriorities as Prisma.InputJsonValue,
            expectedOutcomes: existing.expectedOutcomes as Prisma.InputJsonValue,
            kpis: existing.kpis as Prisma.InputJsonValue,
            majorInitiatives: existing.majorInitiatives as Prisma.InputJsonValue,
            risks: existing.risks as Prisma.InputJsonValue,
            ownAxes: existing.ownAxes as Prisma.InputJsonValue,
            horizonStartYear: existing.horizonStartYear,
            horizonYearCount: existing.horizonYearCount,
            budgetsByYear: existing.budgetsByYear as Prisma.InputJsonValue,
            axisContributions: existing.axisContributions as Prisma.InputJsonValue,
            contentBlocks: existing.contentBlocks as Prisma.InputJsonValue,
            horizonLabel: existing.horizonLabel,
            ownerLabel: existing.ownerLabel,
            status: StrategicDirectionStrategyStatus.ARCHIVED,
            submittedAt: existing.submittedAt,
            submittedByUserId: existing.submittedByUserId,
            validatorUserId: existing.validatorUserId,
            approvedAt: existing.approvedAt,
            approvedByUserId: existing.approvedByUserId,
            rejectionReason: existing.rejectionReason,
            archivedReason: adaptationReason,
            archivedAt: new Date(),
          },
          select: { id: true },
        });

        const [axisLinks, objectiveLinks] = await Promise.all([
          tx.strategicDirectionStrategyAxisLink.findMany({
            where: { strategyId: existing.id, clientId },
            select: { strategicAxisId: true },
          }),
          tx.strategicDirectionStrategyObjectiveLink.findMany({
            where: { strategyId: existing.id, clientId },
            select: { strategicObjectiveId: true },
          }),
        ]);

        if (axisLinks.length > 0) {
          await tx.strategicDirectionStrategyAxisLink.createMany({
            data: axisLinks.map((row) => ({
              clientId,
              strategyId: archivedSnapshot.id,
              strategicAxisId: row.strategicAxisId,
            })),
          });
        }
        if (objectiveLinks.length > 0) {
          await tx.strategicDirectionStrategyObjectiveLink.createMany({
            data: objectiveLinks.map((row) => ({
              clientId,
              strategyId: archivedSnapshot.id,
              strategicObjectiveId: row.strategicObjectiveId,
            })),
          });
        }

        return tx.strategicDirectionStrategy.update({
          where: { id },
          data: {
            ...data,
            status: StrategicDirectionStrategyStatus.DRAFT,
            rejectionReason: null,
            submittedAt: null,
            submittedByUserId: null,
            validatorUserId: null,
            approvedAt: null,
            approvedByUserId: null,
            archivedReason: null,
            archivedAt: null,
          },
          include: strategyInclude,
        });
        });
      } else {
        updated = await this.prisma.strategicDirectionStrategy.update({
          where: { id },
          data,
          include: strategyInclude,
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'impossible de créer le snapshot archivé : contrainte direction/vision — applique la migration de versioning ou contacte un administrateur',
        );
      }
      throw error;
    }
    if (!updated) {
      throw new NotFoundException('Strategic direction strategy not found after update');
    }
    await this.audit(
      clientId,
      context,
      'strategic_direction_strategy.updated',
      id,
      {
        title: existing.title,
        ambition: existing.ambition,
        context: existing.context,
        statement: existing.statement,
        horizonLabel: existing.horizonLabel,
        ownerLabel: existing.ownerLabel,
        status: existing.status,
        archiveReason: dto.archiveReason ?? null,
      },
      {
        title: updated.title,
        ambition: updated.ambition,
        context: updated.context,
        statement: updated.statement,
        horizonLabel: updated.horizonLabel,
        ownerLabel: updated.ownerLabel,
        status: updated.status,
      },
    );
    return this.mapStrategy(updated);
  }

  async submit(
    clientId: string,
    id: string,
    dto: SubmitStrategicDirectionStrategyDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic direction strategy not found');
    await this.assertActorCanWriteStrategy(
      clientId,
      context?.actorUserId,
      existing.directionId,
      'update',
    );
    await this.resolveDirectionForClient(clientId, existing.directionId, { mustBeActive: true });
    await this.resolveVisionForClient(clientId, dto.alignedVisionId);
    if (dto.alignedVisionId !== existing.alignedVisionId) {
      throw new BadRequestException('alignedVisionId does not match current strategy alignment');
    }
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('archived strategy cannot be submitted');
    }
    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      throw new BadRequestException('strategy can only be submitted from DRAFT or REJECTED');
    }
    if (!existing.title?.trim() || !existing.ambition?.trim() || !existing.context?.trim()) {
      throw new BadRequestException('title, ambition and context are required before submit');
    }

    const { stored: settings } = await this.workflowSettings.getActive(clientId);
    const actorUserId = context?.actorUserId;
    if (!actorUserId) {
      throw new BadRequestException('actor required to submit strategy');
    }

    let validatorUserId: string;
    if (settings.allowSubmitterToSelectValidator) {
      const picked = dto.validatorUserId?.trim();
      if (!picked) {
        throw new BadRequestException('Validateur requis pour soumettre');
      }
      validatorUserId = picked;
    } else if (settings.defaultValidatorUserId) {
      validatorUserId = settings.defaultValidatorUserId;
    } else {
      // Fallback : 1er autorisé / éligible (≠ soumissionnaire) si défaut non renseigné.
      const eligible = await this.workflowSettings.listEligibleValidatorUserIds(
        clientId,
        settings,
        { excludeUserId: actorUserId },
      );
      const authorized = settings.authorizedValidatorUserIds ?? [];
      const preferred = authorized.find((id) => eligible.includes(id));
      const fallback = preferred ?? eligible[0];
      if (!fallback) {
        throw new BadRequestException(
          'Validateur par défaut non configuré dans les options du module',
        );
      }
      validatorUserId = fallback;
    }

    await this.workflowSettings.assertValidatorEligible(
      clientId,
      validatorUserId,
      settings,
      settings.allowSelfValidation ? undefined : { excludeUserId: actorUserId },
    );

    const submitted = await this.prisma.strategicDirectionStrategy.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedByUserId: actorUserId,
        validatorUserId,
        rejectionReason: null,
        approvedAt: null,
        approvedByUserId: null,
      },
      include: strategyInclude,
    });
    await this.audit(
      clientId,
      context,
      'strategic_direction_strategy.submitted',
      id,
      { status: existing.status },
      {
        status: submitted.status,
        submittedByUserId: submitted.submittedByUserId,
        validatorUserId: submitted.validatorUserId,
      },
    );
    await this.notifyValidatorOnSubmit(
      clientId,
      {
        id: submitted.id,
        title: submitted.title,
        validatorUserId: submitted.validatorUserId,
      },
      actorUserId,
    );
    return this.mapStrategy(submitted);
  }

  private async notifyValidatorOnSubmit(
    clientId: string,
    strategy: {
      id: string;
      title: string | null;
      validatorUserId: string | null;
    },
    actorUserId: string,
  ): Promise<void> {
    const validatorUserId = strategy.validatorUserId;
    if (!validatorUserId) return;

    const [validator, submitter] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: validatorUserId },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: actorUserId },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
    ]);
    if (!validator?.email) return;

    const submitterLabel = submitter
      ? toStrategicDirectionStrategyUserSummary(submitter).displayName
      : 'Un collaborateur';
    const strategyTitle = strategy.title?.trim() || 'Stratégie de direction';
    const title = 'Stratégie à valider';
    const message = `${submitterLabel} a soumis la stratégie « ${strategyTitle} » pour votre validation.`;
    const actionUrl = '/strategic-direction-strategy';

    await this.prisma.notification.create({
      data: {
        clientId,
        userId: validator.id,
        type: NotificationType.INFO,
        title,
        message,
        status: NotificationStatus.UNREAD,
        entityType: 'strategic_direction_strategy',
        entityId: strategy.id,
        entityLabel: strategyTitle,
        actionUrl,
      },
    });

    await this.emailService.queueEmail({
      clientId,
      createdByUserId: actorUserId,
      recipient: validator.email,
      templateKey: 'generic_notification',
      title,
      message,
      actionUrl,
    });
  }

  async review(
    clientId: string,
    id: string,
    dto: ReviewStrategicDirectionStrategyDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic direction strategy not found');
    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestException('strategy review is allowed only from SUBMITTED');
    }
    const { stored: reviewSettings } = await this.workflowSettings.getActive(clientId);
    this.assertCanReview(existing, context?.actorUserId, {
      allowSelfValidation: reviewSettings.allowSelfValidation,
    });
    if (dto.decision === 'REJECTED' && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('rejectionReason is required for REJECTED decision');
    }

    const isApproved = dto.decision === 'APPROVED';
    const reviewed = await this.prisma.strategicDirectionStrategy.update({
      where: { id },
      data: {
        status: isApproved ? 'APPROVED' : 'REJECTED',
        approvedAt: isApproved ? new Date() : null,
        approvedByUserId: isApproved ? context?.actorUserId ?? null : null,
        rejectionReason: isApproved ? null : dto.rejectionReason?.trim() ?? null,
        reviewNote:
          dto.decisionNote?.trim() ||
          (isApproved ? null : dto.rejectionReason?.trim()) ||
          null,
        reviewInstanceLabel: dto.reviewInstanceLabel?.trim() || 'CODIR',
      },
      include: strategyInclude,
    });
    await this.audit(
      clientId,
      context,
      isApproved
        ? 'strategic_direction_strategy.approved'
        : 'strategic_direction_strategy.rejected',
      id,
      { status: existing.status },
      {
        status: reviewed.status,
        rejectionReason: reviewed.rejectionReason,
        reviewNote: reviewed.reviewNote,
        reviewInstanceLabel: reviewed.reviewInstanceLabel,
      },
    );
    return this.mapStrategy(reviewed);
  }

  async archive(
    clientId: string,
    id: string,
    dto: ArchiveStrategicDirectionStrategyDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic direction strategy not found');
    await this.assertActorCanWriteStrategy(
      clientId,
      context?.actorUserId,
      existing.directionId,
      'update',
    );
    if (existing.status !== 'APPROVED') {
      throw new BadRequestException('only APPROVED strategies can be archived');
    }

    const archived = await this.prisma.strategicDirectionStrategy.update({
      where: { id },
      data: {
        status: StrategicDirectionStrategyStatus.ARCHIVED,
        archivedReason: dto.reason.trim(),
        archivedAt: new Date(),
      },
      include: strategyInclude,
    });
    await this.audit(
      clientId,
      context,
      'strategic_direction_strategy.archived',
      id,
      { status: existing.status },
      {
        status: archived.status,
        archivedReason: archived.archivedReason ?? null,
        archivedAt: archived.archivedAt?.toISOString() ?? null,
      } as Prisma.JsonObject,
    );
    return this.mapStrategy(archived);
  }

  async listVersions(clientId: string, strategyId: string) {
    const anchor = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id: strategyId, clientId },
      select: {
        id: true,
        directionId: true,
        alignedVisionId: true,
        direction: { select: { id: true, code: true, name: true } },
        alignedVision: {
          select: { id: true, title: true, horizonLabel: true, isActive: true },
        },
      },
    });
    if (!anchor) throw new NotFoundException('Strategic direction strategy not found');

    const rows = await this.prisma.strategicDirectionStrategy.findMany({
      where: {
        clientId,
        directionId: anchor.directionId,
        alignedVisionId: anchor.alignedVisionId,
      },
      select: {
        id: true,
        status: true,
        title: true,
        archivedAt: true,
        archivedReason: true,
        approvedAt: true,
        updatedAt: true,
        createdAt: true,
        reviewNote: true,
        reviewInstanceLabel: true,
        rejectionReason: true,
      },
    });

    const versions = buildStrategyVersionSummaries(rows, strategyId);
    return {
      direction: anchor.direction,
      alignedVision: anchor.alignedVision,
      currentStrategyId: strategyId,
      versions: versions.map((version) => ({
        ...version,
        archivedAt: version.archivedAt?.toISOString() ?? null,
        approvedAt: version.approvedAt?.toISOString() ?? null,
        updatedAt: version.updatedAt.toISOString(),
      })),
    };
  }

  async compareVersions(clientId: string, baseStrategyId: string, targetStrategyId: string) {
    if (baseStrategyId === targetStrategyId) {
      throw new BadRequestException('compare requires two distinct strategy versions');
    }

    const strategies = await this.prisma.strategicDirectionStrategy.findMany({
      where: { id: { in: [baseStrategyId, targetStrategyId] }, clientId },
      select: {
        id: true,
        directionId: true,
        alignedVisionId: true,
        title: true,
        ambition: true,
        context: true,
        horizonLabel: true,
        ownerLabel: true,
        strategicPriorities: true,
        expectedOutcomes: true,
        kpis: true,
        majorInitiatives: true,
        risks: true,
        status: true,
        archivedAt: true,
        archivedReason: true,
        approvedAt: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    if (strategies.length !== 2) {
      throw new NotFoundException('One or both strategy versions were not found');
    }

    const leftRow = strategies.find((row) => row.id === baseStrategyId);
    const rightRow = strategies.find((row) => row.id === targetStrategyId);
    if (!leftRow || !rightRow) {
      throw new NotFoundException('One or both strategy versions were not found');
    }
    if (
      leftRow.directionId !== rightRow.directionId ||
      leftRow.alignedVisionId !== rightRow.alignedVisionId
    ) {
      throw new BadRequestException('versions must belong to the same direction and vision');
    }

    const familyRows = await this.prisma.strategicDirectionStrategy.findMany({
      where: {
        clientId,
        directionId: leftRow.directionId,
        alignedVisionId: leftRow.alignedVisionId,
      },
      select: {
        id: true,
        status: true,
        title: true,
        archivedAt: true,
        archivedReason: true,
        approvedAt: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    const versionSummaries = buildStrategyVersionSummaries(familyRows, baseStrategyId);
    const leftVersion = versionSummaries.find((version) => version.id === baseStrategyId);
    const rightVersion = versionSummaries.find((version) => version.id === targetStrategyId);
    if (!leftVersion || !rightVersion) {
      throw new NotFoundException('Strategy version metadata not found');
    }

    const [leftLinks, rightLinks] = await Promise.all([
      this.getLinks(clientId, baseStrategyId),
      this.getLinks(clientId, targetStrategyId),
    ]);

    return compareStrategicDirectionStrategies({
      left: {
        id: leftRow.id,
        versionLabel: leftVersion.versionLabel,
        title: leftRow.title,
        ambition: leftRow.ambition,
        context: leftRow.context,
        horizonLabel: leftRow.horizonLabel,
        ownerLabel: leftRow.ownerLabel,
        strategicPriorities: leftRow.strategicPriorities,
        expectedOutcomes: leftRow.expectedOutcomes,
        kpis: leftRow.kpis,
        majorInitiatives: leftRow.majorInitiatives,
        risks: leftRow.risks,
        axes: leftLinks.axes.map((axis) => ({ id: axis.id, name: axis.name })),
        objectives: leftLinks.objectives.map((obj) => ({ id: obj.id, title: obj.title })),
      },
      right: {
        id: rightRow.id,
        versionLabel: rightVersion.versionLabel,
        title: rightRow.title,
        ambition: rightRow.ambition,
        context: rightRow.context,
        horizonLabel: rightRow.horizonLabel,
        ownerLabel: rightRow.ownerLabel,
        strategicPriorities: rightRow.strategicPriorities,
        expectedOutcomes: rightRow.expectedOutcomes,
        kpis: rightRow.kpis,
        majorInitiatives: rightRow.majorInitiatives,
        risks: rightRow.risks,
        axes: rightLinks.axes.map((axis) => ({ id: axis.id, name: axis.name })),
        objectives: rightLinks.objectives.map((obj) => ({ id: obj.id, title: obj.title })),
      },
    });
  }
}
