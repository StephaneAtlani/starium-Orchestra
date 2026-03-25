import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectTaskStatus } from '@prisma/client';
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
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import { ListProjectTasksQueryDto } from './dto/list-project-tasks.query.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { normalizeListPagination } from './lib/paginated-list.util';
import {
  wouldTaskDependencyCreateCycle,
  wouldTaskParentCreateCycle,
} from './lib/project-task-graph.util';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProjectTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    query: ListProjectTasksQueryDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);

    const where: Prisma.ProjectTaskWhereInput = {
      clientId,
      projectId,
    };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.parentTaskId !== undefined && query.parentTaskId !== '') {
      where.parentTaskId = query.parentTaskId;
    }
    if (query.ownerUserId) where.ownerUserId = query.ownerUserId;
    if (query.search?.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.projectTask.findMany({
        where,
        orderBy: [
          { sortOrder: 'asc' },
          { plannedStartDate: 'asc' },
          { createdAt: 'asc' },
        ],
        skip: offset,
        take: limit,
      }),
      this.prisma.projectTask.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async getOne(clientId: string, projectId: string, taskId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, clientId, projectId },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectTaskDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.projects.assertClientUser(clientId, dto.ownerUserId);
    await this.projects.assertBudgetLineInClient(clientId, dto.budgetLineId);

    let progress = dto.progress ?? 0;
    const status = dto.status ?? 'TODO';
    if (status === 'DONE') progress = 100;

    await this.validateParentTask(clientId, projectId, dto.parentTaskId ?? null);
    await this.validateDependsOnTask(
      clientId,
      projectId,
      null,
      dto.dependsOnTaskId ?? null,
    );
    await this.assertTaskBucketInProject(clientId, projectId, dto.bucketId ?? null);

    if (dto.dependsOnTaskId) {
      const cycle = await wouldTaskDependencyCreateCycle(
        this.prisma,
        clientId,
        projectId,
        'new',
        dto.dependsOnTaskId,
      );
      if (cycle) {
        throw new BadRequestException('Dependency would create a cycle');
      }
    }
    if (dto.parentTaskId) {
      const pCycle = await wouldTaskParentCreateCycle(
        this.prisma,
        clientId,
        projectId,
        'new',
        dto.parentTaskId,
      );
      if (pCycle) {
        throw new BadRequestException('Parent would create a hierarchy cycle');
      }
    }

    this.assertTaskDatesAndProgress(
      status,
      progress,
      dto.plannedStartDate,
      dto.plannedEndDate,
      dto.actualStartDate,
      dto.actualEndDate,
    );

    const created = await this.prisma.projectTask.create({
      data: {
        clientId,
        projectId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        code: dto.code?.trim() ?? null,
        status,
        priority: dto.priority ?? 'MEDIUM',
        progress,
        plannedStartDate: dto.plannedStartDate
          ? new Date(dto.plannedStartDate)
          : null,
        plannedEndDate: dto.plannedEndDate
          ? new Date(dto.plannedEndDate)
          : null,
        actualStartDate: dto.actualStartDate
          ? new Date(dto.actualStartDate)
          : null,
        actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : null,
        parentTaskId: dto.parentTaskId ?? null,
        dependsOnTaskId: dto.dependsOnTaskId ?? null,
        dependencyType: dto.dependencyType ?? null,
        ownerUserId: dto.ownerUserId ?? null,
        budgetLineId: dto.budgetLineId ?? null,
        bucketId: dto.bucketId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdByUserId: actorUserId ?? null,
        updatedByUserId: actorUserId ?? null,
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
    actorUserId?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectTask.findFirst({
      where: { id: taskId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }
    if (dto.ownerUserId !== undefined) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }
    if (dto.budgetLineId !== undefined) {
      await this.projects.assertBudgetLineInClient(clientId, dto.budgetLineId);
    }
    if (dto.bucketId !== undefined) {
      await this.assertTaskBucketInProject(clientId, projectId, dto.bucketId);
    }

    const nextParent = dto.parentTaskId !== undefined ? dto.parentTaskId : existing.parentTaskId;
    const nextDepends =
      dto.dependsOnTaskId !== undefined ? dto.dependsOnTaskId : existing.dependsOnTaskId;

    await this.validateParentTask(clientId, projectId, nextParent, taskId);
    await this.validateDependsOnTask(clientId, projectId, taskId, nextDepends);

    if (
      await wouldTaskDependencyCreateCycle(
        this.prisma,
        clientId,
        projectId,
        taskId,
        nextDepends,
      )
    ) {
      throw new BadRequestException('Dependency would create a cycle');
    }
    if (
      await wouldTaskParentCreateCycle(
        this.prisma,
        clientId,
        projectId,
        taskId,
        nextParent,
      )
    ) {
      throw new BadRequestException('Parent would create a hierarchy cycle');
    }

    const status = dto.status ?? existing.status;
    let progress =
      dto.progress !== undefined ? dto.progress : existing.progress;
    if (status === 'DONE') progress = 100;

    this.assertTaskDatesAndProgress(
      status,
      progress,
      dto.plannedStartDate !== undefined
        ? dto.plannedStartDate
        : existing.plannedStartDate?.toISOString() ?? null,
      dto.plannedEndDate !== undefined
        ? dto.plannedEndDate
        : existing.plannedEndDate?.toISOString() ?? null,
      dto.actualStartDate !== undefined
        ? dto.actualStartDate
        : existing.actualStartDate?.toISOString() ?? null,
      dto.actualEndDate !== undefined
        ? dto.actualEndDate
        : existing.actualEndDate?.toISOString() ?? null,
    );

    const updated = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() ?? null,
        }),
        ...(dto.code !== undefined && { code: dto.code?.trim() ?? null }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        progress,
        ...(dto.plannedStartDate !== undefined && {
          plannedStartDate: dto.plannedStartDate
            ? new Date(dto.plannedStartDate)
            : null,
        }),
        ...(dto.plannedEndDate !== undefined && {
          plannedEndDate: dto.plannedEndDate
            ? new Date(dto.plannedEndDate)
            : null,
        }),
        ...(dto.actualStartDate !== undefined && {
          actualStartDate: dto.actualStartDate
            ? new Date(dto.actualStartDate)
            : null,
        }),
        ...(dto.actualEndDate !== undefined && {
          actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : null,
        }),
        ...(dto.parentTaskId !== undefined && { parentTaskId: dto.parentTaskId }),
        ...(dto.dependsOnTaskId !== undefined && {
          dependsOnTaskId: dto.dependsOnTaskId,
        }),
        ...(dto.dependencyType !== undefined && {
          dependencyType: dto.dependencyType,
        }),
        ...(dto.ownerUserId !== undefined && { ownerUserId: dto.ownerUserId }),
        ...(dto.budgetLineId !== undefined && { budgetLineId: dto.budgetLineId }),
        ...(dto.bucketId !== undefined && { bucketId: dto.bucketId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        updatedByUserId: actorUserId ?? null,
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
    const ownerChanged = existing.ownerUserId !== updated.ownerUserId;
    const keysToOmit: string[] = [];
    if (statusChanged) keysToOmit.push('status');
    if (ownerChanged) keysToOmit.push('ownerUserId');
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

    if (ownerChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_ASSIGNED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        resourceId: taskId,
        oldValue: { ownerUserId: existing.ownerUserId ?? null },
        newValue: { ownerUserId: updated.ownerUserId ?? null },
        ...meta,
      });
    }

    return updated;
  }

  private assertTaskDatesAndProgress(
    status: ProjectTaskStatus,
    progress: number,
    plannedStart?: string | null,
    plannedEnd?: string | null,
    actualStart?: string | null,
    actualEnd?: string | null,
  ) {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('progress must be between 0 and 100');
    }
    if (status === 'DONE' && progress !== 100) {
      throw new BadRequestException('When status is DONE, progress must be 100');
    }
    const ps = plannedStart ? new Date(plannedStart) : null;
    const pe = plannedEnd ? new Date(plannedEnd) : null;
    if (ps && pe && pe < ps) {
      throw new BadRequestException('plannedEndDate must be >= plannedStartDate');
    }
    const as = actualStart ? new Date(actualStart) : null;
    const ae = actualEnd ? new Date(actualEnd) : null;
    if (as && ae && ae < as) {
      throw new BadRequestException('actualEndDate must be >= actualStartDate');
    }
  }

  private async assertTaskBucketInProject(
    clientId: string,
    projectId: string,
    bucketId: string | null,
  ) {
    if (!bucketId) return;
    const b = await this.prisma.projectTaskBucket.findFirst({
      where: { id: bucketId, clientId, projectId },
    });
    if (!b) {
      throw new BadRequestException('Bucket not found for this project');
    }
  }

  private async validateParentTask(
    clientId: string,
    projectId: string,
    parentTaskId: string | null,
    excludeTaskId?: string,
  ) {
    if (!parentTaskId) return;
    if (excludeTaskId && parentTaskId === excludeTaskId) {
      throw new BadRequestException('A task cannot be its own parent');
    }
    const p = await this.prisma.projectTask.findFirst({
      where: { id: parentTaskId, clientId, projectId },
    });
    if (!p) {
      throw new BadRequestException('Parent task not found in this project');
    }
  }

  private async validateDependsOnTask(
    clientId: string,
    projectId: string,
    taskId: string | null,
    dependsOnTaskId: string | null,
  ) {
    if (!dependsOnTaskId) return;
    if (taskId && dependsOnTaskId === taskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }
    const d = await this.prisma.projectTask.findFirst({
      where: { id: dependsOnTaskId, clientId, projectId },
    });
    if (!d) {
      throw new BadRequestException('Predecessor task not found in this project');
    }
  }
}
