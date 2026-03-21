import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ProjectsService } from './projects.service';
import { CreateProjectMilestoneDto } from './dto/create-project-milestone.dto';
import { UpdateProjectMilestoneDto } from './dto/update-project-milestone.dto';

@Injectable()
export class ProjectMilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectMilestone.findMany({
      where: { clientId, projectId },
      orderBy: { targetDate: 'asc' },
    });
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectMilestoneDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    const created = await this.prisma.projectMilestone.create({
      data: {
        clientId,
        projectId,
        name: dto.name.trim(),
        targetDate: new Date(dto.targetDate),
        actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
        status: dto.status ?? 'PLANNED',
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_milestone.create',
      resourceType: 'ProjectMilestone',
      resourceId: created.id,
      newValue: { projectId, name: created.name },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    } satisfies CreateAuditLogInput);

    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    milestoneId: string,
    dto: UpdateProjectMilestoneDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectMilestone.findFirst({
      where: { id: milestoneId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Milestone not found');
    }

    const updated = await this.prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.targetDate !== undefined && {
          targetDate: new Date(dto.targetDate),
        }),
        ...(dto.actualDate !== undefined && {
          actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_milestone.update',
      resourceType: 'ProjectMilestone',
      resourceId: milestoneId,
      newValue: dto,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return updated;
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
      action: 'project_milestone.delete',
      resourceType: 'ProjectMilestone',
      resourceId: milestoneId,
      oldValue: { name: existing.name },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
