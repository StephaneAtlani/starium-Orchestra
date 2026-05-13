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
    };
  }

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
      $transaction: jest.fn(async (callback) => callback(prisma)),
      clientUser: { findFirst: jest.fn(), findMany: jest.fn() },
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
});
