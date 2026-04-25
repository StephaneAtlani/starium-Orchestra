import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StrategicLinkType,
  StrategicObjectiveStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { activePortfolioProjectsWhere } from '../projects/lib/project-portfolio-active-filter.util';
import { StrategicVisionKpisResponseDto } from './dto/strategic-vision-kpis-response.dto';
import { CreateStrategicAxisDto } from './dto/create-strategic-axis.dto';
import { CreateStrategicLinkDto } from './dto/create-strategic-link.dto';
import { CreateStrategicObjectiveDto } from './dto/create-strategic-objective.dto';
import { CreateStrategicVisionDto } from './dto/create-strategic-vision.dto';
import { UpdateStrategicAxisDto } from './dto/update-strategic-axis.dto';
import { UpdateStrategicObjectiveDto } from './dto/update-strategic-objective.dto';
import { UpdateStrategicVisionDto } from './dto/update-strategic-vision.dto';

type StrategicAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

const strategicVisionInclude = {
  axes: {
    orderBy: [{ orderIndex: 'asc' as const }, { createdAt: 'asc' as const }],
    include: {
      objectives: {
        orderBy: [{ createdAt: 'asc' as const }],
      },
    },
  },
} as const;

const OBJECTIVE_AT_RISK_STATUSES: readonly StrategicObjectiveStatus[] = [
  StrategicObjectiveStatus.AT_RISK,
];
const OBJECTIVE_OFF_TRACK_STATUSES: readonly StrategicObjectiveStatus[] = [
  StrategicObjectiveStatus.OFF_TRACK,
];
const OBJECTIVE_TERMINAL_STATUSES: readonly StrategicObjectiveStatus[] = [
  StrategicObjectiveStatus.COMPLETED,
  StrategicObjectiveStatus.ARCHIVED,
];

@Injectable()
export class StrategicVisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private async audit(
    clientId: string,
    context: StrategicAuditContext | undefined,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValue?: Prisma.JsonObject,
    newValue?: Prisma.JsonObject,
  ) {
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType,
      resourceId,
      oldValue,
      newValue,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async listVisions(clientId: string) {
    return this.prisma.strategicVision.findMany({
      where: { clientId },
      include: strategicVisionInclude,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getKpis(clientId: string): Promise<StrategicVisionKpisResponseDto> {
    const now = new Date();
    const activeProjects = await this.prisma.project.findMany({
      where: activePortfolioProjectsWhere(clientId),
      select: { id: true },
    });
    const activeProjectIds = activeProjects.map((project) => project.id);

    const [
      atRiskObjectives,
      offTrackObjectives,
      overdueObjectives,
      alignedActiveProjectLinks,
    ] = await Promise.all([
      this.prisma.strategicObjective.count({
        where: {
          clientId,
          status: { in: [...OBJECTIVE_AT_RISK_STATUSES] },
        },
      }),
      this.prisma.strategicObjective.count({
        where: {
          clientId,
          status: { in: [...OBJECTIVE_OFF_TRACK_STATUSES] },
        },
      }),
      this.prisma.strategicObjective.count({
        where: {
          clientId,
          deadline: { not: null, lt: now },
          status: { notIn: [...OBJECTIVE_TERMINAL_STATUSES] },
        },
      }),
      activeProjectIds.length
        ? this.prisma.strategicLink.findMany({
            where: {
              clientId,
              linkType: StrategicLinkType.PROJECT,
              targetId: { in: activeProjectIds },
            },
            select: { targetId: true },
            distinct: ['targetId'],
          })
        : Promise.resolve([]),
    ]);

    const totalActiveProjects = activeProjectIds.length;
    const alignedActiveProjects = alignedActiveProjectLinks.length;
    const unalignedProjectsCount = Math.max(
      totalActiveProjects - alignedActiveProjects,
      0,
    );

    const rawRate =
      totalActiveProjects === 0 ? 0 : alignedActiveProjects / totalActiveProjects;
    const projectAlignmentRate = Math.min(Math.max(rawRate, 0), 1);

    return {
      projectAlignmentRate,
      unalignedProjectsCount,
      objectivesAtRiskCount: atRiskObjectives,
      objectivesOffTrackCount: offTrackObjectives,
      overdueObjectivesCount: overdueObjectives,
      generatedAt: now.toISOString(),
    };
  }

  async createVision(
    clientId: string,
    dto: CreateStrategicVisionDto,
    context?: StrategicAuditContext,
  ) {
    const payload = {
      title: dto.title.trim(),
      statement: dto.statement.trim(),
      horizonLabel: dto.horizonLabel.trim(),
    };

    const shouldBeActive = dto.isActive ?? true;

    const created = await this.prisma.$transaction(async (tx) => {
      if (shouldBeActive) {
        await tx.strategicVision.updateMany({
          where: { clientId, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.strategicVision.create({
        data: {
          clientId,
          ...payload,
          isActive: shouldBeActive,
        },
      });
    });

    await this.audit(
      clientId,
      context,
      'strategic_vision.created',
      'strategic_vision',
      created.id,
      undefined,
      payload as Prisma.JsonObject,
    );

    return this.getVisionById(clientId, created.id);
  }

  async getVisionById(clientId: string, id: string) {
    const found = await this.prisma.strategicVision.findFirst({
      where: { id, clientId },
      include: strategicVisionInclude,
    });
    if (!found) throw new NotFoundException('Strategic vision not found');
    return found;
  }

  async updateVision(
    clientId: string,
    id: string,
    dto: UpdateStrategicVisionDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicVision.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic vision not found');

    if (dto.isActive === false && existing.isActive) {
      throw new BadRequestException(
        'active strategic vision cannot be deactivated directly',
      );
    }

    const data: Prisma.StrategicVisionUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.statement !== undefined) data.statement = dto.statement.trim();
    if (dto.horizonLabel !== undefined) data.horizonLabel = dto.horizonLabel.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (Object.keys(data).length === 0) {
      return this.getVisionById(clientId, id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isActive === true) {
        await tx.strategicVision.updateMany({
          where: { clientId, isActive: true, id: { not: id } },
          data: { isActive: false },
        });
      }
      return tx.strategicVision.update({
        where: { id },
        data,
      });
    });

    await this.audit(
      clientId,
      context,
      'strategic_vision.updated',
      'strategic_vision',
      id,
      {
        title: existing.title,
        statement: existing.statement,
        horizonLabel: existing.horizonLabel,
        isActive: existing.isActive,
      },
      {
        title: updated.title,
        statement: updated.statement,
        horizonLabel: updated.horizonLabel,
        isActive: updated.isActive,
      },
    );

    return this.getVisionById(clientId, id);
  }

  async listAxes(clientId: string) {
    return this.prisma.strategicAxis.findMany({
      where: { clientId },
      include: { objectives: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createAxis(
    clientId: string,
    dto: CreateStrategicAxisDto,
    context?: StrategicAuditContext,
  ) {
    const vision = await this.prisma.strategicVision.findFirst({
      where: { id: dto.visionId, clientId },
      select: { id: true },
    });
    if (!vision) {
      throw new BadRequestException('strategic vision not found for active client');
    }

    const created = await this.prisma.strategicAxis.create({
      data: {
        clientId,
        visionId: dto.visionId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        orderIndex: dto.orderIndex ?? null,
      },
    });

    await this.audit(
      clientId,
      context,
      'strategic_axis.created',
      'strategic_axis',
      created.id,
      undefined,
      {
        visionId: created.visionId,
        name: created.name,
        orderIndex: created.orderIndex,
      },
    );

    return created;
  }

  async updateAxis(
    clientId: string,
    axisId: string,
    dto: UpdateStrategicAxisDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicAxis.findFirst({
      where: { id: axisId, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic axis not found');

    const data: Prisma.StrategicAxisUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.orderIndex !== undefined) data.orderIndex = dto.orderIndex;

    if (Object.keys(data).length === 0) return existing;

    const updated = await this.prisma.strategicAxis.update({
      where: { id: axisId },
      data,
    });

    await this.audit(
      clientId,
      context,
      'strategic_axis.updated',
      'strategic_axis',
      axisId,
      {
        name: existing.name,
        description: existing.description,
        orderIndex: existing.orderIndex,
      },
      {
        name: updated.name,
        description: updated.description,
        orderIndex: updated.orderIndex,
      },
    );

    return updated;
  }

  async listObjectives(clientId: string) {
    return this.prisma.strategicObjective.findMany({
      where: { clientId },
      include: { links: { orderBy: { createdAt: 'desc' } } },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async createObjective(
    clientId: string,
    dto: CreateStrategicObjectiveDto,
    context?: StrategicAuditContext,
  ) {
    const axis = await this.prisma.strategicAxis.findFirst({
      where: { id: dto.axisId, clientId },
      select: { id: true },
    });
    if (!axis) {
      throw new BadRequestException('strategic axis not found for active client');
    }

    const created = await this.prisma.strategicObjective.create({
      data: {
        clientId,
        axisId: dto.axisId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        ownerLabel: dto.ownerLabel?.trim() || null,
        status: dto.status ?? StrategicObjectiveStatus.ON_TRACK,
        deadline: dto.deadline ?? null,
      },
    });

    await this.audit(
      clientId,
      context,
      'strategic_objective.created',
      'strategic_objective',
      created.id,
      undefined,
      {
        axisId: created.axisId,
        title: created.title,
        status: created.status,
      },
    );

    return created;
  }

  async updateObjective(
    clientId: string,
    objectiveId: string,
    dto: UpdateStrategicObjectiveDto,
    context?: StrategicAuditContext,
  ) {
    const existing = await this.prisma.strategicObjective.findFirst({
      where: { id: objectiveId, clientId },
    });
    if (!existing) throw new NotFoundException('Strategic objective not found');

    const data: Prisma.StrategicObjectiveUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.ownerLabel !== undefined) data.ownerLabel = dto.ownerLabel?.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.deadline !== undefined) data.deadline = dto.deadline ?? null;

    if (Object.keys(data).length === 0) return this.getObjectiveById(clientId, objectiveId);

    const updated = await this.prisma.strategicObjective.update({
      where: { id: objectiveId },
      data,
    });

    await this.audit(
      clientId,
      context,
      'strategic_objective.updated',
      'strategic_objective',
      objectiveId,
      {
        title: existing.title,
        description: existing.description,
        ownerLabel: existing.ownerLabel,
        status: existing.status,
        deadline: existing.deadline?.toISOString() ?? null,
      },
      {
        title: updated.title,
        description: updated.description,
        ownerLabel: updated.ownerLabel,
        status: updated.status,
        deadline: updated.deadline?.toISOString() ?? null,
      },
    );

    if (existing.status !== updated.status) {
      await this.audit(
        clientId,
        context,
        'strategic_objective.status_changed',
        'strategic_objective',
        objectiveId,
        { status: existing.status },
        { status: updated.status },
      );
    }

    return this.getObjectiveById(clientId, objectiveId);
  }

  async getObjectiveById(clientId: string, objectiveId: string) {
    const objective = await this.prisma.strategicObjective.findFirst({
      where: { id: objectiveId, clientId },
      include: { links: { orderBy: { createdAt: 'desc' } } },
    });
    if (!objective) throw new NotFoundException('Strategic objective not found');
    return objective;
  }

  async addObjectiveLink(
    clientId: string,
    objectiveId: string,
    dto: CreateStrategicLinkDto,
    context?: StrategicAuditContext,
  ) {
    const objective = await this.prisma.strategicObjective.findFirst({
      where: { id: objectiveId, clientId },
      select: { id: true },
    });
    if (!objective) throw new NotFoundException('Strategic objective not found');

    if (dto.linkType === StrategicLinkType.PROJECT) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.targetId, clientId },
        select: { id: true },
      });
      if (!project) {
        throw new BadRequestException('target project not found for active client');
      }
    } else {
      throw new BadRequestException('not supported in MVP');
    }

    const payload = {
      clientId,
      objectiveId,
      linkType: dto.linkType,
      targetId: dto.targetId,
      targetLabelSnapshot: dto.targetLabelSnapshot.trim(),
    };

    try {
      const created = await this.prisma.strategicLink.create({
        data: payload,
      });
      await this.audit(
        clientId,
        context,
        'strategic_objective.link_added',
        'strategic_link',
        created.id,
        undefined,
        {
          objectiveId: created.objectiveId,
          linkType: created.linkType,
          targetId: created.targetId,
          targetLabelSnapshot: created.targetLabelSnapshot,
        },
      );
      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('strategic link already exists for objective');
      }
      throw error;
    }
  }

  async removeObjectiveLink(
    clientId: string,
    objectiveId: string,
    linkId: string,
    context?: StrategicAuditContext,
  ) {
    const link = await this.prisma.strategicLink.findFirst({
      where: { id: linkId, objectiveId, clientId },
    });
    if (!link) throw new NotFoundException('Strategic link not found');

    await this.prisma.strategicLink.delete({ where: { id: linkId } });

    await this.audit(
      clientId,
      context,
      'strategic_objective.link_removed',
      'strategic_link',
      linkId,
      {
        objectiveId: link.objectiveId,
        linkType: link.linkType,
        targetId: link.targetId,
      },
      undefined,
    );
  }
}
