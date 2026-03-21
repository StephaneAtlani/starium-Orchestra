import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import {
  diffAuditSnapshots,
  omitKeysFromDiff,
  projectTaskEntityAuditSnapshot,
} from './project-audit-serialize';
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

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_TASK_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
      resourceId: created.id,
      newValue: projectTaskEntityAuditSnapshot(created),
      ...meta,
    });

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
    if (dto.assigneeUserId !== undefined) {
      await this.projects.assertClientUser(clientId, dto.assigneeUserId);
    }

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

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    const oldSnap = projectTaskEntityAuditSnapshot(existing);
    const newSnap = projectTaskEntityAuditSnapshot(updated);
    let { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);
    const statusChanged = existing.status !== updated.status;
    const assigneeChanged = existing.assigneeUserId !== updated.assigneeUserId;
    const keysToOmit: string[] = [];
    if (statusChanged) keysToOmit.push('status');
    if (assigneeChanged) keysToOmit.push('assigneeUserId');
    ({ oldValue, newValue } = omitKeysFromDiff(oldValue, newValue, keysToOmit));

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        resourceId: taskId,
        oldValue,
        newValue,
        ...meta,
      });
    }

    if (statusChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_STATUS_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        resourceId: taskId,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
        ...meta,
      });
    }

    if (assigneeChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_ASSIGNED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        resourceId: taskId,
        oldValue: { assigneeUserId: existing.assigneeUserId ?? null },
        newValue: { assigneeUserId: updated.assigneeUserId ?? null },
        ...meta,
      });
    }

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
      action: PROJECT_AUDIT_ACTION.PROJECT_TASK_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
      resourceId: taskId,
      oldValue: projectTaskEntityAuditSnapshot(existing),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }
}
