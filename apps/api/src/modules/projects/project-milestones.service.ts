import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import {
  diffAuditSnapshots,
  projectMilestoneEntityAuditSnapshot,
} from './project-audit-serialize';
import { CreateProjectMilestoneDto } from './dto/create-project-milestone.dto';
import { CreateRetroplanMacroDto } from './dto/create-retroplan-macro.dto';
import { ListProjectMilestonesQueryDto } from './dto/list-project-milestones.query.dto';
import { UpdateProjectMilestoneDto } from './dto/update-project-milestone.dto';
import { normalizeListPagination } from './lib/paginated-list.util';
import {
  parseIsoDateOnly,
  subtractCalendarDaysFromUtcNoon,
} from './lib/project-retroplan-macro.util';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectMilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    query: ListProjectMilestonesQueryDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);

    const where: Prisma.ProjectMilestoneWhereInput = {
      clientId,
      projectId,
    };
    if (query.status) where.status = query.status;
    if (query.linkedTaskId) where.linkedTaskId = query.linkedTaskId;
    if (query.dateFrom || query.dateTo) {
      where.targetDate = {};
      if (query.dateFrom) {
        where.targetDate.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.targetDate.lte = new Date(query.dateTo);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.projectMilestone.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { targetDate: 'asc' }],
        skip: offset,
        take: limit,
        include: {
          labelAssignments: { select: { labelId: true } },
        },
      }),
      this.prisma.projectMilestone.count({ where }),
    ]);

    return {
      items: items.map((m) => this.mapMilestoneWithLabels(m)),
      total,
      limit,
      offset,
    };
  }

  async getOne(clientId: string, projectId: string, milestoneId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const m = await this.prisma.projectMilestone.findFirst({
      where: { id: milestoneId, clientId, projectId },
      include: {
        labelAssignments: { select: { labelId: true } },
      },
    });
    if (!m) throw new NotFoundException('Milestone not found');
    return this.mapMilestoneWithLabels(m);
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectMilestoneDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertClientUser(clientId, dto.ownerUserId);
    await this.validateLinkedTask(clientId, projectId, dto.linkedTaskId ?? null);

    const incomingMilestoneLabelIds =
      dto.milestoneLabelIds !== undefined
        ? Array.from(new Set(dto.milestoneLabelIds))
        : undefined;
    if (incomingMilestoneLabelIds) {
      const labels = await this.prisma.projectMilestoneLabel.findMany({
        where: { clientId, projectId, id: { in: incomingMilestoneLabelIds } },
        select: { id: true },
      });
      if (labels.length !== incomingMilestoneLabelIds.length) {
        throw new BadRequestException(
          'milestoneLabelIds: une ou plusieurs étiquettes sont inconnues',
        );
      }
    }

    const created = await this.prisma.projectMilestone.create({
      data: {
        clientId,
        projectId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        code: dto.code?.trim() ?? null,
        targetDate: new Date(dto.targetDate),
        achievedDate: dto.achievedDate ? new Date(dto.achievedDate) : null,
        status: dto.status ?? 'PLANNED',
        linkedTaskId: dto.linkedTaskId ?? null,
        ownerUserId: dto.ownerUserId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdByUserId: actorUserId ?? null,
        updatedByUserId: actorUserId ?? null,
        ...(incomingMilestoneLabelIds && incomingMilestoneLabelIds.length > 0
          ? {
              labelAssignments: {
                create: incomingMilestoneLabelIds.map((labelId) => ({
                  clientId,
                  projectId,
                  labelId,
                })),
              },
            }
          : {}),
      },
      include: {
        labelAssignments: { select: { labelId: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_MILESTONE_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_MILESTONE,
      resourceId: created.id,
      newValue: projectMilestoneEntityAuditSnapshot(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.mapMilestoneWithLabels(created);
  }

  async createRetroplanMacro(
    clientId: string,
    projectId: string,
    dto: CreateRetroplanMacroDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    let anchor: Date;
    try {
      anchor = parseIsoDateOnly(dto.anchorEndDate);
    } catch {
      throw new BadRequestException('Invalid anchorEndDate');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const rows = [];
      for (const step of dto.steps) {
        const targetDate = subtractCalendarDaysFromUtcNoon(anchor, step.daysBeforeEnd);
        const row = await tx.projectMilestone.create({
          data: {
            clientId,
            projectId,
            name: step.name.trim(),
            targetDate,
            achievedDate: null,
            status: 'PLANNED',
            sortOrder: 0,
            createdByUserId: actorUserId ?? null,
            updatedByUserId: actorUserId ?? null,
          },
        });
        rows.push(row);
      }
      return rows;
    });

    for (const row of created) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_MILESTONE_CREATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_MILESTONE,
        resourceId: row.id,
        newValue: projectMilestoneEntityAuditSnapshot(row),
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    milestoneId: string,
    dto: UpdateProjectMilestoneDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectMilestone.findFirst({
      where: { id: milestoneId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Milestone not found');
    }
    if (dto.ownerUserId !== undefined) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }
    const nextLinked =
      dto.linkedTaskId !== undefined ? dto.linkedTaskId : existing.linkedTaskId;
    await this.validateLinkedTask(clientId, projectId, nextLinked);

    const updated = await this.prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.code !== undefined && { code: dto.code?.trim() ?? null }),
        ...(dto.targetDate !== undefined && {
          targetDate: new Date(dto.targetDate),
        }),
        ...(dto.achievedDate !== undefined && {
          achievedDate: dto.achievedDate ? new Date(dto.achievedDate) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.linkedTaskId !== undefined && { linkedTaskId: dto.linkedTaskId }),
        ...(dto.ownerUserId !== undefined && { ownerUserId: dto.ownerUserId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        updatedByUserId: actorUserId ?? null,
      },
    });

    const oldSnap = projectMilestoneEntityAuditSnapshot(existing);
    const newSnap = projectMilestoneEntityAuditSnapshot(updated);
    const { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_MILESTONE_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_MILESTONE,
        resourceId: milestoneId,
        oldValue,
        newValue,
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    if (dto.milestoneLabelIds !== undefined) {
      await this.replaceMilestoneLabels(
        clientId,
        projectId,
        milestoneId,
        dto.milestoneLabelIds,
      );
    }

    const final = await this.prisma.projectMilestone.findFirstOrThrow({
      where: { id: milestoneId, clientId, projectId },
      include: {
        labelAssignments: { select: { labelId: true } },
      },
    });

    return this.mapMilestoneWithLabels(final);
  }

  async delete(
    clientId: string,
    projectId: string,
    milestoneId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectMilestone.findFirst({
      where: { id: milestoneId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Milestone not found');
    }
    await this.prisma.projectMilestone.delete({ where: { id: milestoneId } });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_MILESTONE_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_MILESTONE,
      resourceId: milestoneId,
      oldValue: projectMilestoneEntityAuditSnapshot(existing),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  private async validateLinkedTask(
    clientId: string,
    projectId: string,
    linkedTaskId: string | null,
  ) {
    if (!linkedTaskId) return;
    const t = await this.prisma.projectTask.findFirst({
      where: { id: linkedTaskId, clientId, projectId },
    });
    if (!t) {
      throw new BadRequestException('Linked task not found in this project');
    }
  }

  private mapMilestoneWithLabels(
    milestone: {
      labelAssignments?: Array<{ labelId: string }>;
      [k: string]: unknown;
    } & { id: string },
  ) {
    const { labelAssignments, ...rest } = milestone;
    return {
      ...rest,
      milestoneLabelIds: labelAssignments?.map((a) => a.labelId) ?? [],
    };
  }

  private async replaceMilestoneLabels(
    clientId: string,
    projectId: string,
    milestoneId: string,
    incoming: string[],
  ) {
    const uniqueIncoming = Array.from(new Set(incoming));

    if (uniqueIncoming.length > 0) {
      const labels = await this.prisma.projectMilestoneLabel.findMany({
        where: { clientId, projectId, id: { in: uniqueIncoming } },
        select: { id: true },
      });
      if (labels.length !== uniqueIncoming.length) {
        throw new BadRequestException(
          'milestoneLabelIds: une ou plusieurs étiquettes sont inconnues',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMilestoneLabelAssignment.deleteMany({
        where: { clientId, projectId, projectMilestoneId: milestoneId },
      });

      for (const labelId of uniqueIncoming) {
        await tx.projectMilestoneLabelAssignment.create({
          data: {
            clientId,
            projectId,
            projectMilestoneId: milestoneId,
            labelId,
          },
        });
      }
    });
  }
}
