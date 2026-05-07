import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  ResourceType,
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
import { normalizeSearchText } from '../search/search-normalize.util';
import { buildProjectSearchText } from '../search/search-text-build.util';
import { AccessControlService } from '../access-control/access-control.service';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../access-control/resource-acl.constants';

const projectIncludeList = {
  tasks: true,
  risks: true,
  milestones: true,
  owner: { select: { firstName: true, lastName: true, email: true } },
  teamMembers: {
    include: {
      role: { select: { systemKind: true, name: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
  tagAssignments: {
    include: {
      tag: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  portfolioCategory: {
    select: {
      id: true,
      name: true,
      parentId: true,
      parent: { select: { id: true, name: true } },
    },
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
  myRole?: string | null;
  myRoles?: string[];
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
  portfolioCategory: {
    id: string;
    name: string;
    parentId: string | null;
    parentName: string | null;
  } | null;
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

/** Une ligne projet pour la frise portefeuille (GET portfolio-gantt). */
export type PortfolioGanttRowDto = {
  id: string;
  code: string;
  name: string;
  /** PROJECT | ACTIVITY */
  kind: string;
  status: string;
  priority: string;
  criticality: string;
  startDate: string | null;
  targetEndDate: string | null;
  progressPercent: number | null;
  computedHealth: ComputedHealth;
  isLate: boolean;
  portfolioCategory: ProjectListItemDto['portfolioCategory'];
  myRoles: string[];
  tags: ProjectTagItemDto[];
  ownerDisplayName: string | null;
  sponsorDisplayName: string | null;
  arbitrationStatus: string | null;
  arbitrationMetierStatus: string | null;
  arbitrationComiteStatus: string | null;
  arbitrationCodirStatus: string | null;
  /** Objectif métier (fiche projet) — texte libre. */
  businessProblem: string | null;
  /** Lignes courtes pour infobulle (sponsor, responsable, équipe). */
  stakeholderLines: string[];
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
    private readonly accessControl: Pick<
      AccessControlService,
      'canReadResource' | 'canWriteResource' | 'canAdminResource' | 'filterReadableResourceIds'
    > = {
      canReadResource: async () => true,
      canWriteResource: async () => true,
      canAdminResource: async () => true,
      filterReadableResourceIds: async (params) => params.resourceIds,
    },
  ) {}

  async assertCanReadProject(clientId: string, userId: string, projectId: string): Promise<void> {
    const allowed = await this.accessControl.canReadResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.PROJECT,
      resourceId: projectId,
    });
    if (!allowed) {
      throw new ForbiddenException('Accès refusé par ACL ressource');
    }
  }

  async assertCanWriteProject(clientId: string, userId: string, projectId: string): Promise<void> {
    const allowed = await this.accessControl.canWriteResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.PROJECT,
      resourceId: projectId,
    });
    if (!allowed) {
      throw new ForbiddenException('Accès refusé par ACL ressource');
    }
  }

  async assertCanAdminProject(clientId: string, userId: string, projectId: string): Promise<void> {
    const allowed = await this.accessControl.canAdminResource({
      clientId,
      userId,
      resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.PROJECT,
      resourceId: projectId,
    });
    if (!allowed) {
      throw new ForbiddenException('Accès refusé par ACL ressource');
    }
  }

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

  private normalizeIdentity(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private identityTokensForUser(user: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  }): string[] {
    const tokens = new Set<string>();
    const email = this.normalizeIdentity(user.email);
    const firstName = this.normalizeIdentity(user.firstName);
    const lastName = this.normalizeIdentity(user.lastName);
    if (email) {
      tokens.add(email);
      const local = email.split('@')[0];
      if (local) tokens.add(local);
    }
    if (firstName) tokens.add(firstName);
    if (lastName) tokens.add(lastName);
    if (firstName && lastName) {
      tokens.add(`${firstName} ${lastName}`);
      tokens.add(`${lastName} ${firstName}`);
    }
    return Array.from(tokens);
  }

  private textMatchesIdentity(text: string | null | undefined, tokens: string[]): boolean {
    const normalized = this.normalizeIdentity(text);
    if (!normalized || tokens.length === 0) return false;
    return tokens.some((token) => token.length > 0 && normalized.includes(token));
  }

  private resolveMyRoles(
    project: Project & {
      owner: { email: string; firstName: string | null; lastName: string | null } | null;
      ownerFreeLabel: string | null;
      teamMembers: Array<{
        userId: string | null;
        freeLabel: string | null;
        role: { name: string; systemKind: ProjectTeamRoleSystemKind | null };
        user: { email: string; firstName: string | null; lastName: string | null } | null;
      }>;
    },
    userId?: string,
    identityTokens: string[] = [],
  ): string[] {
    if (!userId) return [];
    const roles = new Set<string>();
    const ownerMatchesIdentity =
      this.textMatchesIdentity(project.owner?.email, identityTokens) ||
      this.textMatchesIdentity(project.owner?.firstName, identityTokens) ||
      this.textMatchesIdentity(project.owner?.lastName, identityTokens) ||
      this.textMatchesIdentity(
        [project.owner?.firstName, project.owner?.lastName].filter(Boolean).join(' '),
        identityTokens,
      ) ||
      this.textMatchesIdentity(project.ownerFreeLabel, identityTokens);

    if (project.ownerUserId === userId || ownerMatchesIdentity) {
      roles.add('Responsable projet');
    }
    if (project.sponsorUserId === userId) roles.add('Sponsor');
    for (const member of project.teamMembers) {
      const isMatchById = member.userId === userId;
      const isMatchByIdentity =
        this.textMatchesIdentity(member.freeLabel, identityTokens) ||
        this.textMatchesIdentity(member.user?.email, identityTokens) ||
        this.textMatchesIdentity(member.user?.firstName, identityTokens) ||
        this.textMatchesIdentity(member.user?.lastName, identityTokens) ||
        this.textMatchesIdentity(
          [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' '),
          identityTokens,
        );
      if (isMatchById || isMatchByIdentity) {
        roles.add(member.role.name);
      }
    }
    return Array.from(roles);
  }

  /** Responsable : compte client ou identité nom libre (dénormalisé sur Project). */
  private ownerDisplayResolved(
    project: Project & {
      owner: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      } | null;
      teamMembers: Array<{
        userId: string | null;
        freeLabel: string | null;
        affiliation: ProjectTeamMemberAffiliation | null;
        role: {
          systemKind: ProjectTeamRoleSystemKind | null;
          name: string;
        };
        user: {
          firstName: string | null;
          lastName: string | null;
          email: string;
        } | null;
      }>;
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
    if (label) return label;

    // Filet de sécurité: certains projets legacy ont un responsable porté par l'équipe
    // sans synchronisation sur Project.ownerUserId / ownerFreeLabel.
    const ownerMember = project.teamMembers.find((member) => {
      if (member.role.systemKind === ProjectTeamRoleSystemKind.OWNER) return true;
      const roleName = member.role.name.trim().toLowerCase();
      return roleName === 'responsable de projet' || roleName === 'responsable projet';
    });
    if (!ownerMember) return null;
    if (ownerMember.user && ownerMember.userId) {
      return this.ownerDisplayName(ownerMember.user);
    }
    const free = ownerMember.freeLabel?.trim();
    if (!free) return null;
    if (ownerMember.affiliation === 'EXTERNAL') return `${free} · Externe`;
    if (ownerMember.affiliation === 'INTERNAL') return `${free} · Interne`;
    return free;
  }

  private sponsorDisplayFromUser(
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null,
  ): string | null {
    if (!user) return null;
    return this.ownerDisplayName(user);
  }

  /** Ligne équipe projet pour infobulle Gantt portefeuille (libellés métier, pas ID). */
  private teamMemberTooltipLine(
    member: {
      userId: string | null;
      freeLabel: string | null;
      affiliation: ProjectTeamMemberAffiliation | null;
      role: { name: string };
      user: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      } | null;
    },
  ): string | null {
    const roleName = member.role.name.trim() || 'Membre';
    if (member.userId && member.user) {
      return `${roleName} — ${this.ownerDisplayName(member.user)}`;
    }
    const fl = member.freeLabel?.trim();
    if (fl) {
      const aff =
        member.affiliation === 'EXTERNAL'
          ? ' · Externe'
          : member.affiliation === 'INTERNAL'
            ? ' · Interne'
            : '';
      return `${roleName} — ${fl}${aff}`;
    }
    return null;
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
      teamMembers: Array<{
        userId: string | null;
        freeLabel: string | null;
        affiliation: ProjectTeamMemberAffiliation | null;
        role: {
          systemKind: ProjectTeamRoleSystemKind | null;
          name: string;
        };
        user: {
          firstName: string | null;
          lastName: string | null;
          email: string;
        } | null;
      }>;
      tagAssignments: Array<{
        tag: { id: string; name: string; color: string | null };
      }>;
      portfolioCategory: {
        id: string;
        name: string;
        parentId: string | null;
        parent: { id: string; name: string } | null;
      } | null;
    },
  ): ProjectListItemDto {
    const ownerDisplayName = this.ownerDisplayResolved(project);
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
    // Source de vérité UI: si un responsable est affichable, on ne doit jamais lever NO_OWNER.
    const normalizedSignals = {
      ...signals,
      hasNoOwner: ownerDisplayName == null,
    };
    const warnings = this.pilotage.buildWarnings(normalizedSignals);
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
      ownerDisplayName,
      openTasksCount: this.pilotage.openTasksCount(project.tasks),
      openRisksCount: this.pilotage.openRisksCount(project.risks),
      delayedMilestonesCount: this.pilotage.delayedMilestonesCount(
        project.milestones,
      ),
      signals: normalizedSignals,
      warnings,
      tags: project.tagAssignments.map((assignment) => ({
        id: assignment.tag.id,
        name: assignment.tag.name,
        color: assignment.tag.color,
      })),
      portfolioCategory: project.portfolioCategory
        ? {
            id: project.portfolioCategory.id,
            name: project.portfolioCategory.name,
            parentId: project.portfolioCategory.parentId,
            parentName: project.portfolioCategory.parent?.name ?? null,
          }
        : null,
    };
  }

  async assertProjectPortfolioSubCategory(
    clientId: string,
    categoryId: string | null | undefined,
  ) {
    if (!categoryId) return;
    const category = await this.prisma.projectPortfolioCategory.findFirst({
      where: { id: categoryId, clientId },
      select: {
        id: true,
        parentId: true,
        isActive: true,
      },
    });
    if (!category) {
      throw new BadRequestException(
        'Project portfolio category not found for active client',
      );
    }
    if (!category.isActive) {
      throw new BadRequestException('Inactive categories cannot be assigned');
    }
    if (!category.parentId) {
      throw new BadRequestException(
        'A project can only be assigned to a level-2 portfolio sub-category',
      );
    }
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

  /**
   * Responsable de risque : membre client actif, ou identité plateforme alignée sur une fiche
   * ressource Humaine du client (même e-mail que le catalogue RH — `linkedUserId` côté API).
   */
  async assertProjectRiskOwnerUser(
    clientId: string,
    userId: string | null | undefined,
  ): Promise<void> {
    if (!userId) return;
    const activeMember = await this.prisma.clientUser.findFirst({
      where: { clientId, userId, status: ClientUserStatus.ACTIVE },
      select: { id: true },
    });
    if (activeMember) return;

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { email: true },
    });
    const email = user?.email?.trim();
    if (!email) {
      throw new BadRequestException(
        'Le responsable doit être un membre actif du client ou une ressource humaine du catalogue (compte lié).',
      );
    }
    const human = await this.prisma.resource.findFirst({
      where: {
        clientId,
        type: ResourceType.HUMAN,
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (!human) {
      throw new BadRequestException(
        'Le responsable doit être un membre actif du client ou une ressource humaine du catalogue avec la même identité e-mail.',
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
   * Identités « nom libre » déjà rencontrées sur l’équipe projet du client (dédoublonnées par identityKey).
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

  /**
   * Liste projets filtrée / triée (même règles que `GET /projects`), sans pagination.
   * Utilisé par `list` et par la frise portefeuille.
   */
  private async listProjectsEnriched(
    clientId: string,
    query: ListProjectsQueryDto,
    userId?: string,
  ): Promise<ProjectListItemDto[]> {
    const where: Prisma.ProjectWhereInput = { clientId };
    const andFilters: Prisma.ProjectWhereInput[] = [];

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.criticality) where.criticality = query.criticality;
    if (query.kind) where.kind = query.kind;
    if (query.portfolioCategoryId) where.portfolioCategoryId = query.portfolioCategoryId;
    if (query.ownerUserId) where.ownerUserId = query.ownerUserId;

    if (query.search?.trim()) {
      const s = query.search.trim();
      const ns = normalizeSearchText(s);
      andFilters.push({
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { code: { contains: s, mode: 'insensitive' } },
          ...(ns.length > 0
            ? [{ searchText: { contains: ns, mode: 'insensitive' as const } }]
            : []),
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    let rows = await this.prisma.project.findMany({
      where,
      include: projectIncludeList,
    });

    if (userId) {
      const readableProjectIds = await this.accessControl.filterReadableResourceIds({
        clientId,
        userId,
        resourceTypeNormalized: RESOURCE_ACL_RESOURCE_TYPES.PROJECT,
        resourceIds: rows.map((row) => row.id),
        operation: 'read',
      });
      const readableSet = new Set(readableProjectIds);
      rows = rows.filter((row) => readableSet.has(row.id));
    }

    const me = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true },
        })
      : null;
    const identityTokens = me ? this.identityTokensForUser(me) : [];

    let myProjectRows = rows;
    if (query.myProjectsOnly && userId) {
      const tokens = identityTokens;
      myProjectRows = rows.filter((project) => {
        if (project.ownerUserId === userId || project.sponsorUserId === userId) return true;
        if (
          project.teamMembers.some(
            (member) =>
              member.userId === userId ||
              this.textMatchesIdentity(member.user?.email, tokens) ||
              this.textMatchesIdentity(member.freeLabel, tokens),
          )
        ) {
          return true;
        }
        if (this.textMatchesIdentity(project.ownerFreeLabel, tokens)) return true;
        return false;
      });
    }

    let enriched = myProjectRows.map((p) => ({
      ...this.toListItem(p as any),
      myRoles: this.resolveMyRoles(p as any, userId, identityTokens),
    }));
    enriched = enriched.map((item) => ({
      ...item,
      myRole: item.myRoles?.[0] ?? null,
    }));

    if (query.computedHealth) {
      enriched = enriched.filter((item) => item.computedHealth === query.computedHealth);
    }
    if (query.myRole?.trim()) {
      const expectedRole = query.myRole.trim().toLowerCase();
      enriched = enriched.filter((item) =>
        (item.myRoles ?? []).some((role) => role.toLowerCase().includes(expectedRole)),
      );
    }

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
        case 'owner': {
          const oa = (a.ownerDisplayName ?? '').toLocaleLowerCase('fr-FR');
          const ob = (b.ownerDisplayName ?? '').toLocaleLowerCase('fr-FR');
          cmp = oa.localeCompare(ob, 'fr-FR');
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * mult;
    });

    return enriched;
  }

  async list(
    clientId: string,
    query: ListProjectsQueryDto,
    userId?: string,
  ): Promise<{
    items: ProjectListItemDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const enriched = await this.listProjectsEnriched(clientId, query, userId);
    const total = enriched.length;
    const offset = (page - 1) * limit;
    const items = enriched.slice(offset, offset + limit);

    return { items, total, page, limit };
  }

  /** Frise portefeuille : mêmes filtres que la liste, une barre par projet (dates projet). */
  async getPortfolioGantt(
    clientId: string,
    query: ListProjectsQueryDto,
    userId?: string,
  ): Promise<{ items: PortfolioGanttRowDto[] }> {
    const enriched = await this.listProjectsEnriched(clientId, query, userId);
    if (enriched.length === 0) {
      return { items: [] };
    }
    const ids = enriched.map((e) => e.id);
    const detailRows = await this.prisma.project.findMany({
      where: { id: { in: ids }, clientId },
      select: {
        id: true,
        startDate: true,
        arbitrationStatus: true,
        arbitrationMetierStatus: true,
        arbitrationComiteStatus: true,
        arbitrationCodirStatus: true,
        businessProblem: true,
        sponsor: {
          select: { firstName: true, lastName: true, email: true },
        },
        teamMembers: {
          orderBy: { createdAt: 'asc' },
          take: 24,
          include: {
            role: { select: { name: true } },
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    const detailById = new Map(detailRows.map((r) => [r.id, r]));
    const startById = new Map(
      detailRows.map((d) => [d.id, d.startDate?.toISOString() ?? null]),
    );

    return {
      items: enriched.map((e) => {
        const d = detailById.get(e.id);
        const sponsorName = d?.sponsor
          ? this.sponsorDisplayFromUser(d.sponsor)
          : null;
        const stakeholderLines: string[] = [];
        if (sponsorName) {
          stakeholderLines.push(`Sponsor : ${sponsorName}`);
        }
        if (e.ownerDisplayName) {
          stakeholderLines.push(`Responsable : ${e.ownerDisplayName}`);
        }
        if (d?.teamMembers?.length) {
          for (const m of d.teamMembers) {
            if (stakeholderLines.length >= 14) break;
            const line = this.teamMemberTooltipLine(m);
            if (line && !stakeholderLines.includes(line)) {
              stakeholderLines.push(line);
            }
          }
        }

        return {
          id: e.id,
          code: e.code,
          name: e.name,
          kind: e.kind,
          status: e.status,
          priority: e.priority,
          criticality: e.criticality,
          startDate: startById.get(e.id) ?? null,
          targetEndDate: e.targetEndDate,
          progressPercent:
            e.progressPercent ?? e.derivedProgressPercent ?? null,
          computedHealth: e.computedHealth,
          isLate: e.signals.isLate,
          portfolioCategory: e.portfolioCategory,
          myRoles: e.myRoles ?? [],
          tags: e.tags,
          ownerDisplayName: e.ownerDisplayName,
          sponsorDisplayName: sponsorName,
          arbitrationStatus: d?.arbitrationStatus ?? null,
          arbitrationMetierStatus: d?.arbitrationMetierStatus ?? null,
          arbitrationComiteStatus: d?.arbitrationComiteStatus ?? null,
          arbitrationCodirStatus: d?.arbitrationCodirStatus ?? null,
          businessProblem: d?.businessProblem?.trim() ? d.businessProblem.trim() : null,
          stakeholderLines,
        };
      }),
    };
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
    userId?: string,
  ): Promise<ProjectDetailDto> {
    const project = await this.prisma.project.findFirst({
      where: { id, clientId },
      include: projectIncludeList,
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (userId) {
      await this.assertCanReadProject(clientId, userId, id);
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
    await this.assertProjectPortfolioSubCategory(clientId, dto.portfolioCategoryId);

    const hasOwnerUser = Boolean(dto.ownerUserId?.trim());
    const freeTrim = dto.ownerFreeLabel?.trim();
    const hasFree = Boolean(freeTrim);

    if (hasOwnerUser && hasFree) {
      throw new BadRequestException(
        'Indiquez soit un responsable avec compte client, soit une identité nom libre.',
      );
    }
    if (hasFree) {
      if (
        dto.ownerAffiliation !== ProjectTeamMemberAffiliation.INTERNAL &&
        dto.ownerAffiliation !== ProjectTeamMemberAffiliation.EXTERNAL
      ) {
        throw new BadRequestException(
          'Pour une identité nom libre, choisissez interne ou externe.',
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
      portfolioCategoryId: dto.portfolioCategoryId ?? null,
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
      searchText: buildProjectSearchText({
        name: dto.name.trim(),
        code: dto.code.trim(),
        description: dto.description?.trim() ?? null,
      }),
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

    return this.getById(clientId, created.id, context?.actorUserId);
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
    if (!context?.actorUserId) {
      throw new ForbiddenException('Contexte utilisateur manquant');
    }
    await this.assertCanWriteProject(clientId, context.actorUserId, id);

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
    await this.assertProjectPortfolioSubCategory(clientId, dto.portfolioCategoryId);

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
    if (dto.portfolioCategoryId !== undefined) {
      data.portfolioCategoryId = dto.portfolioCategoryId ?? null;
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

    const nameForSearch =
      dto.name !== undefined ? dto.name.trim() : existing.name;
    const codeForSearch =
      dto.code !== undefined ? dto.code.trim() : existing.code;
    const descForSearch =
      dto.description !== undefined
        ? (dto.description?.trim() ?? null)
        : existing.description;
    data.searchText = buildProjectSearchText({
      name: nameForSearch,
      code: codeForSearch,
      description: descForSearch,
    });

    const updated = await this.prisma.project.update({
      where: { id },
      data,
    });

    const oldSnap = projectEntityAuditSnapshot(existing);
    const newSnap = projectEntityAuditSnapshot(updated);
    let { oldValue, newValue } = diffAuditSnapshots(oldSnap, newSnap);
    const statusChanged = existing.status !== updated.status;
    const ownerChanged = existing.ownerUserId !== updated.ownerUserId;
    const portfolioCategoryChanged =
      existing.portfolioCategoryId !== updated.portfolioCategoryId;
    const keysToOmit: string[] = [];
    if (statusChanged) keysToOmit.push('status');
    if (ownerChanged) keysToOmit.push('ownerUserId');
    if (portfolioCategoryChanged) keysToOmit.push('portfolioCategoryId');
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

    if (portfolioCategoryChanged) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_PORTFOLIO_CATEGORY_UPDATED_ON_PROJECT,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
        resourceId: id,
        oldValue: { portfolioCategoryId: existing.portfolioCategoryId ?? null },
        newValue: { portfolioCategoryId: updated.portfolioCategoryId ?? null },
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

    return this.getById(clientId, id, context.actorUserId);
  }

  async delete(clientId: string, id: string, context?: AuditContext) {
    const existing = await this.prisma.project.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Project not found');
    }
    if (!context?.actorUserId) {
      throw new ForbiddenException('Contexte utilisateur manquant');
    }
    await this.assertCanAdminProject(clientId, context.actorUserId, id);

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
