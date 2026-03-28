import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectTask,
  ProjectTaskChecklistItem,
  ProjectTaskStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { ActionPlansService } from './action-plans.service';
import { CreateActionPlanTaskDto } from './dto/create-action-plan-task.dto';
import { CreateProjectTaskDto } from './dto/create-project-task.dto';
import type { ProjectTaskChecklistItemInputDto } from './dto/project-task-checklist-item.dto';
import { ListActionPlanTasksQueryDto } from './dto/list-action-plan-tasks.query.dto';
import { ListProjectTasksQueryDto } from './dto/list-project-tasks.query.dto';
import { UpdateActionPlanTaskDto } from './dto/update-action-plan-task.dto';
import { UpdateProjectTaskDto } from './dto/update-project-task.dto';
import { normalizeListPagination } from './lib/paginated-list.util';
import { wouldTaskDependencyCreateCycle } from './lib/project-task-graph.util';
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

@Injectable()
export class ProjectTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly projects: ProjectsService,
    private readonly actionPlans: ActionPlansService,
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
    if (query.phaseId !== undefined && query.phaseId !== '') {
      where.phaseId = query.phaseId;
    }
    if (query.ownerUserId) where.ownerUserId = query.ownerUserId;
    if (query.search?.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.projectTask.findMany({
        where,
        orderBy: [
          { phase: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { plannedStartDate: 'asc' },
          { createdAt: 'asc' },
        ],
        skip: offset,
        take: limit,
        include: {
          checklistItems: { orderBy: { sortOrder: 'asc' } },
          labelAssignments: { select: { labelId: true } },
        },
      }),
      this.prisma.projectTask.count({ where }),
    ]);

    const items = rows.map((t) => this.mapTaskWithChecklist(t));
    return { items, total, limit, offset };
  }

  async listForActionPlan(
    clientId: string,
    actionPlanId: string,
    query: ListActionPlanTasksQueryDto,
  ) {
    await this.actionPlans.getForScope(clientId, actionPlanId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);

    const where: Prisma.ProjectTaskWhereInput = {
      clientId,
      actionPlanId,
    };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.projectId) where.projectId = query.projectId;
    if (query.riskId) where.riskId = query.riskId;
    if (query.ownerUserId) where.ownerUserId = query.ownerUserId;
    if (query.search?.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.projectTask.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { plannedStartDate: 'asc' }, { createdAt: 'asc' }],
        skip: offset,
        take: limit,
        include: {
          checklistItems: { orderBy: { sortOrder: 'asc' } },
          labelAssignments: { select: { labelId: true } },
          project: { select: { id: true, code: true, name: true } },
          risk: { select: { id: true, code: true, title: true } },
        },
      }),
      this.prisma.projectTask.count({ where }),
    ]);

    const items = rows.map((t) => this.mapTaskWithChecklistAndLinks(t));
    return { items, total, limit, offset };
  }

  async getOne(clientId: string, projectId: string, taskId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, clientId, projectId },
      include: {
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        labelAssignments: { select: { labelId: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return this.mapTaskWithChecklist(task);
  }

  async getOneForActionPlan(
    clientId: string,
    actionPlanId: string,
    taskId: string,
  ) {
    await this.actionPlans.getForScope(clientId, actionPlanId);
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, clientId, actionPlanId },
      include: {
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        labelAssignments: { select: { labelId: true } },
        project: { select: { id: true, code: true, name: true } },
        risk: { select: { id: true, code: true, title: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return this.mapTaskWithChecklistAndLinks(task);
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectTaskDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    if (dto.actionPlanId) {
      await this.assertActionPlanInClient(clientId, dto.actionPlanId);
    }
    await this.validateRiskProjectCoherence(clientId, projectId, dto.riskId ?? null);

    await this.projects.assertClientUser(clientId, dto.ownerUserId);
    await this.projects.assertBudgetLineInClient(clientId, dto.budgetLineId);

    let progress = dto.progress ?? 0;
    const status = dto.status ?? 'TODO';
    if (status === 'DONE') progress = 100;

    await this.validatePhase(clientId, projectId, dto.phaseId ?? null);
    await this.validateDependsOnTask(
      clientId,
      projectId,
      null,
      dto.dependsOnTaskId ?? null,
    );
    await this.assertTaskBucketInProject(clientId, projectId, dto.bucketId ?? null);

    const incomingTaskLabelIds =
      dto.taskLabelIds !== undefined ? Array.from(new Set(dto.taskLabelIds)) : undefined;
    if (incomingTaskLabelIds) {
      const labels = await this.prisma.projectTaskLabel.findMany({
        where: { clientId, projectId, id: { in: incomingTaskLabelIds } },
        select: { id: true },
      });
      if (labels.length !== incomingTaskLabelIds.length) {
        throw new BadRequestException('taskLabelIds: une ou plusieurs étiquettes sont inconnues');
      }
    }

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
        actionPlanId: dto.actionPlanId ?? null,
        riskId: dto.riskId ?? null,
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
        phaseId: dto.phaseId ?? null,
        dependsOnTaskId: dto.dependsOnTaskId ?? null,
        dependencyType: dto.dependencyType ?? null,
        ownerUserId: dto.ownerUserId ?? null,
        budgetLineId: dto.budgetLineId ?? null,
        bucketId: dto.bucketId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdByUserId: actorUserId ?? null,
        updatedByUserId: actorUserId ?? null,
        ...(dto.checklistItems?.length
          ? {
              checklistItems: {
                create: dto.checklistItems.map((item, idx) => ({
                  clientId,
                  projectId,
                  title: item.title.trim(),
                  isChecked: item.isChecked ?? false,
                  sortOrder: item.sortOrder ?? idx,
                  plannerChecklistItemKey: randomUUID(),
                })),
              },
            }
          : {}),
        ...(incomingTaskLabelIds && incomingTaskLabelIds.length > 0
          ? {
              labelAssignments: {
                create: incomingTaskLabelIds.map((labelId) => ({
                  clientId,
                  projectId,
                  labelId,
                })),
              },
            }
          : {}),
      },
      include: {
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        labelAssignments: { select: { labelId: true } },
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

    await this.actionPlans.touchProgressForPlans(clientId, [created.actionPlanId]);

    return this.mapTaskWithChecklist(created);
  }

  async createForActionPlan(
    clientId: string,
    actionPlanId: string,
    dto: CreateActionPlanTaskDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.actionPlans.getForScope(clientId, actionPlanId);

    const resolvedProjectId =
      dto.projectId === undefined || dto.projectId === '' ? null : dto.projectId;

    if (resolvedProjectId) {
      await this.projects.getProjectForScope(clientId, resolvedProjectId);
    }

    await this.validateRiskProjectCoherence(clientId, resolvedProjectId, dto.riskId ?? null);

    if (!resolvedProjectId) {
      this.assertNoProjectOnlyPayload({
        phaseId: null,
        bucketId: null,
        dependsOnTaskId: null,
        dependencyType: null,
        taskLabelIds: [],
        checklistItems: [],
        budgetLineId: null,
      });
    }

    await this.projects.assertClientUser(clientId, dto.ownerUserId);

    let progress = dto.progress ?? 0;
    const status = dto.status ?? 'TODO';
    if (status === 'DONE') progress = 100;

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
        projectId: resolvedProjectId,
        actionPlanId,
        riskId: dto.riskId ?? null,
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
        sortOrder: dto.sortOrder ?? 0,
        createdByUserId: actorUserId ?? null,
        updatedByUserId: actorUserId ?? null,
      },
      include: {
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        labelAssignments: { select: { labelId: true } },
        project: { select: { id: true, code: true, name: true } },
        risk: { select: { id: true, code: true, title: true } },
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

    await this.actionPlans.touchProgressForPlans(clientId, [actionPlanId]);

    return this.mapTaskWithChecklistAndLinks(created);
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

    if (dto.actionPlanId !== undefined && dto.actionPlanId) {
      await this.assertActionPlanInClient(clientId, dto.actionPlanId);
    }

    const nextRiskId = dto.riskId !== undefined ? dto.riskId : existing.riskId;
    await this.validateRiskProjectCoherence(clientId, projectId, nextRiskId);

    if (dto.ownerUserId !== undefined) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }
    if (dto.budgetLineId !== undefined) {
      await this.projects.assertBudgetLineInClient(clientId, dto.budgetLineId);
    }
    if (dto.bucketId !== undefined) {
      await this.assertTaskBucketInProject(clientId, projectId, dto.bucketId);
    }

    const previousPhaseId = existing.phaseId;
    const nextPhase = dto.phaseId !== undefined ? dto.phaseId : existing.phaseId;
    const nextDepends =
      dto.dependsOnTaskId !== undefined ? dto.dependsOnTaskId : existing.dependsOnTaskId;

    await this.validatePhase(clientId, projectId, nextPhase);
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

    const prevPlanId = existing.actionPlanId;

    await this.prisma.projectTask.update({
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
        ...(dto.phaseId !== undefined && { phaseId: dto.phaseId }),
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
        ...(dto.actionPlanId !== undefined && { actionPlanId: dto.actionPlanId }),
        ...(dto.riskId !== undefined && { riskId: dto.riskId }),
        updatedByUserId: actorUserId ?? null,
      },
    });

    if (dto.checklistItems !== undefined) {
      await this.replaceTaskChecklist(
        clientId,
        projectId,
        taskId,
        dto.checklistItems,
      );
    }
    if (dto.taskLabelIds !== undefined) {
      await this.replaceTaskLabels(clientId, projectId, taskId, dto.taskLabelIds);
    }

    const final = await this.prisma.projectTask.findFirstOrThrow({
      where: { id: taskId, clientId, projectId },
      include: {
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        labelAssignments: { select: { labelId: true } },
      },
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    const oldSnap = projectTaskEntityAuditSnapshot(existing);
    const newSnap = projectTaskEntityAuditSnapshot(final);
    let { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);
    const statusChanged = existing.status !== final.status;
    const ownerChanged = existing.ownerUserId !== final.ownerUserId;
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
        newValue: { status: final.status },
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
        newValue: { ownerUserId: final.ownerUserId ?? null },
        ...meta,
      });
    }
    if (previousPhaseId !== final.phaseId) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_TASK_PHASE_CHANGED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
        resourceId: taskId,
        oldValue: { phaseId: previousPhaseId ?? null },
        newValue: { phaseId: final.phaseId ?? null },
        ...meta,
      });
    }

    if (dto.sortOrder !== undefined || previousPhaseId !== final.phaseId) {
      await this.recomputeSortOrders(clientId, projectId, previousPhaseId, final.phaseId);
    }

    await this.actionPlans.touchProgressForPlans(clientId, [
      prevPlanId,
      final.actionPlanId,
    ]);

    return this.mapTaskWithChecklist(final);
  }

  async updateForActionPlan(
    clientId: string,
    actionPlanId: string,
    taskId: string,
    dto: UpdateActionPlanTaskDto,
    context?: AuditContext,
    actorUserId?: string,
  ) {
    await this.actionPlans.getForScope(clientId, actionPlanId);
    const existing = await this.prisma.projectTask.findFirst({
      where: { id: taskId, clientId, actionPlanId },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    const nextProjectId =
      dto.projectId !== undefined ? dto.projectId : existing.projectId;

    if (nextProjectId) {
      await this.projects.getProjectForScope(clientId, nextProjectId);
    }

    let nextRiskId = dto.riskId !== undefined ? dto.riskId : existing.riskId;
    if (nextProjectId === null && nextRiskId) {
      const r = await this.prisma.projectRisk.findFirst({
        where: { id: nextRiskId, clientId },
        select: { projectId: true },
      });
      if (r?.projectId != null) {
        nextRiskId = null;
      }
    }
    await this.validateRiskProjectCoherence(clientId, nextProjectId, nextRiskId);

    if (dto.projectId !== undefined && dto.projectId === null && existing.projectId) {
      await this.detachTaskFromProject(clientId, taskId, existing.projectId);
    }

    const existingAfterDetach =
      dto.projectId !== undefined && dto.projectId === null && existing.projectId
        ? await this.prisma.projectTask.findFirstOrThrow({ where: { id: taskId } })
        : existing;

    if (!nextProjectId && !existingAfterDetach.projectId) {
      await this.assertOrphanTaskHasNoProjectArtifacts(taskId, existingAfterDetach);
    }

    if (dto.ownerUserId !== undefined) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }

    const status = dto.status ?? existing.status;
    let progress = dto.progress !== undefined ? dto.progress : existing.progress;
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

    await this.prisma.projectTask.update({
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
        ...(dto.ownerUserId !== undefined && { ownerUserId: dto.ownerUserId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
        ...(nextRiskId !== existing.riskId ? { riskId: nextRiskId } : {}),
        updatedByUserId: actorUserId ?? null,
      },
    });

    const final = await this.prisma.projectTask.findFirstOrThrow({
      where: { id: taskId, clientId, actionPlanId },
      include: {
        checklistItems: { orderBy: { sortOrder: 'asc' } },
        labelAssignments: { select: { labelId: true } },
        project: { select: { id: true, code: true, name: true } },
        risk: { select: { id: true, code: true, title: true } },
      },
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    const oldSnap = projectTaskEntityAuditSnapshot(existing);
    const newSnap = projectTaskEntityAuditSnapshot(final);
    let { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);
    const statusChanged = existing.status !== final.status;
    const ownerChanged = existing.ownerUserId !== final.ownerUserId;
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
        newValue: { status: final.status },
        ...meta,
      });
    }

    await this.actionPlans.touchProgressForPlans(clientId, [actionPlanId]);

    return this.mapTaskWithChecklistAndLinks(final);
  }

  async deleteForActionPlan(
    clientId: string,
    actionPlanId: string,
    taskId: string,
    context?: AuditContext,
  ) {
    await this.actionPlans.getForScope(clientId, actionPlanId);
    const existing = await this.prisma.projectTask.findFirst({
      where: { id: taskId, clientId, actionPlanId },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.projectTask.delete({ where: { id: taskId } });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_TASK_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_TASK,
      resourceId: taskId,
      oldValue: projectTaskEntityAuditSnapshot(existing),
      newValue: {},
      ...meta,
    });

    await this.actionPlans.touchProgressForPlans(clientId, [actionPlanId]);
  }

  private async assertOrphanTaskHasNoProjectArtifacts(
    taskId: string,
    existing: ProjectTask,
  ): Promise<void> {
    this.assertNoProjectOnlyPayload({
      phaseId: existing.phaseId,
      bucketId: existing.bucketId,
      dependsOnTaskId: existing.dependsOnTaskId,
      dependencyType: existing.dependencyType,
      taskLabelIds: [],
      checklistItems: [],
      budgetLineId: existing.budgetLineId,
    });
    const [nCheck, nLab] = await Promise.all([
      this.prisma.projectTaskChecklistItem.count({ where: { projectTaskId: taskId } }),
      this.prisma.projectTaskLabelAssignment.count({ where: { projectTaskId: taskId } }),
    ]);
    if (nCheck > 0 || nLab > 0) {
      throw new BadRequestException(
        'Sans projet : checklist et étiquettes projet sont hors périmètre MVP',
      );
    }
  }

  private async detachTaskFromProject(
    clientId: string,
    taskId: string,
    projectId: string,
  ) {
    await this.prisma.projectTaskChecklistItem.deleteMany({
      where: { clientId, projectId, projectTaskId: taskId },
    });
    await this.prisma.projectTaskLabelAssignment.deleteMany({
      where: { clientId, projectId, projectTaskId: taskId },
    });
    await this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        projectId: null,
        phaseId: null,
        bucketId: null,
        dependsOnTaskId: null,
        dependencyType: null,
        budgetLineId: null,
      },
    });
  }

  private async assertActionPlanInClient(
    clientId: string,
    actionPlanId: string | null | undefined,
  ): Promise<void> {
    if (!actionPlanId) return;
    const p = await this.prisma.actionPlan.findFirst({
      where: { id: actionPlanId, clientId },
      select: { id: true },
    });
    if (!p) {
      throw new BadRequestException('Plan d’action introuvable pour ce client');
    }
  }

  private async validateRiskProjectCoherence(
    clientId: string,
    taskProjectId: string | null,
    riskId: string | null | undefined,
  ): Promise<void> {
    if (riskId == null || riskId === '') return;
    const risk = await this.prisma.projectRisk.findFirst({
      where: { id: riskId, clientId },
      select: { id: true, projectId: true },
    });
    if (!risk) {
      throw new BadRequestException('Risque introuvable pour ce client');
    }
    if (risk.projectId != null && risk.projectId !== taskProjectId) {
      throw new BadRequestException(
        'Ce risque est rattaché à un projet : la tâche doit avoir le même projectId',
      );
    }
  }

  private assertNoProjectOnlyPayload(payload: {
    phaseId?: string | null;
    bucketId?: string | null;
    dependsOnTaskId?: string | null;
    dependencyType?: unknown;
    taskLabelIds: string[] | unknown;
    checklistItems: unknown[] | unknown;
    budgetLineId?: string | null;
  }) {
    const msgs: string[] = [];
    if (payload.phaseId != null && payload.phaseId !== '') msgs.push('phaseId');
    if (payload.bucketId != null && payload.bucketId !== '') msgs.push('bucketId');
    if (payload.dependsOnTaskId != null && payload.dependsOnTaskId !== '') {
      msgs.push('dependsOnTaskId');
    }
    if (payload.dependencyType != null) msgs.push('dependencyType');
    if (Array.isArray(payload.taskLabelIds) && payload.taskLabelIds.length > 0) {
      msgs.push('taskLabelIds');
    }
    if (Array.isArray(payload.checklistItems) && payload.checklistItems.length > 0) {
      msgs.push('checklistItems');
    }
    if (payload.budgetLineId != null && payload.budgetLineId !== '') {
      msgs.push('budgetLineId');
    }
    if (msgs.length) {
      throw new BadRequestException(
        `Sans projet, champs non autorisés en MVP : ${msgs.join(', ')}`,
      );
    }
  }

  private mapTaskWithChecklist(
    task: ProjectTask & {
      checklistItems?: ProjectTaskChecklistItem[];
      labelAssignments?: Array<{ labelId: string }>;
    },
  ) {
    const { checklistItems, labelAssignments, ...rest } = task;
    return {
      ...rest,
      checklistItems:
        checklistItems?.map(({ id, title, isChecked, sortOrder }) => ({
          id,
          title,
          isChecked,
          sortOrder,
        })) ?? [],
      taskLabelIds: labelAssignments?.map((a) => a.labelId) ?? [],
    };
  }

  private mapTaskWithChecklistAndLinks(
    task: ProjectTask & {
      checklistItems?: ProjectTaskChecklistItem[];
      labelAssignments?: Array<{ labelId: string }>;
      project?: { id: string; code: string; name: string } | null;
      risk?: { id: string; code: string; title: string } | null;
    },
  ) {
    const { project, risk, ...rest } = task;
    const mapped = this.mapTaskWithChecklist(rest);
    return {
      ...mapped,
      project: project ?? null,
      risk: risk ?? null,
    };
  }

  private async replaceTaskChecklist(
    clientId: string,
    projectId: string,
    taskId: string,
    incoming: ProjectTaskChecklistItemInputDto[],
  ) {
    const existing = await this.prisma.projectTaskChecklistItem.findMany({
      where: { clientId, projectId, projectTaskId: taskId },
    });
    const byId = new Map(existing.map((e) => [e.id, e]));

    for (const row of incoming) {
      if (row.id && !byId.has(row.id)) {
        throw new BadRequestException('checklistItems: id inconnu pour cette tâche');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectTaskChecklistItem.deleteMany({
        where: { clientId, projectId, projectTaskId: taskId },
      });

      for (const [idx, row] of incoming.entries()) {
        const old = row.id ? byId.get(row.id) : undefined;
        await tx.projectTaskChecklistItem.create({
          data: {
            clientId,
            projectId,
            projectTaskId: taskId,
            title: row.title.trim(),
            isChecked: row.isChecked ?? false,
            sortOrder: row.sortOrder ?? idx,
            plannerChecklistItemKey: old?.plannerChecklistItemKey ?? randomUUID(),
          },
        });
      }
    });
  }

  private async replaceTaskLabels(
    clientId: string,
    projectId: string,
    taskId: string,
    incoming: string[],
  ) {
    const uniqueIncoming = Array.from(new Set(incoming));

    if (uniqueIncoming.length > 0) {
      const labels = await this.prisma.projectTaskLabel.findMany({
        where: { clientId, projectId, id: { in: uniqueIncoming } },
        select: { id: true },
      });
      if (labels.length !== uniqueIncoming.length) {
        throw new BadRequestException('taskLabelIds: une ou plusieurs étiquettes sont inconnues');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectTaskLabelAssignment.deleteMany({
        where: { clientId, projectId, projectTaskId: taskId },
      });

      for (const labelId of uniqueIncoming) {
        await tx.projectTaskLabelAssignment.create({
          data: {
            clientId,
            projectId,
            projectTaskId: taskId,
            labelId,
          },
        });
      }
    });
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

  private async validatePhase(
    clientId: string,
    projectId: string,
    phaseId: string | null,
  ) {
    if (!phaseId) return;
    const p = await this.prisma.projectTaskPhase.findFirst({
      where: { id: phaseId, clientId, projectId },
    });
    if (!p) {
      throw new BadRequestException('Phase not found in this project');
    }
  }

  private async recomputeSortOrders(
    clientId: string,
    projectId: string,
    fromPhaseId: string | null,
    toPhaseId: string | null,
  ) {
    const phaseIds = Array.from(new Set([fromPhaseId, toPhaseId])).filter(
      (v): v is string => v !== null,
    );
    await this.prisma.$transaction(async (tx) => {
      const regroup = async (phaseId: string | null) => {
        const rows = await tx.projectTask.findMany({
          where: { clientId, projectId, phaseId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        for (const [idx, row] of rows.entries()) {
          await tx.projectTask.update({
            where: { id: row.id },
            data: { sortOrder: idx },
          });
        }
      };
      for (const phaseId of phaseIds) await regroup(phaseId);
      if (fromPhaseId === null || toPhaseId === null) await regroup(null);
    });
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
