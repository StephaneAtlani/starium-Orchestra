import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  Prisma,
  Project,
  ProjectMilestone,
  ProjectRisk,
  ProjectTask,
  ProjectTeamMemberAffiliation,
  ProjectTeamRoleSystemKind,
} from '@prisma/client';
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
  projectEntityAuditSnapshot,
} from './project-audit-serialize';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects.query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectTagDto } from './dto/create-project-tag.dto';
import { UpdateProjectTagDto } from './dto/update-project-tag.dto';
import { ReplaceProjectTagsDto } from './dto/replace-project-tags.dto';
import {
  ProjectsPilotageService,
  derivedProgressPercentFromTasks,
} from './projects-pilotage.service';
import { ProjectTeamService } from './project-team.service';
import type { ComputedHealth } from './projects.types';

const projectIncludeList = {
  tasks: true,
  risks: true,
  milestones: true,
  owner: { select: { firstName: true, lastName: true, email: true } },
  tagAssignments: {
    include: {
      tag: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} as const;

export type ProjectTagItemDto = {
  id: string;
  name: string;
  color: string | null;
};

export type ProjectListItemDto = {
  id: string;
  code: string;
  name: string;
  kind: string;
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
  tags: ProjectTagItemDto[];
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
    private readonly projectTeam: ProjectTeamService,
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

  /** Responsable : compte client ou personne nom libre (dénormalisé sur Project). */
  private ownerDisplayResolved(
    project: Project & {
      owner: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      } | null;
    },
  ): string | null {
    if (project.ownerUserId) {
      return this.ownerDisplayName(project.owner);
    }
    const label = project.ownerFreeLabel?.trim();
    if (!label) return null;
    if (project.ownerAffiliation === 'EXTERNAL') {
      return `${label} · Externe`;
    }
    if (project.ownerAffiliation === 'INTERNAL') {
      return `${label} · Interne`;
    }
    return label;
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
      tagAssignments: Array<{
        tag: { id: string; name: string; color: string | null };
      }>;
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
      kind: project.kind,
      type: project.type,
      status: project.status,
      priority: project.priority,
      criticality: project.criticality,
      progressPercent: project.progressPercent,
      derivedProgressPercent: derivedProgressPercentFromTasks(project.tasks),
      computedHealth: health,
      targetEndDate: project.targetEndDate?.toISOString() ?? null,
      ownerUserId: project.ownerUserId,
      ownerDisplayName: this.ownerDisplayResolved(project),
      openTasksCount: this.pilotage.openTasksCount(project.tasks),
      openRisksCount: this.pilotage.openRisksCount(project.risks),
      delayedMilestonesCount: this.pilotage.delayedMilestonesCount(
        project.milestones,
      ),
      signals,
      warnings,
      tags: project.tagAssignments.map((assignment) => ({
        id: assignment.tag.id,
        name: assignment.tag.name,
        color: assignment.tag.color,
      })),
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

  /** RFC-PROJ-011 — ligne budgétaire doit appartenir au client actif */
  async assertBudgetLineInClient(
    clientId: string,
    budgetLineId: string | null | undefined,
  ) {
    if (!budgetLineId) return;
    const bl = await this.prisma.budgetLine.findFirst({
      where: { id: budgetLineId, clientId },
    });
    if (!bl) {
      throw new BadRequestException('Budget line not found for this client');
    }
  }

  /**
   * Membres actifs du client pour désigner un responsable (sans exiger le rôle client admin).
   */
  async listAssignableUsers(clientId: string) {
    const rows = await this.prisma.clientUser.findMany({
      where: { clientId, status: ClientUserStatus.ACTIVE },
      include: { user: true },
    });
    return rows.map((cu) => ({
      id: cu.user.id,
      email: cu.user.email,
      firstName: cu.user.firstName,
      lastName: cu.user.lastName,
      role: cu.role,
      status: cu.status,
    }));
  }

  /**
   * Personnes « nom libre » déjà rencontrées sur l’équipe projet du client (dédoublonnées par identityKey).
   * Sert au choix responsable à la création projet.
   */
  async listAssignableFreePersons(clientId: string) {
    const rows = await this.prisma.projectTeamMember.findMany({
      where: {
        clientId,
        userId: null,
        freeLabel: { not: null },
      },
      select: {
        freeLabel: true,
        affiliation: true,
        identityKey: true,
      },
      orderBy: [{ freeLabel: 'asc' }],
    });
    const seen = new Set<string>();
    const out: {
      label: string;
      affiliation: ProjectTeamMemberAffiliation;
      identityKey: string;
    }[] = [];
    for (const r of rows) {
      if (!r.freeLabel || seen.has(r.identityKey)) continue;
      seen.add(r.identityKey);
      if (
        r.affiliation !== ProjectTeamMemberAffiliation.INTERNAL &&
        r.affiliation !== ProjectTeamMemberAffiliation.EXTERNAL
      ) {
        continue;
      }
      out.push({
        label: r.freeLabel,
        affiliation: r.affiliation,
        identityKey: r.identityKey,
      });
    }
    return out;
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
    if (query.kind) where.kind = query.kind;

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
    await this.projectTeam.ensureDefaultTeamRolesForClient(clientId);
    await this.assertClientUser(clientId, dto.sponsorUserId);
    await this.assertClientUser(clientId, dto.ownerUserId);

    const hasOwnerUser = Boolean(dto.ownerUserId?.trim());
    const freeTrim = dto.ownerFreeLabel?.trim();
    const hasFree = Boolean(freeTrim);

    if (hasOwnerUser && hasFree) {
      throw new BadRequestException(
        'Indiquez soit un responsable avec compte client, soit une personne nom libre.',
      );
    }
    if (hasFree) {
      if (
        dto.ownerAffiliation !== ProjectTeamMemberAffiliation.INTERNAL &&
        dto.ownerAffiliation !== ProjectTeamMemberAffiliation.EXTERNAL
      ) {
        throw new BadRequestException(
          'Pour une personne nom libre, choisissez interne ou externe.',
        );
      }
    }

    const existing = await this.prisma.project.findUnique({
      where: { clientId_code: { clientId, code: dto.code.trim() } },
    });
    if (existing) {
      throw new ConflictException(`Project code "${dto.code}" already exists`);
    }

    let ownerRoleIdForFree: string | null = null;
    if (hasFree) {
      const ownerRole = await this.prisma.projectTeamRole.findFirst({
        where: { clientId, systemKind: ProjectTeamRoleSystemKind.OWNER },
      });
      if (!ownerRole) {
        throw new BadRequestException(
          'Rôle « Responsable projet » introuvable pour ce client.',
        );
      }
      ownerRoleIdForFree = ownerRole.id;
    }

    const ownerFreeLabel =
      hasFree && !hasOwnerUser ? freeTrim!.slice(0, 200) : null;
    const ownerAffiliation =
      hasFree && !hasOwnerUser ? dto.ownerAffiliation! : null;

    /** Sans clés ownerFree* : conteneurs Prisma générés avant migration `project_owner_free_label`. */
    const baseCreate = {
      clientId,
      name: dto.name.trim(),
      code: dto.code.trim(),
      description: dto.description?.trim() ?? null,
      kind: dto.kind ?? 'PROJECT',
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
    } satisfies Prisma.ProjectUncheckedCreateInput;

    const created = await this.prisma.project.create({
      data:
        hasFree && !hasOwnerUser && ownerFreeLabel != null && ownerAffiliation != null
          ? {
              ...baseCreate,
              ownerFreeLabel,
              ownerAffiliation,
            }
          : baseCreate,
      include: projectIncludeList,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
      resourceId: created.id,
      newValue: projectEntityAuditSnapshot(created),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    await this.projectTeam.syncTeamMembersFromProjectSponsorOwner(
      clientId,
      created.id,
      created.sponsorUserId,
      created.ownerUserId,
    );

    if (hasFree && ownerRoleIdForFree) {
      await this.projectTeam.addMember(clientId, created.id, {
        roleId: ownerRoleIdForFree,
        freeLabel: freeTrim!,
        affiliation: dto.ownerAffiliation!,
      });
    }

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
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.sponsorUserId !== undefined) {
      data.sponsorUserId = dto.sponsorUserId ?? null;
    }
    if (dto.ownerUserId !== undefined) {
      data.ownerUserId = dto.ownerUserId ?? null;
      if (
        'ownerFreeLabel' in existing &&
        'ownerAffiliation' in existing
      ) {
        data.ownerFreeLabel = null;
        data.ownerAffiliation = null;
      }
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
    if (dto.copilRecommendation !== undefined) {
      data.copilRecommendation = dto.copilRecommendation;
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data,
    });

    const oldSnap = projectEntityAuditSnapshot(existing);
    const newSnap = projectEntityAuditSnapshot(updated);
    let { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);
    const statusChanged = existing.status !== updated.status;
    const ownerChanged = existing.ownerUserId !== updated.ownerUserId;
    const keysToOmit: string[] = [];
    if (statusChanged) keysToOmit.push('status');
    if (ownerChanged) keysToOmit.push('ownerUserId');
    ({ oldValue, newValue } = omitKeysFromDiff(oldValue, newValue, keysToOmit));

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };

    if (Object.keys(oldValue).length > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
        resourceId: id,
        oldValue,
        newValue,
        ...meta,
      });
    }

    if (statusChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_STATUS_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
        resourceId: id,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
        ...meta,
      });
    }

    if (ownerChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_OWNER_UPDATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
        resourceId: id,
        oldValue: { ownerUserId: existing.ownerUserId ?? null },
        newValue: { ownerUserId: updated.ownerUserId ?? null },
        ...meta,
      });
    }

    if (dto.sponsorUserId !== undefined || dto.ownerUserId !== undefined) {
      await this.projectTeam.syncTeamMembersFromProjectSponsorOwner(
        clientId,
        id,
        updated.sponsorUserId,
        updated.ownerUserId,
      );
    }

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
      action: PROJECT_AUDIT_ACTION.PROJECT_DELETED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
      resourceId: id,
      oldValue: {
        code: existing.code,
        name: existing.name,
        status: existing.status,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async listTags(clientId: string): Promise<ProjectTagItemDto[]> {
    const rows = await this.prisma.projectTag.findMany({
      where: { clientId },
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, color: true },
    });
    return rows;
  }

  async createTag(
    clientId: string,
    dto: CreateProjectTagDto,
    context?: AuditContext,
  ): Promise<ProjectTagItemDto> {
    const name = dto.name.trim();
    const existing = await this.prisma.projectTag.findFirst({
      where: { clientId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Tag name already exists for this client');
    }
    const created = await this.prisma.projectTag.create({
      data: { clientId, name, color: dto.color ?? null },
      select: { id: true, name: true, color: true },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_tag.created',
      resourceType: 'project_tag',
      resourceId: created.id,
      newValue: created,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return created;
  }

  async updateTag(
    clientId: string,
    tagId: string,
    dto: UpdateProjectTagDto,
    context?: AuditContext,
  ): Promise<ProjectTagItemDto> {
    const existing = await this.prisma.projectTag.findFirst({
      where: { id: tagId, clientId },
      select: { id: true, name: true, color: true },
    });
    if (!existing) throw new NotFoundException('Project tag not found');

    const data: Prisma.ProjectTagUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.prisma.projectTag.findFirst({
        where: {
          clientId,
          id: { not: tagId },
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (clash) {
        throw new ConflictException('Tag name already exists for this client');
      }
      data.name = name;
    }
    if (dto.color !== undefined) data.color = dto.color;

    const updated = await this.prisma.projectTag.update({
      where: { id: tagId },
      data,
      select: { id: true, name: true, color: true },
    });
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_tag.updated',
      resourceType: 'project_tag',
      resourceId: updated.id,
      oldValue: existing,
      newValue: updated,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return updated;
  }

  async deleteTag(clientId: string, tagId: string, context?: AuditContext): Promise<void> {
    const existing = await this.prisma.projectTag.findFirst({
      where: { id: tagId, clientId },
      select: { id: true, name: true, color: true },
    });
    if (!existing) throw new NotFoundException('Project tag not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.projectTagAssignment.deleteMany({
        where: { clientId, tagId },
      });
      await tx.projectTag.delete({
        where: { id: tagId },
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_tag.deleted',
      resourceType: 'project_tag',
      resourceId: existing.id,
      oldValue: existing,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async getProjectTags(clientId: string, projectId: string): Promise<ProjectTagItemDto[]> {
    await this.getProjectForScope(clientId, projectId);
    const rows = await this.prisma.projectTagAssignment.findMany({
      where: { clientId, projectId },
      include: { tag: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => row.tag);
  }

  async replaceProjectTags(
    clientId: string,
    projectId: string,
    dto: ReplaceProjectTagsDto,
    context?: AuditContext,
  ): Promise<ProjectTagItemDto[]> {
    await this.getProjectForScope(clientId, projectId);
    const tagIds = Array.from(new Set(dto.tagIds));
    if (tagIds.length > 0) {
      const validTags = await this.prisma.projectTag.count({
        where: { clientId, id: { in: tagIds } },
      });
      if (validTags !== tagIds.length) {
        throw new BadRequestException('One or more tags do not belong to the active client');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectTagAssignment.deleteMany({
        where: { clientId, projectId },
      });
      if (tagIds.length > 0) {
        await tx.projectTagAssignment.createMany({
          data: tagIds.map((tagId) => ({
            clientId,
            projectId,
            tagId,
          })),
        });
      }
    });

    const tags = await this.getProjectTags(clientId, projectId);
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: 'project_tag.assignment.updated',
      resourceType: 'project',
      resourceId: projectId,
      newValue: { tagIds: tags.map((tag) => tag.id) },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
    return tags;
  }

  async getProjectForScope(clientId: string, projectId: string) {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }
}
