import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ProjectCriticality,
  ProjectPriority,
  ProjectStatus,
  ProjectType,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectsPilotageService } from './projects-pilotage.service';
import { ProjectsService } from './projects.service';
import { PROJECT_AUDIT_ACTION, PROJECT_AUDIT_RESOURCE_TYPE } from './project-audit.constants';

describe('ProjectsService — audit RFC-PROJ-009', () => {
  let service: ProjectsService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let pilotage: Partial<ProjectsPilotageService>;

  const clientId = 'client-1';
  const projectId = 'proj-1';

  const pilotageSignals = {
    isLate: false,
    isBlocked: false,
    hasNoOwner: false,
    hasNoTasks: false,
    hasNoRisks: false,
    hasNoMilestones: false,
    hasPlanningDrift: false,
    isCritical: false,
  };

  function baseProject(overrides: Record<string, unknown> = {}) {
    return {
      id: projectId,
      clientId,
      name: 'Nom',
      code: 'PRJ-1',
      description: null,
      kind: 'PROJECT',
      type: ProjectType.GOVERNANCE,
      status: ProjectStatus.DRAFT,
      priority: ProjectPriority.MEDIUM,
      sponsorUserId: null,
      ownerUserId: null,
      startDate: null,
      targetEndDate: null,
      actualEndDate: null,
      criticality: ProjectCriticality.MEDIUM,
      progressPercent: null,
      targetBudgetAmount: null,
      pilotNotes: null,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      ...overrides,
    };
  }

  function withInclude(p: ReturnType<typeof baseProject>) {
    return {
      ...p,
      tasks: [],
      risks: [],
      milestones: [],
      owner: null,
      tagAssignments: [],
      teamMembers: [],
      portfolioCategory: null,
      ownerOrgUnit: null,
      steward: null,
      parentProject: null,
      _count: { children: 0 },
    };
  }

  function mockHierarchyRows(
    rows: Array<{ id: string; parentProjectId: string | null; code?: string; name?: string }>,
  ) {
    prisma.project.findMany.mockResolvedValue(
      rows.map((r) => ({
        id: r.id,
        parentProjectId: r.parentProjectId,
        name: r.name ?? r.id,
        code: r.code ?? r.id,
        status: ProjectStatus.DRAFT,
        kind: 'PROJECT',
      })),
    );
  }

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      projectTag: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      projectTagAssignment: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      projectPortfolioCategory: {
        findFirst: jest.fn(),
      },
      projectBudgetLink: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (callback) => callback(prisma)),
      clientUser: { findFirst: jest.fn(), findMany: jest.fn() },
      auditLog: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    pilotage = {
      computedHealth: jest.fn().mockReturnValue('GREEN'),
      buildSignals: jest.fn().mockReturnValue(pilotageSignals),
      buildWarnings: jest.fn().mockReturnValue([]),
      openTasksCount: jest.fn().mockReturnValue(0),
      openRisksCount: jest.fn().mockReturnValue(0),
      delayedMilestonesCount: jest.fn().mockReturnValue(0),
    };
    const projectTeam = {
      ensureDefaultTeamRolesForClient: jest.fn().mockResolvedValue(undefined),
      syncTeamMembersFromProjectSponsorOwner: jest.fn().mockResolvedValue(undefined),
    };
    service = new ProjectsService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      pilotage as ProjectsPilotageService,
      projectTeam as any,
      undefined,
      {
        assertAllowed: jest.fn().mockResolvedValue(undefined),
        filterResourceIdsByAccess: jest.fn().mockImplementation(async (p: { resourceIds: string[] }) => p.resourceIds),
      } as any,
    );
  });

  describe('create', () => {
    it('écrit project.created avec resourceType project et newValue métier', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      const created = withInclude(
        baseProject({
          targetBudgetAmount: new Prisma.Decimal('1000.5'),
        }),
      );
      prisma.project.create.mockResolvedValue(created);
      prisma.project.findFirst.mockResolvedValue(created);

      await service.create(
        clientId,
        {
          name: 'Nom',
          code: 'PRJ-1',
          type: ProjectType.GOVERNANCE,
          priority: ProjectPriority.MEDIUM,
          criticality: ProjectCriticality.MEDIUM,
        },
        { actorUserId: 'user-1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_CREATED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
          resourceId: projectId,
          newValue: expect.objectContaining({
            code: 'PRJ-1',
            name: 'Nom',
            targetBudgetAmount: '1000.5',
          }),
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('sans changement granulaire : uniquement project.updated (diff utile)', async () => {
      const existing = baseProject({ name: 'Ancien' });
      const updated = { ...existing, name: 'Nouveau' };
      prisma.project.findFirst.mockResolvedValueOnce(existing);
      prisma.project.update.mockResolvedValue(updated);
      prisma.project.findFirst.mockResolvedValueOnce(withInclude(updated));

      await service.update(
        clientId,
        projectId,
        { name: 'Nouveau' },
        { actorUserId: 'u1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledTimes(1);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_UPDATED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
          resourceId: projectId,
          oldValue: { name: 'Ancien' },
          newValue: { name: 'Nouveau' },
        }),
      );
    });

    it('changement de statut seul : uniquement project.status.updated (pas de duplication dans project.updated)', async () => {
      const existing = baseProject({ status: ProjectStatus.DRAFT });
      const updated = { ...existing, status: ProjectStatus.IN_PROGRESS };
      prisma.project.findFirst.mockResolvedValueOnce(existing);
      prisma.project.update.mockResolvedValue(updated);
      prisma.project.findFirst.mockResolvedValueOnce(withInclude(updated as any));

      await service.update(
        clientId,
        projectId,
        { status: ProjectStatus.IN_PROGRESS },
        { actorUserId: 'u1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledTimes(1);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_STATUS_UPDATED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
          oldValue: { status: ProjectStatus.DRAFT },
          newValue: { status: ProjectStatus.IN_PROGRESS },
        }),
      );
    });

    it('changement owner seul : uniquement project.owner.updated', async () => {
      const existing = baseProject({ ownerUserId: null });
      const updated = { ...existing, ownerUserId: 'owner-2' };
      prisma.clientUser.findFirst.mockResolvedValue({ id: 'cu1' });
      prisma.project.findFirst.mockResolvedValueOnce(existing);
      prisma.project.update.mockResolvedValue(updated);
      prisma.project.findFirst.mockResolvedValueOnce(withInclude(updated as any));

      await service.update(
        clientId,
        projectId,
        { ownerUserId: 'owner-2' },
        { actorUserId: 'u1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledTimes(1);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_OWNER_UPDATED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
          oldValue: { ownerUserId: null },
          newValue: { ownerUserId: 'owner-2' },
        }),
      );
    });

    it('nom + statut : project.updated (sans status) + project.status.updated', async () => {
      const existing = baseProject({
        name: 'A',
        status: ProjectStatus.DRAFT,
      });
      const updated = {
        ...existing,
        name: 'B',
        status: ProjectStatus.IN_PROGRESS,
      };
      prisma.project.findFirst.mockResolvedValueOnce(existing);
      prisma.project.update.mockResolvedValue(updated);
      prisma.project.findFirst.mockResolvedValueOnce(withInclude(updated as any));

      await service.update(
        clientId,
        projectId,
        { name: 'B', status: ProjectStatus.IN_PROGRESS },
        { actorUserId: 'u1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledTimes(2);
      expect(auditLogs.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_UPDATED,
          oldValue: { name: 'A' },
          newValue: { name: 'B' },
        }),
      );
      expect(auditLogs.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_STATUS_UPDATED,
          oldValue: { status: ProjectStatus.DRAFT },
          newValue: { status: ProjectStatus.IN_PROGRESS },
        }),
      );
    });

    it('nom + statut + owner : trois logs additifs', async () => {
      const existing = baseProject({
        name: 'A',
        status: ProjectStatus.DRAFT,
        ownerUserId: null,
      });
      const updated = {
        ...existing,
        name: 'B',
        status: ProjectStatus.IN_PROGRESS,
        ownerUserId: 'o1',
      };
      prisma.clientUser.findFirst.mockResolvedValue({ id: 'cu1' });
      prisma.project.findFirst.mockResolvedValueOnce(existing);
      prisma.project.update.mockResolvedValue(updated);
      prisma.project.findFirst.mockResolvedValueOnce(withInclude(updated as any));

      await service.update(
        clientId,
        projectId,
        {
          name: 'B',
          status: ProjectStatus.IN_PROGRESS,
          ownerUserId: 'o1',
        },
        { actorUserId: 'u1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledTimes(3);
      expect(auditLogs.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_UPDATED,
          oldValue: { name: 'A' },
          newValue: { name: 'B' },
        }),
      );
      expect(auditLogs.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_STATUS_UPDATED,
        }),
      );
      expect(auditLogs.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_OWNER_UPDATED,
        }),
      );
    });
  });

  describe('delete', () => {
    it('écrit project.deleted avec oldValue code, name, status', async () => {
      const existing = baseProject({
        code: 'X',
        name: 'Y',
        status: ProjectStatus.COMPLETED,
      });
      prisma.project.findFirst.mockResolvedValue(existing);
      prisma.project.delete.mockResolvedValue(existing);

      await service.delete(clientId, projectId, { actorUserId: 'u1', meta: {} });

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_DELETED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT,
          resourceId: projectId,
          oldValue: {
            code: 'X',
            name: 'Y',
            status: ProjectStatus.COMPLETED,
          },
        }),
      );
    });
  });

  describe('erreurs métier', () => {
    it('create : conflit de code sans audit', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'other' });

      await expect(
        service.create(clientId, {
          name: 'N',
          code: 'DUP',
          type: ProjectType.GOVERNANCE,
          priority: ProjectPriority.MEDIUM,
          criticality: ProjectCriticality.MEDIUM,
        }),
      ).rejects.toThrow(ConflictException);
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('update : projet absent sans audit', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.update(clientId, projectId, { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(auditLogs.create).not.toHaveBeenCalled();
    });
  });

  describe('portfolio categories', () => {
    it('create refuse une categorie racine', async () => {
      prisma.projectPortfolioCategory.findFirst.mockResolvedValue({
        id: 'cat-root',
        clientId,
        parentId: null,
        isActive: true,
      });
      await expect(
        service.create(clientId, {
          name: 'N',
          code: 'X1',
          type: ProjectType.GOVERNANCE,
          priority: ProjectPriority.MEDIUM,
          criticality: ProjectCriticality.MEDIUM,
          portfolioCategoryId: 'cat-root',
        }),
      ).rejects.toThrow('level-2 portfolio sub-category');
    });

    it('update audit le changement de portfolioCategoryId', async () => {
      const existing = baseProject({ portfolioCategoryId: null });
      const updated = { ...existing, portfolioCategoryId: 'sub-1' };
      prisma.projectPortfolioCategory.findFirst.mockResolvedValue({
        id: 'sub-1',
        clientId,
        parentId: 'root-1',
        isActive: true,
      });
      prisma.project.findFirst.mockResolvedValueOnce(existing);
      prisma.project.update.mockResolvedValue(updated);
      prisma.project.findFirst.mockResolvedValueOnce(withInclude(updated as any));

      await service.update(
        clientId,
        projectId,
        { portfolioCategoryId: 'sub-1' },
        { actorUserId: 'u1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_PORTFOLIO_CATEGORY_UPDATED_ON_PROJECT,
          oldValue: { portfolioCategoryId: null },
          newValue: { portfolioCategoryId: 'sub-1' },
        }),
      );
    });
  });

  describe('project hierarchy — RFC-PROJ-019', () => {
    it('update refuse self-parent', async () => {
      const existing = baseProject();
      prisma.project.findFirst.mockResolvedValue(existing);

      await expect(
        service.update(
          clientId,
          projectId,
          { parentProjectId: projectId },
          { actorUserId: 'u1', meta: {} },
        ),
      ).rejects.toThrow('A project cannot be its own parent');
    });

    it('delete refuse si enfants', async () => {
      prisma.project.findFirst.mockResolvedValue(baseProject());
      prisma.project.count.mockResolvedValue(2);

      await expect(
        service.delete(clientId, projectId, { actorUserId: 'u1', meta: {} }),
      ).rejects.toThrow('Cannot delete a project that has child projects');
      expect(prisma.project.delete).not.toHaveBeenCalled();
    });

    it('update audit parent changed A → B', async () => {
      const existing = baseProject({ parentProjectId: 'parent-a' as any });
      const updated = { ...existing, parentProjectId: 'parent-b' };
      prisma.project.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(withInclude(updated as any));
      prisma.project.update.mockResolvedValue(updated);
      mockHierarchyRows([
        { id: projectId, parentProjectId: 'parent-a' },
        { id: 'parent-a', parentProjectId: null, code: 'PA', name: 'Parent A' },
        { id: 'parent-b', parentProjectId: null, code: 'PB', name: 'Parent B' },
      ]);
      prisma.project.findFirst.mockImplementation(async (args: any) => {
        if (args?.where?.id === 'parent-b') {
          return { id: 'parent-b', clientId };
        }
        if (args?.where?.id === projectId) {
          return args.include ? withInclude(updated as any) : updated;
        }
        return existing;
      });

      await service.update(
        clientId,
        projectId,
        { parentProjectId: 'parent-b' },
        { actorUserId: 'u1', meta: {} },
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_PARENT_CHANGED,
          oldValue: { previousParentProjectId: 'parent-a' },
          newValue: { nextParentProjectId: 'parent-b' },
        }),
      );
    });

    it('list rootOnly + parentProjectId → 400 stable', async () => {
      await expect(
        service.list(clientId, {
          rootOnly: true,
          parentProjectId: 'parent-1',
        }),
      ).rejects.toThrow('rootOnly and parentProjectId are mutually exclusive');
    });

    it('getById retourne ancestorChain ordonné', async () => {
      const project = withInclude(
        baseProject({ id: 'leaf', parentProjectId: 'mid' as any } as any),
      );
      prisma.project.findFirst.mockResolvedValue(project);
      mockHierarchyRows([
        { id: 'root', parentProjectId: null, code: 'R', name: 'Root' },
        { id: 'mid', parentProjectId: 'root', code: 'M', name: 'Mid' },
        { id: 'leaf', parentProjectId: 'mid', code: 'L', name: 'Leaf' },
      ]);

      const detail = await service.getById(clientId, 'leaf');
      expect(detail.ancestorChain).toEqual([
        expect.objectContaining({ id: 'root', code: 'R' }),
        expect.objectContaining({ id: 'mid', code: 'M' }),
      ]);
    });

    it('listAssignableParents exclut self et descendants', async () => {
      mockHierarchyRows([
        { id: 'root', parentProjectId: null, code: 'R', name: 'Root' },
        { id: 'mid', parentProjectId: 'root', code: 'M', name: 'Mid' },
        { id: 'leaf', parentProjectId: 'mid', code: 'L', name: 'Leaf' },
      ]);

      const { items } = await service.listAssignableParents(clientId, {
        excludeProjectId: 'mid',
      });
      const ids = items.map((i) => i.id);
      expect(ids).not.toContain('mid');
      expect(ids).not.toContain('leaf');
      expect(ids).toContain('root');
    });
  });

  describe('project tags', () => {
    it('replaceProjectTags refuse un tag hors client', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId, clientId });
      prisma.projectTag.count.mockResolvedValue(1);

      await expect(
        service.replaceProjectTags(
          clientId,
          projectId,
          { tagIds: ['tag-1', 'tag-2'] },
          { actorUserId: 'u1', meta: {} },
        ),
      ).rejects.toThrow('One or more tags do not belong to the active client');
    });

    it('replaceProjectTags est idempotent et audit les tags finaux', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId, clientId });
      prisma.projectTag.count.mockResolvedValue(2);
      prisma.projectTagAssignment.findMany.mockResolvedValue([
        { tag: { id: 't1', name: 'Ops', color: null } },
        { tag: { id: 't2', name: 'Finance', color: '#111111' } },
      ]);

      const result = await service.replaceProjectTags(
        clientId,
        projectId,
        { tagIds: ['t1', 't2', 't1'] },
        { actorUserId: 'u1', meta: {} },
      );

      expect(prisma.projectTagAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { clientId, projectId, tagId: 't1' },
          { clientId, projectId, tagId: 't2' },
        ],
      });
      expect(result).toHaveLength(2);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'project_tag.assignment.updated',
          resourceType: 'project',
          resourceId: projectId,
          newValue: { tagIds: ['t1', 't2'] },
        }),
      );
    });

    it('deleteTag supprime assignations + tag dans une transaction', async () => {
      prisma.projectTag.findFirst.mockResolvedValue({
        id: 'tag-1',
        name: 'Legacy',
        color: null,
      });

      await service.deleteTag(clientId, 'tag-1', { actorUserId: 'u1', meta: {} });

      expect(prisma.projectTagAssignment.deleteMany).toHaveBeenCalledWith({
        where: { clientId, tagId: 'tag-1' },
      });
      expect(prisma.projectTag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      });
    });
  });

  describe('list — tagIds filter (RFC-PROJ-017)', () => {
    const TAG_A = 'cmnkqlkcb0003o3a5mumz04sn';
    const TAG_B = 'cmnkqlkcb0003o3a5mumz04so';
    const TAG_UNKNOWN = 'cmnkqlkcb0003o3a5mumz9999';
    const PROJ_A = 'cmnkqlkcb0003o3a5mumz04aa';

    function listProjectRow(
      overrides: Record<string, unknown> & {
        tagAssignments?: Array<{ tag: { id: string; name: string; color: string | null } }>;
      } = {},
    ) {
      const { tagAssignments = [], ...rest } = overrides;
      return {
        ...withInclude(baseProject(rest)),
        tagAssignments,
        portfolioCategory: null,
        teamMembers: [],
        ownerOrgUnit: null,
        steward: null,
        ...rest,
      };
    }

    beforeEach(() => {
      prisma.project.findMany = jest.fn().mockResolvedValue([]);
      prisma.user = { findUnique: jest.fn().mockResolvedValue(null) };
    });

    function expectTagIdsWhere(tagIds: string[]) {
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                tagAssignments: {
                  some: { tagId: { in: tagIds }, clientId },
                },
              },
            ]),
          }),
        }),
      );
    }

    it('GET /projects — filtre 1 tag connu dans le where Prisma', async () => {
      const row = listProjectRow({
        id: PROJ_A,
        name: 'Projet Ops',
        tagAssignments: [{ tag: { id: TAG_A, name: 'Ops', color: '#111111' } }],
      });
      prisma.project.findMany.mockResolvedValue([row]);

      const result = await service.list(clientId, { tagIds: [TAG_A] });

      expectTagIdsWhere([TAG_A]);
      expect(result.total).toBe(1);
      expect(result.items[0]?.tags).toEqual([
        { id: TAG_A, name: 'Ops', color: '#111111' },
      ]);
    });

    it('GET /projects — 2 tags en logique OR (clause in)', async () => {
      await service.list(clientId, { tagIds: [TAG_A, TAG_B] });
      expectTagIdsWhere([TAG_A, TAG_B]);
    });

    it('GET /projects — 2 tags en logique ET (AND par étiquette)', async () => {
      await service.list(clientId, {
        tagIds: [TAG_A, TAG_B],
        tagIdsMatch: 'all',
      });
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                AND: [
                  { tagAssignments: { some: { tagId: TAG_A, clientId } } },
                  { tagAssignments: { some: { tagId: TAG_B, clientId } } },
                ],
              },
            ]),
          }),
        }),
      );
    });

    it('GET /projects — tag inconnu seul retourne vide', async () => {
      prisma.project.findMany.mockResolvedValue([]);
      const result = await service.list(clientId, { tagIds: [TAG_UNKNOWN] });
      expectTagIdsWhere([TAG_UNKNOWN]);
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('GET /projects — mélange tag connu + inconnu utilise les deux dans le filtre OR', async () => {
      const row = listProjectRow({
        id: PROJ_A,
        tagAssignments: [{ tag: { id: TAG_A, name: 'Ops', color: null } }],
      });
      prisma.project.findMany.mockResolvedValue([row]);

      const result = await service.list(clientId, {
        tagIds: [TAG_A, TAG_UNKNOWN],
      });

      expectTagIdsWhere([TAG_A, TAG_UNKNOWN]);
      expect(result.total).toBe(1);
    });

    it('GET /portfolio-gantt — applique tagIds comme la liste', async () => {
      await service.getPortfolioGantt(clientId, { tagIds: [TAG_A] });
      expectTagIdsWhere([TAG_A]);
    });

    it('GET /portfolio-gantt — payload tags[] peuplé pour le regroupement frontend', async () => {
      const row = listProjectRow({
        id: PROJ_A,
        name: 'Projet tagué',
        tagAssignments: [
          { tag: { id: TAG_A, name: 'Ops', color: '#aabbcc' } },
          { tag: { id: TAG_B, name: 'Finance', color: null } },
        ],
      });
      prisma.project.findMany
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([
          {
            id: PROJ_A,
            startDate: new Date('2025-03-01'),
            arbitrationStatus: null,
            arbitrationMetierStatus: null,
            arbitrationComiteStatus: null,
            arbitrationCodirStatus: null,
            businessProblem: null,
            sponsor: null,
            teamMembers: [],
          },
        ]);

      const result = await service.getPortfolioGantt(clientId, {});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.tags).toEqual([
        { id: TAG_A, name: 'Ops', color: '#aabbcc' },
        { id: TAG_B, name: 'Finance', color: null },
      ]);
    });
  });

  describe('getById — dernière modification auditée', () => {
    it('expose lastModifiedAt et lastModifiedByDisplayName depuis audit_logs', async () => {
      const modifiedAt = new Date('2026-06-19T11:50:00.000Z');
      prisma.project.findFirst.mockResolvedValue(withInclude(baseProject()));
      prisma.auditLog.findFirst.mockResolvedValue({
        createdAt: modifiedAt,
        user: { firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' },
      });

      const result = await service.getById(clientId, projectId);

      expect(prisma.auditLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId,
            resourceId: projectId,
            resourceType: { in: ['project', 'Project'] },
          }),
        }),
      );
      expect(result.lastModifiedAt).toBe(modifiedAt.toISOString());
      expect(result.lastModifiedByDisplayName).toBe('Jean Dupont');
    });

    it('retourne null si aucun audit projet', async () => {
      prisma.project.findFirst.mockResolvedValue(withInclude(baseProject()));
      prisma.auditLog.findFirst.mockResolvedValue(null);

      const result = await service.getById(clientId, projectId);

      expect(result.lastModifiedAt).toBeNull();
      expect(result.lastModifiedByDisplayName).toBeNull();
    });
  });
});
