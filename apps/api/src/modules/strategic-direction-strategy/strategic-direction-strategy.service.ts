import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StrategicDirectionStrategyStatus, NotificationStatus, NotificationType } from '@prisma/client';
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

type StrategicAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

type JsonArrayInput = Array<Record<string, unknown>> | undefined;

const strategyInclude = {
  direction: {
    select: { id: true, code: true, name: true },
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

  private mapStrategy<
    T extends {
      validator?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null;
    },
  >(strategy: T) {
    const { validator, ...rest } = strategy;
    return {
      ...rest,
      validatorSummary: validator
        ? toStrategicDirectionStrategyUserSummary(validator)
        : null,
    };
  }

  async validatorOptions(clientId: string, actorUserId: string) {
    const { stored } = await this.workflowSettings.getActive(clientId);
    return this.workflowSettings.listEligibleValidators(clientId, stored, {
      excludeUserId: actorUserId,
    });
  }

  private assertCanReview(
    existing: {
      submittedByUserId: string | null;
      validatorUserId: string | null;
    },
    actorUserId: string | undefined,
  ): void {
    if (!actorUserId) {
      throw new ForbiddenException('Authentification requise');
    }
    if (existing.submittedByUserId && existing.submittedByUserId === actorUserId) {
      throw new ForbiddenException(
        'Le soumissionnaire ne peut pas valider sa propre stratégie',
      );
    }
    if (existing.validatorUserId && existing.validatorUserId !== actorUserId) {
      throw new ForbiddenException(
        'Seul le validateur désigné peut décider sur cette stratégie',
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
      select: { id: true },
    });
    if (!strategy) throw new NotFoundException('Strategic direction strategy not found');

    const [axisLinkRows, objectiveLinkRows] = await Promise.all([
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
    ]);

    const axes = [...axisLinkRows]
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
      });

    const objectives = [...objectiveLinkRows]
      .map((row) => ({
        id: row.objective.id,
        title: row.objective.title,
        status: row.objective.status,
        axis: { id: row.objective.axis.id, name: row.objective.axis.name },
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'));

    return { axes, objectives };
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

  async getById(clientId: string, id: string) {
    const strategy = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id, clientId },
      include: strategyInclude,
    });
    if (!strategy) throw new NotFoundException('Strategic direction strategy not found');
    return this.mapStrategy(strategy);
  }

  async create(
    clientId: string,
    dto: CreateStrategicDirectionStrategyDto,
    context?: StrategicAuditContext,
  ) {
    await this.resolveDirectionForClient(clientId, dto.directionId, { mustBeActive: true });
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
    if (Object.keys(data).length === 0) return this.getById(clientId, id);

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
      throw new BadRequestException(
        'Validateur par défaut non configuré dans les options du module',
      );
    }

    await this.workflowSettings.assertValidatorEligible(
      clientId,
      validatorUserId,
      settings,
      { excludeUserId: actorUserId },
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
    this.assertCanReview(existing, context?.actorUserId);
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
      { status: reviewed.status, rejectionReason: reviewed.rejectionReason },
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
