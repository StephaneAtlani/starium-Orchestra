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
  projectActivityEntityAuditSnapshot,
} from './project-audit-serialize';
import { CreateProjectActivityDto } from './dto/create-project-activity.dto';
import { ListProjectActivitiesQueryDto } from './dto/list-project-activities.query.dto';
import { UpdateProjectActivityDto } from './dto/update-project-activity.dto';
import { normalizeListPagination } from './lib/paginated-list.util';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    query: ListProjectActivitiesQueryDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);

    const where: Prisma.ProjectActivityWhereInput = {
      clientId,
      projectId,
    };
    if (query.status) where.status = query.status;
    if (query.frequency) where.frequency = query.frequency;
    if (query.sourceTaskId) where.sourceTaskId = query.sourceTaskId;
    if (query.ownerUserId) where.ownerUserId = query.ownerUserId;

    const [items, total] = await Promise.all([
      this.prisma.projectActivity.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.projectActivity.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async getOne(
    clientId: string,
    projectId: string,
    activityId: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const row = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, clientId, projectId },
    });
    if (!row) throw new NotFoundException('Activity not found');
    return row;
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectActivityDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const source = await this.prisma.projectTask.findFirst({
      where: { id: dto.sourceTaskId, clientId, projectId },
    });
    if (!source) {
      throw new BadRequestException('Source task not found in this project');
    }
    if (source.projectId !== projectId) {
      throw new BadRequestException('Activity project must match source task project');
    }

    await this.projects.assertClientUser(clientId, dto.ownerUserId);
    await this.projects.assertBudgetLineInClient(clientId, dto.budgetLineId);

    const created = await this.prisma.projectActivity.create({
      data: {
        clientId,
        projectId,
        sourceTaskId: dto.sourceTaskId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        status: dto.status ?? 'ACTIVE',
        frequency: dto.frequency,
        customRrule: dto.customRrule?.trim() ?? null,
        nextExecutionDate: dto.nextExecutionDate
          ? new Date(dto.nextExecutionDate)
          : null,
        lastExecutionDate: dto.lastExecutionDate
          ? new Date(dto.lastExecutionDate)
          : null,
        ownerUserId: dto.ownerUserId ?? null,
        budgetLineId: dto.budgetLineId ?? null,
        createdByUserId: actorUserId ?? null,
        updatedByUserId: actorUserId ?? null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_ACTIVITY_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_ACTIVITY,
      resourceId: created.id,
      newValue: projectActivityEntityAuditSnapshot(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    activityId: string,
    dto: UpdateProjectActivityDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Activity not found');
    }
    if (dto.ownerUserId !== undefined) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }
    if (dto.budgetLineId !== undefined) {
      await this.projects.assertBudgetLineInClient(clientId, dto.budgetLineId);
    }

    const updated = await this.prisma.projectActivity.update({
      where: { id: activityId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.customRrule !== undefined && {
          customRrule: dto.customRrule?.trim() ?? null,
        }),
        ...(dto.nextExecutionDate !== undefined && {
          nextExecutionDate: dto.nextExecutionDate
            ? new Date(dto.nextExecutionDate)
            : null,
        }),
        ...(dto.lastExecutionDate !== undefined && {
          lastExecutionDate: dto.lastExecutionDate
            ? new Date(dto.lastExecutionDate)
            : null,
        }),
        ...(dto.ownerUserId !== undefined && { ownerUserId: dto.ownerUserId }),
        ...(dto.budgetLineId !== undefined && { budgetLineId: dto.budgetLineId }),
        updatedByUserId: actorUserId ?? null,
      },
    });

    const oldSnap = projectActivityEntityAuditSnapshot(existing);
    const newSnap = projectActivityEntityAuditSnapshot(updated);
    const { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_ACTIVITY_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_ACTIVITY,
        resourceId: activityId,
        oldValue,
        newValue,
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return updated;
  }
}
