import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectScenarioStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { normalizeListPagination } from '../projects/lib/paginated-list.util';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../projects/project-audit.constants';
import { CreateProjectScenarioTaskDto } from './dto/create-project-scenario-task.dto';
import { ListProjectScenarioTasksQueryDto } from './dto/list-project-scenario-tasks.query.dto';
import { type ProjectScenarioBootstrapResultDto } from './dto/project-scenario-bootstrap-result.dto';
import {
  PROJECT_SCENARIO_TASK_TYPES,
  type ProjectScenarioTaskDto,
  type ProjectScenarioTaskType,
} from './dto/project-scenario-task.dto';
import { type ProjectScenarioTimelineSummaryDto } from './dto/project-scenario-timeline-summary.dto';
import { UpdateProjectScenarioTaskDto } from './dto/update-project-scenario-task.dto';

type ScenarioTaskRecord = Prisma.ProjectScenarioTaskGetPayload<{}>;
export type { ProjectScenarioTimelineSummaryDto };

@Injectable()
export class ProjectScenarioTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    scenarioId: string,
    query: ListProjectScenarioTasksQueryDto,
  ): Promise<{ items: ProjectScenarioTaskDto[]; total: number; limit: number; offset: number }> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);
    const where: Prisma.ProjectScenarioTaskWhereInput = { clientId, scenarioId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.projectScenarioTask.findMany({
        where,
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.projectScenarioTask.count({ where }),
    ]);

    return {
      items: items.map((row) => this.serializeTask(row)),
      total,
      limit,
      offset,
    };
  }

  async create(
    clientId: string,
    projectId: string,
    scenarioId: string,
    dto: CreateProjectScenarioTaskDto,
    context?: AuditContext,
  ): Promise<ProjectScenarioTaskDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);

    this.assertDateRange(dto.startDate ?? null, dto.endDate ?? null);
    const dependencyIds = await this.validateDependencyIds(
      clientId,
      scenarioId,
      null,
      dto.dependencyIds,
    );

    const created = await this.prisma.projectScenarioTask.create({
      data: {
        clientId,
        scenarioId: scenario.id,
        sourceProjectTaskId: null,
        title: dto.title.trim(),
        taskType: this.normalizeTaskType(dto.taskType),
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        durationDays: dto.durationDays ?? null,
        dependencyIds,
        orderIndex: dto.orderIndex ?? 0,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_TASK_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_TASK,
      resourceId: created.id,
      newValue: this.auditPayload(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.serializeTask(created);
  }

  async update(
    clientId: string,
    projectId: string,
    scenarioId: string,
    taskId: string,
    dto: UpdateProjectScenarioTaskDto,
    context?: AuditContext,
  ): Promise<ProjectScenarioTaskDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);
    const existing = await this.getTaskForScope(clientId, scenarioId, taskId);

    const nextStartDate =
      dto.startDate === undefined ? existing.startDate : (dto.startDate ?? null);
    const nextEndDate = dto.endDate === undefined ? existing.endDate : (dto.endDate ?? null);
    this.assertDateRange(nextStartDate, nextEndDate);

    const dependencyIds =
      dto.dependencyIds === undefined
        ? this.normalizeDependencyIds(existing.dependencyIds)
        : await this.validateDependencyIds(clientId, scenarioId, taskId, dto.dependencyIds);

    const updated = await this.prisma.projectScenarioTask.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.taskType !== undefined
          ? { taskType: this.normalizeTaskType(dto.taskType) }
          : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ?? null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ?? null } : {}),
        ...(dto.durationDays !== undefined ? { durationDays: dto.durationDays ?? null } : {}),
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.dependencyIds !== undefined ? { dependencyIds } : {}),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_TASK_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_TASK,
      resourceId: updated.id,
      oldValue: this.auditPayload(existing),
      newValue: this.auditPayload(updated),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.serializeTask(updated);
  }

  async remove(
    clientId: string,
    projectId: string,
    scenarioId: string,
    taskId: string,
    context?: AuditContext,
  ): Promise<void> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);
    const existing = await this.getTaskForScope(clientId, scenarioId, taskId);

    await this.prisma.projectScenarioTask.delete({ where: { id: existing.id } });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_TASK_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_TASK,
      resourceId: existing.id,
      oldValue: this.auditPayload(existing),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async bootstrapFromProjectPlan(
    clientId: string,
    projectId: string,
    scenarioId: string,
    context?: AuditContext,
  ): Promise<ProjectScenarioBootstrapResultDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    this.assertScenarioWritable(scenario.status);

    const existingCount = await this.prisma.projectScenarioTask.count({
      where: { clientId, scenarioId },
    });
    if (existingCount > 0) {
      throw new ConflictException(
        'Scenario already contains tasks; bootstrap is allowed only on an empty scenario',
      );
    }

    const projectTasks = await this.prisma.projectTask.findMany({
      where: { clientId, projectId },
      orderBy: [
        { phase: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { plannedStartDate: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        plannedStartDate: true,
        plannedEndDate: true,
        dependsOnTaskId: true,
      },
    });

    const projectTaskIds = projectTasks.map((task) => task.id);
    const milestoneRows =
      projectTaskIds.length > 0
        ? await this.prisma.projectMilestone.findMany({
            where: { clientId, linkedTaskId: { in: projectTaskIds } },
            select: { linkedTaskId: true },
          })
        : [];
    const milestoneTaskIds = new Set(
      milestoneRows
        .map((row) => row.linkedTaskId)
        .filter((taskId): taskId is string => typeof taskId === 'string'),
    );

    const sourceToScenarioTaskId = new Map<string, string>();
    let createdCount = 0;
    let skippedDependencyCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < projectTasks.length; index += 1) {
        const task = projectTasks[index];
        const created = await tx.projectScenarioTask.create({
          data: {
            clientId,
            scenarioId,
            sourceProjectTaskId: task.id,
            title: task.name,
            taskType: milestoneTaskIds.has(task.id) ? 'MILESTONE' : 'TASK',
            startDate: task.plannedStartDate,
            endDate: task.plannedEndDate,
            durationDays: null,
            dependencyIds: [],
            orderIndex: index,
          },
          select: { id: true },
        });
        sourceToScenarioTaskId.set(task.id, created.id);
        createdCount += 1;
      }

      for (const task of projectTasks) {
        if (!task.dependsOnTaskId) continue;
        const scenarioTaskId = sourceToScenarioTaskId.get(task.id);
        const dependencyScenarioTaskId = sourceToScenarioTaskId.get(task.dependsOnTaskId);
        if (!scenarioTaskId) continue;
        if (!dependencyScenarioTaskId) {
          skippedDependencyCount += 1;
          continue;
        }

        await tx.projectScenarioTask.update({
          where: { id: scenarioTaskId },
          data: { dependencyIds: [dependencyScenarioTaskId] },
        });
      }
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_TASK_BOOTSTRAPPED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO_TASK,
      resourceId: scenarioId,
      newValue: { scenarioId, createdCount, skippedDependencyCount },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return { scenarioId, createdCount, skippedDependencyCount };
  }

  async getTimelineSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioTimelineSummaryDto> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    return this.buildTimelineSummary(clientId, projectId, scenarioId);
  }

  async buildTimelineSummary(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenarioTimelineSummaryDto> {
    await this.getScenarioForScope(clientId, projectId, scenarioId);
    const tasks = await this.prisma.projectScenarioTask.findMany({
      where: { clientId, scenarioId },
      select: { startDate: true, endDate: true, taskType: true },
    });

    let minStartDate: Date | null = null;
    let maxEndDate: Date | null = null;
    let milestoneCount = 0;
    for (const task of tasks) {
      if (task.taskType === 'MILESTONE') milestoneCount += 1;
      if (task.startDate && (!minStartDate || task.startDate < minStartDate)) {
        minStartDate = task.startDate;
      }
      if (task.endDate && (!maxEndDate || task.endDate > maxEndDate)) {
        maxEndDate = task.endDate;
      }
    }

    let criticalPathDuration: number | null = null;
    if (minStartDate && maxEndDate) {
      const start = Date.UTC(
        minStartDate.getUTCFullYear(),
        minStartDate.getUTCMonth(),
        minStartDate.getUTCDate(),
      );
      const end = Date.UTC(
        maxEndDate.getUTCFullYear(),
        maxEndDate.getUTCMonth(),
        maxEndDate.getUTCDate(),
      );
      criticalPathDuration = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
    }

    return {
      plannedStartDate: minStartDate?.toISOString() ?? null,
      plannedEndDate: maxEndDate?.toISOString() ?? null,
      milestoneCount,
      criticalPathDuration,
    };
  }

  private async getScenarioForScope(clientId: string, projectId: string, scenarioId: string) {
    const scenario = await this.prisma.projectScenario.findFirst({
      where: { id: scenarioId, clientId, projectId },
      select: { id: true, status: true },
    });
    if (!scenario) {
      throw new NotFoundException('Project scenario not found');
    }
    return scenario;
  }

  private async getTaskForScope(
    clientId: string,
    scenarioId: string,
    taskId: string,
  ): Promise<ScenarioTaskRecord> {
    const row = await this.prisma.projectScenarioTask.findFirst({
      where: { id: taskId, clientId, scenarioId },
    });
    if (!row) {
      throw new NotFoundException('Project scenario task not found');
    }
    return row;
  }

  private assertScenarioWritable(status: ProjectScenarioStatus) {
    if (status === ProjectScenarioStatus.ARCHIVED) {
      throw new ConflictException('An archived scenario cannot be edited');
    }
  }

  private assertDateRange(startDate: Date | null, endDate: Date | null): void {
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException('startDate must be less than or equal to endDate');
    }
  }

  private normalizeTaskType(
    value: ProjectScenarioTaskType | null | undefined,
  ): ProjectScenarioTaskType | null {
    if (value == null) return null;
    return value;
  }

  private normalizeDependencyIds(value: Prisma.JsonValue | null): string[] {
    if (value == null) return [];
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  private async validateDependencyIds(
    clientId: string,
    scenarioId: string,
    taskId: string | null,
    rawDependencyIds: string[] | null | undefined,
  ): Promise<string[]> {
    if (rawDependencyIds === null || rawDependencyIds === undefined) {
      return [];
    }
    if (!Array.isArray(rawDependencyIds)) {
      throw new BadRequestException('dependencyIds must be an array of strings');
    }

    const dependencyIds = rawDependencyIds.map((id) => id.trim()).filter((id) => id.length > 0);
    const uniqueCount = new Set(dependencyIds).size;
    if (uniqueCount !== dependencyIds.length) {
      throw new BadRequestException('dependencyIds must not contain duplicates');
    }
    if (taskId && dependencyIds.includes(taskId)) {
      throw new BadRequestException('A task cannot depend on itself');
    }
    if (dependencyIds.length === 0) return [];

    const tasksInClient = await this.prisma.projectScenarioTask.findMany({
      where: { id: { in: dependencyIds }, clientId },
      select: { id: true, scenarioId: true },
    });
    const foundIds = new Set(tasksInClient.map((row) => row.id));
    if (foundIds.size !== dependencyIds.length) {
      throw new BadRequestException('dependencyIds contains a task that does not exist');
    }
    if (tasksInClient.some((row) => row.scenarioId !== scenarioId)) {
      throw new BadRequestException('dependencyIds must target tasks in the same scenario');
    }
    return dependencyIds;
  }

  private serializeTask(task: ScenarioTaskRecord): ProjectScenarioTaskDto {
    const taskType = this.normalizePersistedTaskType(task.taskType);
    return {
      id: task.id,
      clientId: task.clientId,
      scenarioId: task.scenarioId,
      sourceProjectTaskId: task.sourceProjectTaskId ?? null,
      title: task.title,
      taskType,
      startDate: task.startDate?.toISOString() ?? null,
      endDate: task.endDate?.toISOString() ?? null,
      durationDays: task.durationDays ?? null,
      dependencyIds: this.normalizeDependencyIds(task.dependencyIds),
      orderIndex: task.orderIndex,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private normalizePersistedTaskType(value: string | null): ProjectScenarioTaskType | null {
    if (!value) return null;
    return PROJECT_SCENARIO_TASK_TYPES.includes(value as ProjectScenarioTaskType)
      ? (value as ProjectScenarioTaskType)
      : null;
  }

  private auditPayload(task: ScenarioTaskRecord) {
    return {
      scenarioId: task.scenarioId,
      sourceProjectTaskId: task.sourceProjectTaskId ?? null,
      title: task.title,
      taskType: this.normalizePersistedTaskType(task.taskType),
      startDate: task.startDate?.toISOString() ?? null,
      endDate: task.endDate?.toISOString() ?? null,
      durationDays: task.durationDays ?? null,
      dependencyIds: this.normalizeDependencyIds(task.dependencyIds),
      orderIndex: task.orderIndex,
    };
  }
}
