import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  Prisma,
  ProjectScenario,
  ProjectScenarioStatus,
  ProjectStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../projects/project-audit.constants';
import { normalizeListPagination } from '../projects/lib/paginated-list.util';
import { CreateProjectScenarioDto } from './dto/create-project-scenario.dto';
import { ListProjectScenariosQueryDto } from './dto/list-project-scenarios.query.dto';
import { SelectProjectScenarioDto } from './dto/select-project-scenario.dto';
import {
  resolveScenarioSyncOptions,
  type ResolvedScenarioSyncOptions,
  type SelectScenarioSyncOptionsDto,
} from './dto/select-scenario-sync.dto';
import {
  ProjectScenarioCapacityService,
  type ProjectScenarioCapacitySummaryDto,
} from './project-scenario-capacity.service';
import {
  ProjectScenarioFinancialLinesService,
  type ProjectScenarioFinancialSummaryDto,
} from './project-scenario-financial-lines.service';
import {
  ProjectScenarioResourcePlansService,
  type ProjectScenarioResourceSummaryDto,
} from './project-scenario-resource-plans.service';
import {
  ProjectScenarioTasksService,
  type ProjectScenarioTimelineSummaryDto,
} from './project-scenario-tasks.service';
import {
  ProjectScenarioRisksService,
} from './project-scenario-risks.service';
import { type ProjectScenarioRiskSummaryDto } from './dto/project-scenario-risk-summary.dto';
import { UpdateProjectScenarioDto } from './dto/update-project-scenario.dto';
import { ProjectBudgetLinksService } from '../project-budget/project-budget-links.service';

type ScenarioSummaryDto = {
  id: string;
  projectId: string;
  clientId: string;
  name: string;
  code: string | null;
  description: string | null;
  assumptionSummary: string | null;
  status: ProjectScenarioStatus;
  version: number;
  isBaseline: boolean;
  selectedAt: string | null;
  selectedByUserId: string | null;
  archivedAt: string | null;
  archivedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  budgetSummary: ProjectScenarioFinancialSummaryDto | null;
  resourceSummary: ProjectScenarioResourceSummaryDto | null;
  timelineSummary: ProjectScenarioTimelineSummaryDto | null;
  capacitySummary: ProjectScenarioCapacitySummaryDto | null;
  riskSummary: ProjectScenarioRiskSummaryDto | null;
};

export type SelectAndTransitionScenarioResponseDto = {
  scenarioId: string;
  projectId: string;
  selectedStatus: ProjectScenarioStatus;
  projectStatus: ProjectStatus;
};

@Injectable()
export class ProjectScenariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly scenarioFinancialLines: ProjectScenarioFinancialLinesService,
    private readonly scenarioCapacity: ProjectScenarioCapacityService,
    private readonly scenarioResourcePlans: ProjectScenarioResourcePlansService,
    private readonly scenarioRisks: ProjectScenarioRisksService,
    private readonly scenarioTasks: ProjectScenarioTasksService,
    @Inject(forwardRef(() => ProjectBudgetLinksService))
    private readonly projectBudgetLinks: ProjectBudgetLinksService,
  ) {}

  async list(
    clientId: string,
    projectId: string,
    query: ListProjectScenariosQueryDto,
  ): Promise<{ items: ScenarioSummaryDto[]; total: number; limit: number; offset: number }> {
    await this.ensureProjectInScope(clientId, projectId);
    const { limit, offset } = normalizeListPagination(query.offset, query.limit);
    const where: Prisma.ProjectScenarioWhereInput = {
      clientId,
      projectId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              { code: { contains: query.search.trim(), mode: 'insensitive' } },
              {
                assumptionSummary: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.projectScenario.findMany({
        where,
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.projectScenario.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toSummary(this.assertConsistent(row))),
      total,
      limit,
      offset,
    };
  }

  async getOne(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ScenarioSummaryDto> {
    await this.ensureProjectInScope(clientId, projectId);
    const row = await this.prisma.projectScenario.findFirst({
      where: { id: scenarioId, clientId, projectId },
    });
    if (!row) {
      throw new NotFoundException('Project scenario not found');
    }
    const summary = this.toSummary(this.assertConsistent(row));
    const budgetSummary = await this.scenarioFinancialLines.buildBudgetSummary(
      clientId,
      projectId,
      scenarioId,
    );
    const resourceSummary = await this.scenarioResourcePlans.buildResourceSummary(
      clientId,
      projectId,
      scenarioId,
    );
    const timelineSummary = await this.scenarioTasks.buildTimelineSummary(
      clientId,
      projectId,
      scenarioId,
    );
    const capacitySummary = await this.scenarioCapacity.buildCapacitySummary(
      clientId,
      projectId,
      scenarioId,
    );
    const riskSummary = await this.scenarioRisks.buildRiskSummary(
      clientId,
      projectId,
      scenarioId,
    );
    return {
      ...summary,
      budgetSummary,
      resourceSummary,
      timelineSummary,
      capacitySummary,
      riskSummary,
    };
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectScenarioDto,
    context?: AuditContext,
  ): Promise<ScenarioSummaryDto> {
    await this.ensureProjectInScope(clientId, projectId);
    const version = await this.getNextVersion(clientId, projectId);
    const created = await this.prisma.projectScenario.create({
      data: {
        clientId,
        projectId,
        name: dto.name.trim(),
        code: this.normalizeNullableText(dto.code),
        description: this.normalizeNullableText(dto.description),
        assumptionSummary: this.normalizeNullableText(dto.assumptionSummary),
        version,
        ...this.buildStatusState(ProjectScenarioStatus.DRAFT, context?.actorUserId),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO,
      resourceId: created.id,
      newValue: this.auditPayload(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toSummary(created);
  }

  async update(
    clientId: string,
    projectId: string,
    scenarioId: string,
    dto: UpdateProjectScenarioDto,
    context?: AuditContext,
  ): Promise<ScenarioSummaryDto> {
    const existing = await this.getScenarioForScope(clientId, projectId, scenarioId);
    if (existing.status === ProjectScenarioStatus.ARCHIVED) {
      throw new ConflictException('An archived scenario cannot be edited');
    }

    const updated = await this.prisma.projectScenario.update({
      where: { id: scenarioId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: this.normalizeNullableText(dto.code) } : {}),
        ...(dto.description !== undefined
          ? { description: this.normalizeNullableText(dto.description) }
          : {}),
        ...(dto.assumptionSummary !== undefined
          ? { assumptionSummary: this.normalizeNullableText(dto.assumptionSummary) }
          : {}),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO,
      resourceId: updated.id,
      oldValue: this.auditPayload(existing),
      newValue: this.auditPayload(updated),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toSummary(updated);
  }

  async duplicate(
    clientId: string,
    projectId: string,
    scenarioId: string,
    context?: AuditContext,
  ): Promise<ScenarioSummaryDto> {
    const source = await this.getScenarioForScope(clientId, projectId, scenarioId);
    const version = await this.getNextVersion(clientId, projectId);
    const duplicated = await this.prisma.projectScenario.create({
      data: {
        clientId,
        projectId,
        name: `${source.name} (copie v${version})`,
        code: null,
        description: source.description,
        assumptionSummary: source.assumptionSummary,
        version,
        ...this.buildStatusState(ProjectScenarioStatus.DRAFT, context?.actorUserId),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_DUPLICATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO,
      resourceId: duplicated.id,
      oldValue: this.auditPayload(source),
      newValue: {
        ...this.auditPayload(duplicated),
        sourceScenarioId: source.id,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toSummary(duplicated);
  }

  async select(
    clientId: string,
    projectId: string,
    scenarioId: string,
    dto: SelectScenarioSyncOptionsDto,
    context?: AuditContext,
  ): Promise<ScenarioSummaryDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    if (scenario.status === ProjectScenarioStatus.ARCHIVED) {
      throw new ConflictException('An archived scenario cannot be selected');
    }

    const syncOptions = resolveScenarioSyncOptions(dto);

    try {
      const result = await this.prisma.$transaction(async (tx) =>
        this.runSelectionWorkflow(tx, {
          clientId,
          projectId,
          scenarioId,
          actorUserId: context?.actorUserId,
          targetProjectStatus: null,
        }),
      );

      await this.emitSelectionAudits({
        clientId,
        result: { ...result, syncOptions },
        context,
      });

      await this.applyScenarioSelectionSync(clientId, projectId, scenarioId, syncOptions, context);

      return this.toSummary(result.selected);
    } catch (error) {
      this.rethrowSelectedConstraint(error);
      throw error;
    }
  }

  async selectAndTransition(
    clientId: string,
    projectId: string,
    scenarioId: string,
    dto: SelectProjectScenarioDto,
    context?: AuditContext,
  ): Promise<SelectAndTransitionScenarioResponseDto> {
    const scenario = await this.getScenarioForScope(clientId, projectId, scenarioId);
    if (scenario.status === ProjectScenarioStatus.ARCHIVED) {
      throw new ConflictException('An archived scenario cannot be selected');
    }

    const syncOptions = resolveScenarioSyncOptions(dto);

    try {
      const targetProjectStatus =
        dto.targetProjectStatus === 'PLANNED'
          ? ProjectStatus.PLANNED
          : ProjectStatus.IN_PROGRESS;
      const result = await this.prisma.$transaction(async (tx) =>
        this.runSelectionWorkflow(tx, {
          clientId,
          projectId,
          scenarioId,
          actorUserId: context?.actorUserId,
          targetProjectStatus,
        }),
      );

      await this.emitSelectionAudits({
        clientId,
        result: {
          ...result,
          decisionNote: dto.decisionNote ?? null,
          syncOptions,
        },
        context,
      });

      await this.applyScenarioSelectionSync(clientId, projectId, scenarioId, syncOptions, context);

      return {
        scenarioId: result.selected.id,
        projectId: result.selected.projectId,
        selectedStatus: result.selected.status,
        projectStatus: result.projectStatusAfter ?? result.projectStatusBefore!,
      };
    } catch (error) {
      this.rethrowSelectedConstraint(error);
      throw error;
    }
  }

  async archive(
    clientId: string,
    projectId: string,
    scenarioId: string,
    context?: AuditContext,
  ): Promise<ScenarioSummaryDto> {
    const existing = await this.getScenarioForScope(clientId, projectId, scenarioId);
    if (existing.status === ProjectScenarioStatus.SELECTED) {
      throw new ConflictException(
        'Select another scenario before archiving the active baseline',
      );
    }
    if (existing.status === ProjectScenarioStatus.ARCHIVED) {
      return this.toSummary(existing);
    }

    const archived = await this.prisma.projectScenario.update({
      where: { id: scenarioId },
      data: {
        ...this.buildStatusState(ProjectScenarioStatus.ARCHIVED, context?.actorUserId),
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_ARCHIVED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO,
      resourceId: archived.id,
      oldValue: this.auditPayload(existing),
      newValue: this.auditPayload(archived),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toSummary(archived);
  }

  private async ensureProjectInScope(clientId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async getScenarioForScope(
    clientId: string,
    projectId: string,
    scenarioId: string,
  ): Promise<ProjectScenario> {
    await this.ensureProjectInScope(clientId, projectId);
    const row = await this.prisma.projectScenario.findFirst({
      where: { id: scenarioId, clientId, projectId },
    });
    if (!row) {
      throw new NotFoundException('Project scenario not found');
    }
    return this.assertConsistent(row);
  }

  private async getNextVersion(clientId: string, projectId: string): Promise<number> {
    const aggregate = await this.prisma.projectScenario.aggregate({
      where: { clientId, projectId },
      _max: { version: true },
    });
    return (aggregate._max.version ?? 0) + 1;
  }

  private buildStatusState(
    status: ProjectScenarioStatus,
    actorUserId?: string,
    at: Date = new Date(),
  ): Pick<
    ProjectScenario,
    'status' | 'isBaseline' | 'selectedAt' | 'selectedByUserId' | 'archivedAt' | 'archivedByUserId'
  > {
    if (status === ProjectScenarioStatus.SELECTED) {
      return {
        status,
        isBaseline: true,
        selectedAt: at,
        selectedByUserId: actorUserId ?? null,
        archivedAt: null,
        archivedByUserId: null,
      };
    }
    if (status === ProjectScenarioStatus.ARCHIVED) {
      return {
        status,
        isBaseline: false,
        selectedAt: null,
        selectedByUserId: null,
        archivedAt: at,
        archivedByUserId: actorUserId ?? null,
      };
    }
    return {
      status,
      isBaseline: false,
      selectedAt: null,
      selectedByUserId: null,
      archivedAt: null,
      archivedByUserId: null,
    };
  }

  private assertConsistent(row: ProjectScenario): ProjectScenario {
    const valid =
      (row.status === ProjectScenarioStatus.DRAFT && row.isBaseline === false) ||
      (row.status === ProjectScenarioStatus.SELECTED && row.isBaseline === true) ||
      (row.status === ProjectScenarioStatus.ARCHIVED && row.isBaseline === false);
    if (!valid) {
      throw new ConflictException(
        'Inconsistent project scenario state: status and baseline flag do not match',
      );
    }
    return row;
  }

  private normalizeNullableText(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private rethrowSelectedConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Another scenario has been selected concurrently for this project',
      );
    }
  }

  private async runSelectionWorkflow(
    tx: Prisma.TransactionClient,
    params: {
      clientId: string;
      projectId: string;
      scenarioId: string;
      actorUserId?: string;
      targetProjectStatus: ProjectStatus | null;
    },
  ): Promise<{
    selected: ProjectScenario;
    previousSelectedScenarioId: string | null;
    autoArchivedScenarioIds: string[];
    projectStatusBefore: ProjectStatus | null;
    projectStatusAfter: ProjectStatus | null;
    decisionNote?: string | null;
  }> {
    const now = new Date();
    const previousSelected = await tx.projectScenario.findFirst({
      where: {
        clientId: params.clientId,
        projectId: params.projectId,
        status: ProjectScenarioStatus.SELECTED,
        id: { not: params.scenarioId },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const archivable = await tx.projectScenario.findMany({
      where: {
        clientId: params.clientId,
        projectId: params.projectId,
        id: { not: params.scenarioId },
        status: { in: [ProjectScenarioStatus.DRAFT, ProjectScenarioStatus.SELECTED] },
      },
      select: { id: true },
    });

    await tx.projectScenario.updateMany({
      where: {
        clientId: params.clientId,
        projectId: params.projectId,
        id: { not: params.scenarioId },
        status: { in: [ProjectScenarioStatus.DRAFT, ProjectScenarioStatus.SELECTED] },
      },
      data: {
        ...this.buildStatusState(ProjectScenarioStatus.ARCHIVED, params.actorUserId, now),
      },
    });

    const selected = await tx.projectScenario.update({
      where: { id: params.scenarioId },
      data: {
        ...this.buildStatusState(ProjectScenarioStatus.SELECTED, params.actorUserId, now),
      },
    });

    if (!params.targetProjectStatus) {
      return {
        selected,
        previousSelectedScenarioId: previousSelected?.id ?? null,
        autoArchivedScenarioIds: archivable.map((item) => item.id),
        projectStatusBefore: null,
        projectStatusAfter: null,
      };
    }

    const project = await tx.project.findFirst({
      where: { id: params.projectId, clientId: params.clientId },
      select: { status: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const projectStatusBefore = project.status;
    let projectStatusAfter = project.status;
    if (project.status !== params.targetProjectStatus) {
      const updatedProject = await tx.project.update({
        where: { id: params.projectId },
        data: { status: params.targetProjectStatus },
        select: { status: true },
      });
      projectStatusAfter = updatedProject.status;
    }

    return {
      selected,
      previousSelectedScenarioId: previousSelected?.id ?? null,
      autoArchivedScenarioIds: archivable.map((item) => item.id),
      projectStatusBefore,
      projectStatusAfter,
    };
  }

  private async emitSelectionAudits(params: {
    clientId: string;
    result: {
      selected: ProjectScenario;
      previousSelectedScenarioId: string | null;
      autoArchivedScenarioIds: string[];
      projectStatusBefore: ProjectStatus | null;
      projectStatusAfter: ProjectStatus | null;
      decisionNote?: string | null;
      syncOptions?: ResolvedScenarioSyncOptions;
    };
    context?: AuditContext;
  }): Promise<void> {
    await this.auditLogs.create({
      clientId: params.clientId,
      userId: params.context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_SELECTED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO,
      resourceId: params.result.selected.id,
      newValue: {
        ...this.auditPayload(params.result.selected),
        previousSelectedScenarioId: params.result.previousSelectedScenarioId,
        decisionNote: params.result.decisionNote ?? null,
        syncOptions: params.result.syncOptions ?? null,
      },
      ipAddress: params.context?.meta?.ipAddress,
      userAgent: params.context?.meta?.userAgent,
      requestId: params.context?.meta?.requestId,
    });

    if (params.result.autoArchivedScenarioIds.length > 0) {
      await this.auditLogs.create({
        clientId: params.clientId,
        userId: params.context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_SCENARIO_AUTO_ARCHIVED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_SCENARIO,
        resourceId: params.result.selected.id,
        newValue: {
          projectId: params.result.selected.projectId,
          selectedScenarioId: params.result.selected.id,
          autoArchivedScenarioIds: params.result.autoArchivedScenarioIds,
        },
        ipAddress: params.context?.meta?.ipAddress,
        userAgent: params.context?.meta?.userAgent,
        requestId: params.context?.meta?.requestId,
      });
    }

    if (params.result.projectStatusBefore && params.result.projectStatusAfter) {
      await this.auditLogs.create({
        clientId: params.clientId,
        userId: params.context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_STATUS_CHANGED_FROM_SCENARIO_SELECTION,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
        resourceId: params.result.selected.projectId,
        oldValue: { status: params.result.projectStatusBefore },
        newValue: {
          status: params.result.projectStatusAfter,
          scenarioId: params.result.selected.id,
          decisionNote: params.result.decisionNote ?? null,
        },
        ipAddress: params.context?.meta?.ipAddress,
        userAgent: params.context?.meta?.userAgent,
        requestId: params.context?.meta?.requestId,
      });
    }
  }

  /**
   * Intégration des dimensions scénario → référentiels projet (budget, équipe, etc.).
   * Les options sont enregistrées en audit ; le branchement métier se fait ici par flag.
   */
  private async applyScenarioSelectionSync(
    clientId: string,
    projectId: string,
    scenarioId: string,
    sync: ResolvedScenarioSyncOptions,
    context?: AuditContext,
  ): Promise<void> {
    if (sync.syncBudget) {
      await this.projectBudgetLinks.syncFromScenarioBaseline(
        clientId,
        projectId,
        scenarioId,
        context,
      );
    }
    // TODO(RFC): syncResources → affectations ; syncPlanning → jalons / tâches ;
    // syncCapacity → recompute ; syncRisks → registre projet.
  }

  private auditPayload(row: ProjectScenario) {
    return {
      projectId: row.projectId,
      scenarioId: row.id,
      clientId: row.clientId,
      name: row.name,
      code: row.code,
      status: row.status,
      version: row.version,
      isBaseline: row.isBaseline,
    };
  }

  private toSummary(row: ProjectScenario): ScenarioSummaryDto {
    const safe = this.assertConsistent(row);
    return {
      id: safe.id,
      projectId: safe.projectId,
      clientId: safe.clientId,
      name: safe.name,
      code: safe.code ?? null,
      description: safe.description ?? null,
      assumptionSummary: safe.assumptionSummary ?? null,
      status: safe.status,
      version: safe.version,
      isBaseline: safe.isBaseline,
      selectedAt: safe.selectedAt?.toISOString() ?? null,
      selectedByUserId: safe.selectedByUserId ?? null,
      archivedAt: safe.archivedAt?.toISOString() ?? null,
      archivedByUserId: safe.archivedByUserId ?? null,
      createdAt: safe.createdAt.toISOString(),
      updatedAt: safe.updatedAt.toISOString(),
      budgetSummary: null,
      resourceSummary: null,
      timelineSummary: null,
      capacitySummary: null,
      riskSummary: null,
    };
  }
}
