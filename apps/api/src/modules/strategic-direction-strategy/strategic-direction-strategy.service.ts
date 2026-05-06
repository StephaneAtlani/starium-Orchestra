import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StrategicDirectionStrategyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ArchiveStrategicDirectionStrategyDto } from './dto/archive-strategic-direction-strategy.dto';
import { CreateStrategicDirectionStrategyDto } from './dto/create-strategic-direction-strategy.dto';
import { ListStrategicDirectionStrategiesQueryDto } from './dto/list-strategic-direction-strategies-query.dto';
import { ReviewStrategicDirectionStrategyDto } from './dto/review-strategic-direction-strategy.dto';
import { SubmitStrategicDirectionStrategyDto } from './dto/submit-strategic-direction-strategy.dto';
import { UpdateStrategicDirectionStrategyDto } from './dto/update-strategic-direction-strategy.dto';

type StrategicAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

type JsonArrayInput = Array<Record<string, unknown>> | undefined;

@Injectable()
export class StrategicDirectionStrategyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
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
    return this.prisma.strategicDirectionStrategy.findMany({
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
      include: {
        direction: {
          select: { id: true, code: true, name: true },
        },
        alignedVision: {
          select: { id: true, title: true, horizonLabel: true, isActive: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async getById(clientId: string, id: string) {
    const strategy = await this.prisma.strategicDirectionStrategy.findFirst({
      where: { id, clientId },
      include: {
        direction: {
          select: { id: true, code: true, name: true },
        },
        alignedVision: {
          select: { id: true, title: true, horizonLabel: true, isActive: true },
        },
      },
    });
    if (!strategy) throw new NotFoundException('Strategic direction strategy not found');
    return strategy;
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
        include: {
          direction: {
            select: { id: true, code: true, name: true },
          },
          alignedVision: {
            select: { id: true, title: true, horizonLabel: true, isActive: true },
          },
        },
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
      return created;
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
      data.approvedAt = null;
      data.approvedByUserId = null;
    }

    let updated:
      | (Prisma.StrategicDirectionStrategyGetPayload<{
          include: {
            direction: { select: { id: true; code: true; name: true } };
            alignedVision: { select: { id: true; title: true; horizonLabel: true; isActive: true } };
          };
        }>)
      | null = null;

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
            approvedAt: null,
            approvedByUserId: null,
            archivedReason: null,
            archivedAt: null,
          },
          include: {
            direction: {
              select: { id: true, code: true, name: true },
            },
            alignedVision: {
              select: { id: true, title: true, horizonLabel: true, isActive: true },
            },
          },
        });
      });
    } else {
      updated = await this.prisma.strategicDirectionStrategy.update({
        where: { id },
        data,
        include: {
          direction: {
            select: { id: true, code: true, name: true },
          },
          alignedVision: {
            select: { id: true, title: true, horizonLabel: true, isActive: true },
          },
        },
      });
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
    return updated;
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

    const submitted = await this.prisma.strategicDirectionStrategy.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedByUserId: context?.actorUserId ?? null,
      },
      include: {
        direction: {
          select: { id: true, code: true, name: true },
        },
        alignedVision: {
          select: { id: true, title: true, horizonLabel: true, isActive: true },
        },
      },
    });
    await this.audit(
      clientId,
      context,
      'strategic_direction_strategy.submitted',
      id,
      { status: existing.status },
      { status: submitted.status, submittedByUserId: submitted.submittedByUserId },
    );
    return submitted;
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
      include: {
        direction: {
          select: { id: true, code: true, name: true },
        },
        alignedVision: {
          select: { id: true, title: true, horizonLabel: true, isActive: true },
        },
      },
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
    return reviewed;
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
      include: {
        direction: {
          select: { id: true, code: true, name: true },
        },
        alignedVision: {
          select: { id: true, title: true, horizonLabel: true, isActive: true },
        },
      },
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
    return archived;
  }
}
