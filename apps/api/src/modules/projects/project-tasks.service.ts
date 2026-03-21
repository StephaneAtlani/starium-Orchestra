import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ProjectsService } from './projects.service';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';

@Injectable()
export class ProjectTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    return this.prisma.projectTask.findMany({
      where: { clientId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectTaskDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertClientUser(clientId, dto.assigneeUserId);

    const created = await this.prisma.projectTask.create({
      data: {
        clientId,
        projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        assigneeUserId: dto.assigneeUserId ?? null,
        status: dto.status ?? 'TODO',
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_task.create',
      resourceType: 'ProjectTask',
      resourceId: created.id,
      newValue: { projectId, title: created.title },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    } satisfies CreateAuditLogInput);

    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    taskId: string,
    dto: UpdateProjectTaskDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectTask.findFirst({
      where: { id: taskId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }
    await this.projects.assertClientUser(clientId, dto.assigneeUserId);

    const updated = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.assigneeUserId !== undefined && {
          assigneeUserId: dto.assigneeUserId ?? null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.completedAt !== undefined && {
          completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_task.update',
      resourceType: 'ProjectTask',
      resourceId: taskId,
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
    taskId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectTask.findFirst({
      where: { id: taskId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }
    await this.prisma.projectTask.delete({ where: { id: taskId } });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_task.delete',
      resourceType: 'ProjectTask',
      resourceId: taskId,
      oldValue: { title: existing.title },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
