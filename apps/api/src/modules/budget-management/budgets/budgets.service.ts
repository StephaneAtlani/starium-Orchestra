import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BudgetEnvelopeStatus,
  BudgetLineStatus,
  BudgetStatus,
  OrgUnitType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../../audit-logs/audit-logs.service';
import { generateBudgetCode } from '../helpers/code-generator.helper';
import { AuditContext, ListResult } from '../types/audit-context';
import {
  BulkStatusApplyResult,
  BulkUpdateBudgetStatusDto,
} from '../dto/bulk-update-status.dto';
import { bulkStatusFailureMessage } from '../helpers/bulk-status-error.helper';
import { assertBudgetStatusTransition } from '../policies/budget-status-transitions';
import {
  entityKeysFromDto,
  newValueWithStatusComment,
  normalizeStatusChangeComment,
} from '../helpers/status-change-comment.helper';
import { ClientBudgetWorkflowSettingsService } from '../../clients/client-budget-workflow-settings.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsQueryDto } from './dto/list-budgets.query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetSnapshotsService } from '../../budget-snapshots/budget-snapshots.service';
import { normalizeSearchText } from '../../search/search-normalize.util';
import { buildBudgetSearchText } from '../../search/search-text-build.util';
import { BudgetEnvelopesService } from '../budget-envelopes/budget-envelopes.service';
import { BudgetLinesService } from '../budget-lines/budget-lines.service';
import { AccessControlService } from '../../access-control/access-control.service';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../../access-control/resource-acl.constants';
import { AccessDecisionService } from '../../access-decision/access-decision.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { FLAG_KEYS } from '../../feature-flags/flag-keys';
import type { RequestWithClient } from '../../../common/types/request-with-client';
import {
  assertOrgUnitInClient,
  orgUnitAuditRef,
  toOwnerOrgUnitSummary,
} from '../../organization/org-unit-ownership.helpers';
import type { OwnerOrgUnitSummaryDto } from '../../organization/org-unit-ownership.types';
import {
  RESOURCE_OWNERSHIP_AUDIT,
  RESOURCE_OWNERSHIP_AUDIT_RESOURCE_TYPES,
} from '../../organization/resource-ownership-audit.constants';

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly clientBudgetWorkflowSettings: ClientBudgetWorkflowSettingsService,
    private readonly budgetSnapshots: BudgetSnapshotsService,
    private readonly budgetEnvelopes: BudgetEnvelopesService,
    private readonly budgetLines: BudgetLinesService,
    @Inject(AccessControlService)
    private readonly accessControl: Pick<
      AccessControlService,
      'canReadResource' | 'canWriteResource' | 'filterReadableResourceIds'
    > = {
      canReadResource: async () => true,
      canWriteResource: async () => true,
      filterReadableResourceIds: async (params) => params.resourceIds,
    },
    @Inject(AccessDecisionService)
    private readonly accessDecision: Pick<
      AccessDecisionService,
      'assertAllowed' | 'filterResourceIdsByAccess'
    > = {
      assertAllowed: async () => undefined,
      filterResourceIdsByAccess: async (params) => params.resourceIds,
    },
    @Inject(FeatureFlagsService)
    private readonly featureFlags: Pick<FeatureFlagsService, 'isEnabled'> = {
      isEnabled: async () => false,
    },
  ) {}

  private async isAccessV2Enabled(
    clientId: string,
    request?: RequestWithClient,
  ): Promise<boolean> {
    return this.featureFlags.isEnabled(
      clientId,
      FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS,
      request,
    );
  }

  private async assertCanReadBudget(
    clientId: string,
    userId: string,
    budgetId: string,
    request?: RequestWithClient,
  ) {
    if (await this.isAccessV2Enabled(clientId, request)) {
      await this.accessDecision.assertAllowed({
        request,
        clientId,
        userId,
        resourceType: 'BUDGET',
        resourceId: budgetId,
        intent: 'read',
      });
      return;
    }
    const allowed = await this.accessControl.canReadResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.BUDGET,
      resourceId: budgetId,
      sharingFloorAllows: true,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  private async assertCanWriteBudget(
    clientId: string,
    userId: string,
    budgetId: string,
    request?: RequestWithClient,
  ) {
    if (await this.isAccessV2Enabled(clientId, request)) {
      await this.accessDecision.assertAllowed({
        request,
        clientId,
        userId,
        resourceType: 'BUDGET',
        resourceId: budgetId,
        intent: 'write',
      });
      return;
    }
    const allowed = await this.accessControl.canWriteResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.BUDGET,
      resourceId: budgetId,
      sharingFloorAllows: true,
    });
    if (!allowed) throw new ForbiddenException('Accès refusé par ACL ressource');
  }

  async list(
    clientId: string,
    query: ListBudgetsQueryDto,
    userId?: string,
    request?: RequestWithClient,
  ): Promise<ListResult<BudgetWithNumbers>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: import('@prisma/client').Prisma.BudgetWhereInput = {
      clientId,
      ...(query.exerciseId && { exerciseId: query.exerciseId }),
      ...(query.status && { status: query.status }),
      ...(query.ownerUserId && { ownerUserId: query.ownerUserId }),
      ...(query.ownerOrgUnitId && { ownerOrgUnitId: query.ownerOrgUnitId }),
    };
    if (query.search?.trim()) {
      const term = query.search.trim();
      const nt = normalizeSearchText(term);
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        ...(nt.length > 0
          ? [{ searchText: { contains: nt, mode: 'insensitive' as const } }]
          : []),
      ];
    }

    const rows = await this.prisma.budget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const readableBudgetIds = userId
      ? (await this.isAccessV2Enabled(clientId, request))
        ? await this.accessDecision.filterResourceIdsByAccess({
            request: request as RequestWithClient,
            clientId,
            userId,
            resourceType: 'BUDGET',
            resourceIds: rows.map((row) => row.id),
            intent: 'list',
          })
        : await this.accessControl.filterReadableResourceIds({
            clientId,
            userId,
            resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.BUDGET,
            resourceIds: rows.map((row) => row.id),
            operation: 'read',
            sharingFloorAllows: true,
          })
      : rows.map((row) => row.id);
    const total = readableBudgetIds.length;
    const pagedIds = readableBudgetIds.slice(offset, offset + limit);
    const items =
      pagedIds.length === 0
        ? []
        : await this.prisma.budget.findMany({
            where: { clientId, id: { in: pagedIds } },
            include: {
              exercise: { select: { name: true, code: true } },
              owner: { select: { firstName: true, lastName: true, email: true } },
              ownerOrgUnit: { select: { id: true, name: true, type: true, code: true } },
            },
          });
    const byId = new Map(items.map((item) => [item.id, item]));

    const orderedItems: BudgetWithNumbers[] = [];
    for (const id of pagedIds) {
      const item = byId.get(id);
      if (item) orderedItems.push(toResponse(item));
    }

    return {
      items: orderedItems,
      total,
      limit,
      offset,
    };
  }

  async getById(
    clientId: string,
    id: string,
    userId?: string,
    request?: RequestWithClient,
  ): Promise<BudgetWithNumbers> {
    const budget = await this.prisma.budget.findFirst({
      where: { id, clientId },
      include: {
        exercise: { select: { name: true, code: true } },
        owner: { select: { firstName: true, lastName: true, email: true } },
        ownerOrgUnit: { select: { id: true, name: true, type: true, code: true } },
      },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    if (userId) {
      await this.assertCanReadBudget(clientId, userId, id, request);
    }
    const [
      draftEnvelopeCount,
      pendingValidationEnvelopeCount,
      draftLineCount,
      pendingValidationLineCount,
    ] = await Promise.all([
      this.prisma.budgetEnvelope.count({
        where: { budgetId: id, clientId, status: BudgetEnvelopeStatus.DRAFT },
      }),
      this.prisma.budgetEnvelope.count({
        where: {
          budgetId: id,
          clientId,
          status: BudgetEnvelopeStatus.PENDING_VALIDATION,
        },
      }),
      this.prisma.budgetLine.count({
        where: { budgetId: id, clientId, status: BudgetLineStatus.DRAFT },
      }),
      this.prisma.budgetLine.count({
        where: {
          budgetId: id,
          clientId,
          status: BudgetLineStatus.PENDING_VALIDATION,
        },
      }),
    ]);
    return {
      ...toResponse(budget),
      childWorkflowCascadeCounts: {
        draftEnvelopeCount,
        pendingValidationEnvelopeCount,
        draftLineCount,
        pendingValidationLineCount,
      },
    };
  }

  async create(
    clientId: string,
    dto: CreateBudgetDto,
    context?: AuditContext,
  ): Promise<BudgetWithNumbers> {
    const exercise = await this.prisma.budgetExercise.findFirst({
      where: { id: dto.exerciseId, clientId },
    });
    if (!exercise) {
      throw new NotFoundException(
        'Budget exercise not found or does not belong to this client',
      );
    }

    if (dto.ownerUserId) {
      const clientUser = await this.prisma.clientUser.findFirst({
        where: {
          userId: dto.ownerUserId,
          clientId,
          status: 'ACTIVE',
        },
      });
      if (!clientUser) {
        throw new BadRequestException(
          'ownerUserId must be a user linked to the active client',
        );
      }
    }

    if (dto.ownerOrgUnitId?.trim()) {
      await assertOrgUnitInClient(this.prisma, clientId, dto.ownerOrgUnitId.trim());
    }

    let code = dto.code?.trim();
    if (!code) {
      code = await this.resolveUniqueBudgetCode(clientId);
    } else {
      const existing = await this.prisma.budget.findUnique({
        where: { clientId_code: { clientId, code } },
      });
      if (existing) {
        throw new ConflictException(
          `Budget with code "${code}" already exists for this client`,
        );
      }
    }

    const created = await this.prisma.budget.create({
      data: {
        clientId,
        exerciseId: dto.exerciseId,
        name: dto.name,
        code,
        description: dto.description ?? null,
        searchText: buildBudgetSearchText({
          name: dto.name,
          code,
          description: dto.description ?? null,
        }),
        currency: dto.currency,
        status: dto.status ?? BudgetStatus.DRAFT,
        ownerUserId: dto.ownerUserId ?? null,
        ownerOrgUnitId: dto.ownerOrgUnitId?.trim() || null,
        ...(dto.taxMode !== undefined ? { taxMode: dto.taxMode } : {}),
        ...(dto.defaultTaxRate !== undefined
          ? { defaultTaxRate: new Prisma.Decimal(dto.defaultTaxRate) }
          : {}),
      },
      include: {
        exercise: { select: { name: true, code: true } },
        owner: { select: { firstName: true, lastName: true, email: true } },
        ownerOrgUnit: { select: { id: true, name: true, type: true, code: true } },
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'budget.created',
      resourceType: 'budget',
      resourceId: created.id,
      newValue: {
        id: created.id,
        name: created.name,
        code: created.code,
        exerciseId: created.exerciseId,
        currency: created.currency,
        status: created.status,
        taxMode: created.taxMode,
        defaultTaxRate: created.defaultTaxRate ? Number(created.defaultTaxRate) : null,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return toResponse(created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateBudgetDto,
    context?: AuditContext,
    request?: RequestWithClient,
  ): Promise<BudgetWithNumbers> {
    const existing = await this.prisma.budget.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Budget not found');
    }
    if (context?.actorUserId) {
      await this.assertCanWriteBudget(clientId, context.actorUserId, id, request);
    }
    if (
      existing.status === BudgetStatus.LOCKED ||
      existing.status === BudgetStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        'Cannot update a locked or archived budget',
      );
    }
    if (
      existing.isVersioned &&
      existing.versionStatus &&
      ['SUPERSEDED', 'ARCHIVED'].includes(existing.versionStatus)
    ) {
      throw new BadRequestException(
        'Cannot update a superseded or archived version',
      );
    }

    if (dto.ownerUserId !== undefined) {
      if (dto.ownerUserId) {
        const clientUser = await this.prisma.clientUser.findFirst({
          where: {
            userId: dto.ownerUserId,
            clientId,
            status: 'ACTIVE',
          },
        });
        if (!clientUser) {
          throw new BadRequestException(
            'ownerUserId must be a user linked to the active client',
          );
        }
      }
    }

    if (dto.ownerOrgUnitId !== undefined) {
      const nextOwn = dto.ownerOrgUnitId?.trim() || null;
      if (nextOwn) {
        await assertOrgUnitInClient(this.prisma, clientId, nextOwn);
      }
    }

    if (dto.code != null && dto.code !== existing.code) {
      const conflict = await this.prisma.budget.findUnique({
        where: { clientId_code: { clientId, code: dto.code } },
      });
      if (conflict) {
        throw new ConflictException(
          `Budget with code "${dto.code}" already exists for this client`,
        );
      }
    }

    if (dto.status != null && dto.status !== existing.status) {
      assertBudgetStatusTransition(existing.status, dto.status);
    }

    const statusChanging =
      dto.status !== undefined && dto.status !== existing.status;

    let draftEnvelopeCount = 0;
    let pendingEnvelopeCount = 0;
    let draftLineCount = 0;
    let pendingLineCount = 0;
    if (statusChanging) {
      [
        draftEnvelopeCount,
        pendingEnvelopeCount,
        draftLineCount,
        pendingLineCount,
      ] = await Promise.all([
        this.prisma.budgetEnvelope.count({
          where: { budgetId: id, clientId, status: BudgetEnvelopeStatus.DRAFT },
        }),
        this.prisma.budgetEnvelope.count({
          where: {
            budgetId: id,
            clientId,
            status: BudgetEnvelopeStatus.PENDING_VALIDATION,
          },
        }),
        this.prisma.budgetLine.count({
          where: { budgetId: id, clientId, status: BudgetLineStatus.DRAFT },
        }),
        this.prisma.budgetLine.count({
          where: {
            budgetId: id,
            clientId,
            status: BudgetLineStatus.PENDING_VALIDATION,
          },
        }),
      ]);
    }

    const cascadeRequired =
      statusChanging &&
      dto.status != null &&
      this.requiresCascadeChildWorkflowConfirmation(
        existing.status,
        dto.status,
        draftEnvelopeCount,
        pendingEnvelopeCount,
        draftLineCount,
        pendingLineCount,
      );

    if (cascadeRequired && dto.cascadeChildWorkflowStatuses !== true) {
      throw new BadRequestException({
        message:
          'Confirmation requise pour mettre à jour les statuts des enveloppes et lignes du budget.',
        code: 'cascade_confirmation_required',
      });
    }

    const useCascadeTransaction =
      dto.cascadeChildWorkflowStatuses === true && cascadeRequired;

    let childAudits: CreateAuditLogInput[] = [];

    type BudgetUpdateRow = NonNullable<
      Awaited<ReturnType<PrismaService['budget']['update']>>
    > & {
      exercise?: { name: string; code: string } | null;
      owner?: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      } | null;
      ownerOrgUnit?: {
        id: string;
        name: string;
        type: import('@prisma/client').OrgUnitType;
        code: string | null;
      } | null;
    };

    let updated: BudgetUpdateRow;

    const budgetSearchTextMerged = buildBudgetSearchText({
      name: dto.name != null ? dto.name : existing.name,
      code: dto.code != null ? dto.code : existing.code,
      description:
        dto.description !== undefined ? dto.description : existing.description,
    });

    if (useCascadeTransaction && dto.status != null) {
      const result = await this.prisma.$transaction(async (tx) => {
        let audits: CreateAuditLogInput[] = [];
        if (
          existing.status === BudgetStatus.DRAFT &&
          dto.status === BudgetStatus.SUBMITTED
        ) {
          audits = await this.cascadeDraftToPendingForBudget(tx, clientId, id);
        } else if (
          (existing.status === BudgetStatus.SUBMITTED ||
            existing.status === BudgetStatus.REVISED) &&
          dto.status === BudgetStatus.VALIDATED
        ) {
          audits = await this.cascadeToValidatedForBudget(tx, clientId, id);
        }

        if (dto.status === BudgetStatus.VALIDATED) {
          const resolved =
            await this.clientBudgetWorkflowSettings.getResolvedForClient(
              clientId,
            );
          if (resolved.requireEnvelopesNonDraftForBudgetValidated) {
            const stillDraft = await tx.budgetEnvelope.count({
              where: {
                budgetId: id,
                clientId,
                status: BudgetEnvelopeStatus.DRAFT,
              },
            });
            if (stillDraft > 0) {
              throw new BadRequestException(
                'Cannot validate budget: every envelope must leave DRAFT status first',
              );
            }
          }
        }

        const row = await tx.budget.update({
          where: { id },
          data: {
            ...(dto.name != null && { name: dto.name }),
            ...(dto.code != null && { code: dto.code }),
            ...(dto.description !== undefined && {
              description: dto.description,
            }),
            ...(dto.currency != null && { currency: dto.currency }),
            ...(dto.status != null && { status: dto.status }),
            ...(dto.ownerUserId !== undefined && {
              ownerUserId: dto.ownerUserId || null,
            }),
            ...(dto.ownerOrgUnitId !== undefined && {
              ownerOrgUnitId: dto.ownerOrgUnitId?.trim() || null,
            }),
            ...(dto.taxMode !== undefined ? { taxMode: dto.taxMode } : {}),
            ...(dto.defaultTaxRate !== undefined
              ? { defaultTaxRate: new Prisma.Decimal(dto.defaultTaxRate) }
              : {}),
            searchText: budgetSearchTextMerged,
          },
          include: {
            exercise: { select: { name: true, code: true } },
            owner: { select: { firstName: true, lastName: true, email: true } },
            ownerOrgUnit: { select: { id: true, name: true, type: true, code: true } },
          },
        });
        return { row, audits };
      });
      childAudits = result.audits;
      updated = result.row;
    } else {
      if (
        dto.status === BudgetStatus.VALIDATED &&
        dto.status !== existing.status
      ) {
        const resolved =
          await this.clientBudgetWorkflowSettings.getResolvedForClient(
            clientId,
          );
        if (resolved.requireEnvelopesNonDraftForBudgetValidated) {
          const draftEnv = await this.prisma.budgetEnvelope.count({
            where: {
              budgetId: id,
              clientId,
              status: BudgetEnvelopeStatus.DRAFT,
            },
          });
          if (draftEnv > 0) {
            throw new BadRequestException(
              'Cannot validate budget: every envelope must leave DRAFT status first',
            );
          }
        }
      }

      updated = await this.prisma.budget.update({
        where: { id },
        data: {
          ...(dto.name != null && { name: dto.name }),
          ...(dto.code != null && { code: dto.code }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.currency != null && { currency: dto.currency }),
          ...(dto.status != null && { status: dto.status }),
          ...(dto.ownerUserId !== undefined && {
            ownerUserId: dto.ownerUserId || null,
          }),
          ...(dto.ownerOrgUnitId !== undefined && {
            ownerOrgUnitId: dto.ownerOrgUnitId?.trim() || null,
          }),
          ...(dto.taxMode !== undefined ? { taxMode: dto.taxMode } : {}),
          ...(dto.defaultTaxRate !== undefined
            ? { defaultTaxRate: new Prisma.Decimal(dto.defaultTaxRate) }
            : {}),
          searchText: budgetSearchTextMerged,
        },
        include: {
          exercise: { select: { name: true, code: true } },
          owner: { select: { firstName: true, lastName: true, email: true } },
          ownerOrgUnit: { select: { id: true, name: true, type: true, code: true } },
        },
      });
    }

    // RFC-032 §4.1.5 : statut seul → `budget.status.changed` uniquement ; statut + autres champs →
    // `budget.status.changed` puis `budget.updated` sans propriété `status` ; sinon `budget.updated` complet.
    const dtoRecord = dto as Record<string, unknown>;
    const keysInDto = entityKeysFromDto(dtoRecord);
    const statusComment = normalizeStatusChangeComment(dto.statusChangeComment);
    const statusChanged =
      dto.status !== undefined && dto.status !== existing.status;
    const onlyStatusInDto =
      keysInDto.length === 1 && keysInDto[0] === 'status';

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    for (const a of childAudits) {
      await this.auditLogs.create({
        ...a,
        userId: context?.actorUserId,
        ...meta,
      });
    }

    const prevBudgetOwn = existing.ownerOrgUnitId ?? null;
    const nextBudgetOwn = updated.ownerOrgUnitId ?? null;
    if (prevBudgetOwn !== nextBudgetOwn && context?.actorUserId) {
      const [oldRef, newRef] = await Promise.all([
        orgUnitAuditRef(this.prisma, clientId, prevBudgetOwn),
        orgUnitAuditRef(this.prisma, clientId, nextBudgetOwn),
      ]);
      await this.auditLogs.create({
        clientId,
        userId: context.actorUserId,
        action: RESOURCE_OWNERSHIP_AUDIT.BUDGET,
        resourceType: RESOURCE_OWNERSHIP_AUDIT_RESOURCE_TYPES.BUDGET,
        resourceId: updated.id,
        oldValue: oldRef,
        newValue: newRef,
        ...meta,
      });
    }

    if (onlyStatusInDto && !statusChanged) {
      return toResponse(updated);
    }

    if (onlyStatusInDto && statusChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget.status.changed',
        resourceType: 'budget',
        resourceId: updated.id,
        oldValue: { from: existing.status },
        newValue: newValueWithStatusComment(updated.status, statusComment),
        ...meta,
      });
    } else if (statusChanged && !onlyStatusInDto) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget.status.changed',
        resourceType: 'budget',
        resourceId: updated.id,
        oldValue: { from: existing.status },
        newValue: newValueWithStatusComment(updated.status, statusComment),
        ...meta,
      });
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: 'budget.updated',
        resourceType: 'budget',
        resourceId: updated.id,
        oldValue: {
          name: existing.name,
          code: existing.code,
          taxMode: existing.taxMode,
          defaultTaxRate: existing.defaultTaxRate
            ? Number(existing.defaultTaxRate)
            : null,
        },
        newValue: {
          name: updated.name,
          code: updated.code,
          taxMode: updated.taxMode,
          defaultTaxRate: updated.defaultTaxRate
            ? Number(updated.defaultTaxRate)
            : null,
        },
        ...meta,
      });
    } else {
      const auditInput: CreateAuditLogInput = {
        clientId,
        userId: context?.actorUserId,
        action: 'budget.updated',
        resourceType: 'budget',
        resourceId: updated.id,
        oldValue: {
          name: existing.name,
          code: existing.code,
          status: existing.status,
          taxMode: existing.taxMode,
          defaultTaxRate: existing.defaultTaxRate
            ? Number(existing.defaultTaxRate)
            : null,
        },
        newValue: {
          name: updated.name,
          code: updated.code,
          status: updated.status,
          taxMode: updated.taxMode,
          defaultTaxRate: updated.defaultTaxRate
            ? Number(updated.defaultTaxRate)
            : null,
        },
        ...meta,
      };
      await this.auditLogs.create(auditInput);
    }

    if (
      statusChanged &&
      (updated.status === BudgetStatus.SUBMITTED ||
        updated.status === BudgetStatus.VALIDATED)
    ) {
      try {
        await this.budgetSnapshots.createWorkflowMilestoneSnapshot(
          clientId,
          id,
          updated.status === BudgetStatus.SUBMITTED ? 'SUBMITTED' : 'VALIDATED',
          {
            actorUserId: context?.actorUserId,
            meta: context?.meta,
          },
        );
      } catch (err) {
        this.logger.error(
          `Échec de la version figée workflow pour le budget ${id} (${updated.status})`,
          err instanceof Error ? err.stack : err,
        );
        await this.auditLogs.create({
          clientId,
          userId: context?.actorUserId,
          action: 'budget.workflow_snapshot.failed',
          resourceType: 'budget',
          resourceId: id,
          newValue: {
            milestone: updated.status,
            error:
              err instanceof Error ? err.message : String(err),
          },
          ...meta,
        });
      }
    }

    return toResponse(updated);
  }

  async bulkUpdateStatus(
    clientId: string,
    dto: BulkUpdateBudgetStatusDto,
    context?: AuditContext,
  ): Promise<BulkStatusApplyResult> {
    const uniqueIds = [...new Set(dto.ids)];
    const updatedIds: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of uniqueIds) {
      try {
        await this.update(clientId, id, {
          status: dto.status,
          ...(dto.statusChangeComment !== undefined
            ? { statusChangeComment: dto.statusChangeComment }
            : {}),
        }, context);
        updatedIds.push(id);
      } catch (e) {
        failed.push({ id, error: bulkStatusFailureMessage(e) });
      }
    }

    return {
      status: dto.status,
      updatedIds,
      failed,
    };
  }

  private requiresCascadeChildWorkflowConfirmation(
    from: BudgetStatus,
    to: BudgetStatus,
    draftEnv: number,
    pendingEnv: number,
    draftLine: number,
    pendingLine: number,
  ): boolean {
    if (to === BudgetStatus.SUBMITTED && from === BudgetStatus.DRAFT) {
      return draftEnv > 0 || draftLine > 0;
    }
    if (
      to === BudgetStatus.VALIDATED &&
      (from === BudgetStatus.SUBMITTED || from === BudgetStatus.REVISED)
    ) {
      return (
        draftEnv > 0 ||
        pendingEnv > 0 ||
        draftLine > 0 ||
        pendingLine > 0
      );
    }
    return false;
  }

  private async cascadeDraftToPendingForBudget(
    tx: Prisma.TransactionClient,
    clientId: string,
    budgetId: string,
  ): Promise<CreateAuditLogInput[]> {
    const audits: CreateAuditLogInput[] = [];
    const envelopes = await tx.budgetEnvelope.findMany({
      where: { budgetId, clientId, status: BudgetEnvelopeStatus.DRAFT },
      select: { id: true },
    });
    for (const { id: eid } of envelopes) {
      const a = await this.budgetEnvelopes.applyWorkflowCascadeStatusTransition(
        clientId,
        eid,
        BudgetEnvelopeStatus.PENDING_VALIDATION,
        tx,
      );
      if (a) audits.push(a);
    }
    const lines = await tx.budgetLine.findMany({
      where: { budgetId, clientId, status: BudgetLineStatus.DRAFT },
      select: { id: true },
    });
    for (const { id: lid } of lines) {
      const a = await this.budgetLines.applyWorkflowCascadeStatusTransition(
        clientId,
        lid,
        BudgetLineStatus.PENDING_VALIDATION,
        tx,
      );
      if (a) audits.push(a);
    }
    return audits;
  }

  private async cascadeToValidatedForBudget(
    tx: Prisma.TransactionClient,
    clientId: string,
    budgetId: string,
  ): Promise<CreateAuditLogInput[]> {
    const audits: CreateAuditLogInput[] = [];
    const envDraft = await tx.budgetEnvelope.findMany({
      where: { budgetId, clientId, status: BudgetEnvelopeStatus.DRAFT },
      select: { id: true },
    });
    for (const { id: eid } of envDraft) {
      const a = await this.budgetEnvelopes.applyWorkflowCascadeStatusTransition(
        clientId,
        eid,
        BudgetEnvelopeStatus.PENDING_VALIDATION,
        tx,
      );
      if (a) audits.push(a);
    }
    const lineDraft = await tx.budgetLine.findMany({
      where: { budgetId, clientId, status: BudgetLineStatus.DRAFT },
      select: { id: true },
    });
    for (const { id: lid } of lineDraft) {
      const a = await this.budgetLines.applyWorkflowCascadeStatusTransition(
        clientId,
        lid,
        BudgetLineStatus.PENDING_VALIDATION,
        tx,
      );
      if (a) audits.push(a);
    }

    const envPending = await tx.budgetEnvelope.findMany({
      where: {
        budgetId,
        clientId,
        status: BudgetEnvelopeStatus.PENDING_VALIDATION,
      },
      select: { id: true },
    });
    for (const { id: eid } of envPending) {
      const a = await this.budgetEnvelopes.applyWorkflowCascadeStatusTransition(
        clientId,
        eid,
        BudgetEnvelopeStatus.ACTIVE,
        tx,
      );
      if (a) audits.push(a);
    }
    const linePending = await tx.budgetLine.findMany({
      where: {
        budgetId,
        clientId,
        status: BudgetLineStatus.PENDING_VALIDATION,
      },
      select: { id: true },
    });
    for (const { id: lid } of linePending) {
      const a = await this.budgetLines.applyWorkflowCascadeStatusTransition(
        clientId,
        lid,
        BudgetLineStatus.ACTIVE,
        tx,
      );
      if (a) audits.push(a);
    }
    return audits;
  }

  private async resolveUniqueBudgetCode(clientId: string): Promise<string> {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const code = generateBudgetCode();
      const existing = await this.prisma.budget.findUnique({
        where: { clientId_code: { clientId, code } },
      });
      if (!existing) return code;
    }
    throw new ConflictException('Could not generate unique code for budget');
  }
}

type BudgetRow = Awaited<ReturnType<PrismaService['budget']['findFirst']>>;
type BudgetWithNumbers = Omit<
  NonNullable<BudgetRow>,
  'defaultTaxRate' | 'exercise' | 'owner' | 'ownerOrgUnit'
> & {
  defaultTaxRate: number | null;
  exerciseName?: string;
  exerciseCode?: string | null;
  /** Libellé affichable (prénom + nom ou email) — dérivé de `owner` en base. */
  ownerUserName: string | null;
  ownerOrgUnitSummary: OwnerOrgUnitSummaryDto;
  /** Présent sur le détail budget (compteurs pour modale cascade workflow). */
  childWorkflowCascadeCounts?: {
    draftEnvelopeCount: number;
    pendingValidationEnvelopeCount: number;
    draftLineCount: number;
    pendingValidationLineCount: number;
  };
};

function formatOwnerDisplayName(
  owner: { firstName: string | null; lastName: string | null; email: string } | null | undefined,
): string | null {
  if (!owner) return null;
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim();
  return name || owner.email;
}

function toResponse(
  row: NonNullable<BudgetRow> & {
    exercise?: { name: string; code: string } | null;
    owner?: { firstName: string | null; lastName: string | null; email: string } | null;
    ownerOrgUnit?: {
      id: string;
      name: string;
      type: OrgUnitType;
      code: string | null;
    } | null;
  },
): BudgetWithNumbers {
  const { exercise, defaultTaxRate, owner, ownerOrgUnit, ...rest } = row;
  return {
    ...rest,
    defaultTaxRate: defaultTaxRate ? Number(defaultTaxRate) : null,
    ownerUserName: formatOwnerDisplayName(owner),
    ownerOrgUnitSummary: toOwnerOrgUnitSummary(ownerOrgUnit),
    ...(exercise && {
      exerciseName: exercise.name,
      exerciseCode: exercise.code,
    }),
  };
}
