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
    service = new ProjectsService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      pilotage as ProjectsPilotageService,
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
});
