import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Project,
  ProjectMilestone,
  ProjectRisk,
  ProjectTask,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects.query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  ProjectsPilotageService,
  derivedProgressPercentFromTasks,
} from './projects-pilotage.service';
import type { ComputedHealth } from './projects.types';

const projectIncludeList = {
  tasks: true,
  risks: true,
  milestones: true,
  owner: { select: { firstName: true, lastName: true, email: true } },
} as const;

export type ProjectListItemDto = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  priority: string;
  criticality: string;
  progressPercent: number | null;
  derivedProgressPercent: number | null;
  computedHealth: ComputedHealth;
  targetEndDate: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  openTasksCount: number;
  openRisksCount: number;
  delayedMilestonesCount: number;
  signals: ReturnType<ProjectsPilotageService['buildSignals']>;
  warnings: ReturnType<ProjectsPilotageService['buildWarnings']>;
};

export type ProjectsPortfolioSummaryDto = {
  totalProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  lateProjects: number;
  criticalProjects: number;
  blockedProjects: number;
  noRiskProjects: number;
  noOwnerProjects: number;
  noMilestoneProjects: number;
};

export type ProjectDetailDto = ProjectListItemDto & {
  description: string | null;
  sponsorUserId: string | null;
  startDate: string | null;
  actualEndDate: string | null;
  targetBudgetAmount: string | null;
  pilotNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly pilotage: ProjectsPilotageService,
  ) {}

  private ownerDisplayName(owner: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null): string | null {
    if (!owner) return null;
    const parts = [owner.firstName, owner.lastName].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return owner.email;
  }

  private toListItem(
    project: Project & {
      tasks: ProjectTask[];
      risks: ProjectRisk[];
      milestones: ProjectMilestone[];
      owner: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      } | null;
    },
  ): ProjectListItemDto {
    const health = this.pilotage.computedHealth(
      project,
      project.tasks,
      project.risks,
      project.milestones,
    );
    const signals = this.pilotage.buildSignals(
      project,
      project.tasks,
      project.risks,
      project.milestones,
      health,
    );
    const warnings = this.pilotage.buildWarnings(signals);
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      type: project.type,
      status: project.status,
      priority: project.priority,
      criticality: project.criticality,
      progressPercent: project.progressPercent,
      derivedProgressPercent: derivedProgressPercentFromTasks(project.tasks),
      computedHealth: health,
      targetEndDate: project.targetEndDate?.toISOString() ?? null,
      ownerUserId: project.ownerUserId,
      ownerDisplayName: this.ownerDisplayName(project.owner),
      openTasksCount: this.pilotage.openTasksCount(project.tasks),
      openRisksCount: this.pilotage.openRisksCount(project.risks),
      delayedMilestonesCount: this.pilotage.delayedMilestonesCount(
        project.milestones,
      ),
      signals,
      warnings,
    };
  }

  async assertClientUser(clientId: string, userId: string | undefined | null) {
    if (!userId) return;
    const cu = await this.prisma.clientUser.findFirst({
      where: { userId, clientId, status: 'ACTIVE' },
    });
    if (!cu) {
      throw new BadRequestException(
        'User must be an active member of the client',
      );
    }
  }

  async list(
    clientId: string,
    query: ListProjectsQueryDto,
  ): Promise<{
    items: ProjectListItemDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ProjectWhereInput = { clientId };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.criticality) where.criticality = query.criticality;

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.project.findMany({
      where,
      include: projectIncludeList,
    });

    let enriched = rows.map((p) => this.toListItem(p as any));

    if (query.atRiskOnly) {
      enriched = enriched.filter(
        (item) =>
          item.computedHealth !== 'GREEN' ||
          item.signals.isBlocked ||
          item.signals.isLate,
      );
    }

    const sortBy = query.sortBy ?? 'targetEndDate';
    const order = query.sortOrder ?? 'asc';
    const mult = order === 'desc' ? -1 : 1;

    enriched.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'targetEndDate': {
          const ta = a.targetEndDate ? new Date(a.targetEndDate).getTime() : 0;
          const tb = b.targetEndDate ? new Date(b.targetEndDate).getTime() : 0;
          cmp = ta - tb;
          break;
        }
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'priority':
          cmp = a.priority.localeCompare(b.priority);
          break;
        case 'criticality':
          cmp = a.criticality.localeCompare(b.criticality);
          break;
        case 'computedHealth': {
          const rank = (h: ComputedHealth) =>
            h === 'RED' ? 0 : h === 'ORANGE' ? 1 : 2;
          cmp = rank(a.computedHealth) - rank(b.computedHealth);
          break;
        }
        case 'progressPercent': {
          const pa = a.progressPercent ?? -1;
          const pb = b.progressPercent ?? -1;
          cmp = pa - pb;
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * mult;
    });

    const total = enriched.length;
    const offset = (page - 1) * limit;
    const items = enriched.slice(offset, offset + limit);

    return { items, total, page, limit };
  }

  async getPortfolioSummary(
    clientId: string,
  ): Promise<ProjectsPortfolioSummaryDto> {
    const rows = await this.prisma.project.findMany({
      where: { clientId },
      include: projectIncludeList,
    });

    let lateProjects = 0;
    let criticalProjects = 0;
    let blockedProjects = 0;
    let noRiskProjects = 0;
    let noOwnerProjects = 0;
    let noMilestoneProjects = 0;
    let inProgressProjects = 0;
    let completedProjects = 0;

    for (const p of rows) {
      const item = this.toListItem(p as any);
      if (p.status === 'IN_PROGRESS') inProgressProjects += 1;
      if (p.status === 'COMPLETED') completedProjects += 1;
      if (item.signals.isLate) lateProjects += 1;
      if (item.signals.isCritical) criticalProjects += 1;
      if (item.signals.isBlocked) blockedProjects += 1;
      if (item.signals.hasNoRisks) noRiskProjects += 1;
      if (item.signals.hasNoOwner) noOwnerProjects += 1;
      if (item.signals.hasNoMilestones) noMilestoneProjects += 1;
    }

    return {
      totalProjects: rows.length,
      inProgressProjects,
      completedProjects,
      lateProjects,
      criticalProjects,
      blockedProjects,
      noRiskProjects,
      noOwnerProjects,
      noMilestoneProjects,
    };
  }

  async getById(
    clientId: string,
    id: string,
  ): Promise<ProjectDetailDto> {
    const project = await this.prisma.project.findFirst({
      where: { id, clientId },
      include: projectIncludeList,
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const base = this.toListItem(project as any);
    return {
      ...base,
      description: project.description,
      sponsorUserId: project.sponsorUserId,
      startDate: project.startDate?.toISOString() ?? null,
      actualEndDate: project.actualEndDate?.toISOString() ?? null,
      targetBudgetAmount: project.targetBudgetAmount?.toString() ?? null,
      pilotNotes: project.pilotNotes,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async create(
    clientId: string,
    dto: CreateProjectDto,
    context?: AuditContext,
  ) {
    await this.assertClientUser(clientId, dto.sponsorUserId);
    await this.assertClientUser(clientId, dto.ownerUserId);

    const existing = await this.prisma.project.findUnique({
      where: { clientId_code: { clientId, code: dto.code.trim() } },
    });
    if (existing) {
      throw new ConflictException(`Project code "${dto.code}" already exists`);
    }

    const created = await this.prisma.project.create({
      data: {
        clientId,
        name: dto.name.trim(),
        code: dto.code.trim(),
        description: dto.description?.trim() ?? null,
        type: dto.type,
        status: dto.status ?? 'DRAFT',
        priority: dto.priority,
        sponsorUserId: dto.sponsorUserId ?? null,
        ownerUserId: dto.ownerUserId ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        targetEndDate: dto.targetEndDate ? new Date(dto.targetEndDate) : null,
        actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : null,
        criticality: dto.criticality,
        progressPercent: dto.progressPercent ?? null,
        targetBudgetAmount:
          dto.targetBudgetAmount !== undefined
            ? new Prisma.Decimal(dto.targetBudgetAmount)
            : null,
        pilotNotes: dto.pilotNotes?.trim() ?? null,
      },
      include: projectIncludeList,
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'project.create',
      resourceType: 'Project',
      resourceId: created.id,
      newValue: { code: created.code, name: created.name },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return this.getById(clientId, created.id);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateProjectDto,
    context?: AuditContext,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    if (dto.code !== undefined && dto.code.trim() !== existing.code) {
      const clash = await this.prisma.project.findUnique({
        where: { clientId_code: { clientId, code: dto.code.trim() } },
      });
      if (clash) {
        throw new ConflictException(`Project code "${dto.code}" already exists`);
      }
    }

    await this.assertClientUser(clientId, dto.sponsorUserId);
    await this.assertClientUser(clientId, dto.ownerUserId);

    const data: Prisma.ProjectUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() ?? null;
    }
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.sponsorUserId !== undefined) {
      data.sponsorUserId = dto.sponsorUserId ?? null;
    }
    if (dto.ownerUserId !== undefined) {
      data.ownerUserId = dto.ownerUserId ?? null;
    }
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.targetEndDate !== undefined) {
      data.targetEndDate = dto.targetEndDate ? new Date(dto.targetEndDate) : null;
    }
    if (dto.actualEndDate !== undefined) {
      data.actualEndDate = dto.actualEndDate ? new Date(dto.actualEndDate) : null;
    }
    if (dto.criticality !== undefined) data.criticality = dto.criticality;
    if (dto.progressPercent !== undefined) {
      data.progressPercent = dto.progressPercent ?? null;
    }
    if (dto.targetBudgetAmount !== undefined) {
      data.targetBudgetAmount =
        dto.targetBudgetAmount !== undefined && dto.targetBudgetAmount !== null
          ? new Prisma.Decimal(dto.targetBudgetAmount)
          : null;
    }
    if (dto.pilotNotes !== undefined) {
      data.pilotNotes = dto.pilotNotes?.trim() ?? null;
    }

    await this.prisma.project.update({
      where: { id },
      data,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project.update',
      resourceType: 'Project',
      resourceId: id,
      oldValue: { code: existing.code },
      newValue: dto,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.getById(clientId, id);
  }

  async delete(clientId: string, id: string, context?: AuditContext) {
    const existing = await this.prisma.project.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.delete({ where: { id } });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project.delete',
      resourceType: 'Project',
      resourceId: id,
      oldValue: { code: existing.code, name: existing.name },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async getProjectForScope(clientId: string, projectId: string) {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }
}
