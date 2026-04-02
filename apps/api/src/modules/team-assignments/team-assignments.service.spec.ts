import { Test } from '@nestjs/testing';
import {
  ActivityTaxonomyKind,
  CollaboratorStatus,
  Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TeamAssignmentsService } from './team-assignments.service';

describe('TeamAssignmentsService', () => {
  let service: TeamAssignmentsService;
  let auditCreate: jest.Mock;
  let tra: {
    count: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let collaboratorMock: { findFirst: jest.Mock };
  let projectMock: { findFirst: jest.Mock };
  let activityTypeMock: { findFirst: jest.Mock };
  let projectTeamRoleMock: { findFirst: jest.Mock };
  let prisma: PrismaService & { $transaction: jest.Mock };

  beforeEach(async () => {
    auditCreate = jest.fn();
    tra = {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    collaboratorMock = { findFirst: jest.fn() };
    projectMock = { findFirst: jest.fn() };
    activityTypeMock = { findFirst: jest.fn() };
    projectTeamRoleMock = { findFirst: jest.fn() };

    prisma = {
      teamResourceAssignment: tra,
      collaborator: collaboratorMock,
      project: projectMock,
      activityType: activityTypeMock,
      projectTeamRole: projectTeamRoleMock,
      $transaction: jest.fn((arg: unknown) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg as Promise<unknown>[]);
        }
        return Promise.resolve(arg);
      }),
    } as unknown as PrismaService & { $transaction: jest.Mock };

    const module = await Test.createTestingModule({
      providers: [
        TeamAssignmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: auditCreate } },
      ],
    }).compile();

    service = module.get(TeamAssignmentsService);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('exclude les annulées par défaut (includeCancelled=false)', async () => {
      tra.count.mockResolvedValue(0);
      tra.findMany.mockResolvedValue([]);
      await service.list('c1', {
        includeCancelled: false,
      } as Parameters<TeamAssignmentsService['list']>[1]);
      expect(tra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'c1',
            cancelledAt: null,
          }),
        }),
      );
    });

    it('inclut les annulées si includeCancelled=true', async () => {
      tra.count.mockResolvedValue(0);
      tra.findMany.mockResolvedValue([]);
      await service.list('c1', {
        includeCancelled: true,
      } as Parameters<TeamAssignmentsService['list']>[1]);
      const call = tra.findMany.mock.calls[0][0] as {
        where: Prisma.TeamResourceAssignmentWhereInput;
      };
      expect(call.where.cancelledAt).toBeUndefined();
    });

    it('400 si activeOn combiné avec from', async () => {
      await expect(
        service.list('c1', {
          activeOn: '2026-04-15',
          from: '2026-04-01',
          to: '2026-04-30',
        } as Parameters<TeamAssignmentsService['list']>[1]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('400 si from sans to', async () => {
      await expect(
        service.list('c1', {
          from: '2026-04-01',
        } as Parameters<TeamAssignmentsService['list']>[1]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('400 si to sans from', async () => {
      await expect(
        service.list('c1', {
          to: '2026-04-30',
        } as Parameters<TeamAssignmentsService['list']>[1]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('400 si from > to', async () => {
      await expect(
        service.list('c1', {
          from: '2026-05-01',
          to: '2026-04-01',
        } as Parameters<TeamAssignmentsService['list']>[1]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create', () => {
    it('400 si projectId et activity kind !== PROJECT', async () => {
      collaboratorMock.findFirst.mockResolvedValue({
        id: 'col1',
        clientId: 'c1',
        status: CollaboratorStatus.ACTIVE,
      });
      activityTypeMock.findFirst.mockResolvedValue({
        id: 'at1',
        clientId: 'c1',
        kind: ActivityTaxonomyKind.RUN,
      });
      projectMock.findFirst.mockResolvedValue({ id: 'p1' });

      await expect(
        service.create(
          'c1',
          {
            collaboratorId: 'col1',
            projectId: 'p1',
            activityTypeId: 'at1',
            roleLabel: 'Dev',
            startDate: '2026-01-01T00:00:00.000Z',
            allocationPercent: 50,
          },
          undefined,
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('400 si pas de projectId et kind PROJECT', async () => {
      collaboratorMock.findFirst.mockResolvedValue({
        id: 'col1',
        clientId: 'c1',
        status: CollaboratorStatus.ACTIVE,
      });
      activityTypeMock.findFirst.mockResolvedValue({
        id: 'at1',
        clientId: 'c1',
        kind: ActivityTaxonomyKind.PROJECT,
      });

      await expect(
        service.create(
          'c1',
          {
            collaboratorId: 'col1',
            activityTypeId: 'at1',
            roleLabel: 'Dev',
            startDate: '2026-01-01T00:00:00.000Z',
            allocationPercent: 50,
          },
          undefined,
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('409 si affectation déjà annulée', async () => {
      tra.findFirst.mockResolvedValue({
        id: 'a1',
        clientId: 'c1',
        collaboratorId: 'col1',
        projectId: null,
        activityTypeId: 'at1',
        projectTeamRoleId: null,
        roleLabel: 'X',
        startDate: new Date(),
        endDate: null,
        allocationPercent: new Prisma.Decimal(50),
        notes: null,
        cancelledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        collaborator: { displayName: 'A' },
        project: null,
        activityType: { name: 'T', kind: ActivityTaxonomyKind.RUN },
      });

      await expect(
        service.update('c1', 'a1', { roleLabel: 'Y' }, undefined, undefined),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('cancel', () => {
    it('idempotent : pas d audit si déjà annulé', async () => {
      const cancelledAt = new Date('2026-01-10T12:00:00.000Z');
      tra.findFirst.mockResolvedValue({
        id: 'a1',
        clientId: 'c1',
        collaboratorId: 'col1',
        projectId: null,
        activityTypeId: 'at1',
        projectTeamRoleId: null,
        roleLabel: 'X',
        startDate: new Date(),
        endDate: null,
        allocationPercent: new Prisma.Decimal(50),
        notes: null,
        cancelledAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        collaborator: { displayName: 'A' },
        project: null,
        activityType: { name: 'T', kind: ActivityTaxonomyKind.RUN },
      });

      const res = await service.cancel('c1', 'a1', 'u1', {});
      expect(res.cancelledAt).toBe(cancelledAt.toISOString());
      expect(tra.update).not.toHaveBeenCalled();
      expect(auditCreate).not.toHaveBeenCalled();
    });

    it('audit une seule fois sur première annulation', async () => {
      tra.findFirst.mockResolvedValueOnce({
        id: 'a1',
        clientId: 'c1',
        collaboratorId: 'col1',
        projectId: null,
        activityTypeId: 'at1',
        projectTeamRoleId: null,
        roleLabel: 'X',
        startDate: new Date(),
        endDate: null,
        allocationPercent: new Prisma.Decimal(50),
        notes: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        collaborator: { displayName: 'A' },
        project: null,
        activityType: { name: 'T', kind: ActivityTaxonomyKind.RUN },
      });
      tra.update.mockResolvedValue({
        id: 'a1',
        clientId: 'c1',
        collaboratorId: 'col1',
        projectId: null,
        activityTypeId: 'at1',
        projectTeamRoleId: null,
        roleLabel: 'X',
        startDate: new Date(),
        endDate: null,
        allocationPercent: new Prisma.Decimal(50),
        notes: null,
        cancelledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        collaborator: { displayName: 'A' },
        project: null,
        activityType: { name: 'T', kind: ActivityTaxonomyKind.RUN },
      });

      await service.cancel('c1', 'a1', 'u1', {});
      expect(tra.update).toHaveBeenCalled();
      expect(auditCreate).toHaveBeenCalledTimes(1);
      expect(auditCreate.mock.calls[0][0].action).toBe(
        'team_resource_assignment.cancelled',
      );
    });
  });

  describe('ensureProjectInClient', () => {
    it('404 si projet absent', async () => {
      projectMock.findFirst.mockResolvedValue(null);
      await expect(
        service.ensureProjectInClient('c1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listForProject', () => {
    it('404 si projet absent', async () => {
      projectMock.findFirst.mockResolvedValue(null);
      await expect(
        service.listForProject('c1', 'p1', { includeCancelled: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('400 si projectId query ≠ path', async () => {
      projectMock.findFirst.mockResolvedValue({ id: 'p1' });
      await expect(
        service.listForProject('c1', 'p1', {
          includeCancelled: false,
          projectId: 'other-project-id',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('fusionne projectId du path dans la liste', async () => {
      projectMock.findFirst.mockResolvedValue({ id: 'p1' });
      tra.count.mockResolvedValue(0);
      tra.findMany.mockResolvedValue([]);
      await service.listForProject('c1', 'p1', { includeCancelled: false });
      expect(tra.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'c1',
            projectId: 'p1',
          }),
        }),
      );
    });
  });

  describe('getByIdForProject', () => {
    it('404 si affectation sur un autre projet', async () => {
      projectMock.findFirst.mockResolvedValue({ id: 'p1' });
      tra.findFirst.mockResolvedValue(null);
      await expect(
        service.getByIdForProject('c1', 'p1', 'a1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createForProject', () => {
    it('injecte projectId depuis le path dans create', async () => {
      projectMock.findFirst.mockResolvedValue({ id: 'p1' });
      const createSpy = jest
        .spyOn(service, 'create')
        .mockResolvedValue({} as Awaited<
          ReturnType<TeamAssignmentsService['create']>
        >);
      await service.createForProject(
        'c1',
        'p1',
        {
          collaboratorId: 'col1',
          activityTypeId: 'at1',
          roleLabel: 'R',
          startDate: '2026-01-01T00:00:00.000Z',
          allocationPercent: 50,
        },
        undefined,
        undefined,
      );
      expect(createSpy).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          projectId: 'p1',
          collaboratorId: 'col1',
        }),
        undefined,
        undefined,
      );
      createSpy.mockRestore();
    });
  });

  describe('cancelForProject', () => {
    it('404 si affectation sur un autre projet', async () => {
      projectMock.findFirst.mockResolvedValue({ id: 'p1' });
      tra.findFirst.mockResolvedValue(null);
      await expect(
        service.cancelForProject('c1', 'p1', 'a1', 'u1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('idempotent : même sémantique que cancel si déjà annulé', async () => {
      projectMock.findFirst.mockResolvedValue({ id: 'p1' });
      const cancelledAt = new Date('2026-01-10T12:00:00.000Z');
      const row = {
        id: 'a1',
        clientId: 'c1',
        collaboratorId: 'col1',
        projectId: 'p1',
        activityTypeId: 'at1',
        projectTeamRoleId: null,
        roleLabel: 'X',
        startDate: new Date(),
        endDate: null,
        allocationPercent: new Prisma.Decimal(50),
        notes: null,
        cancelledAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        collaborator: { displayName: 'A' },
        project: { name: 'P', code: 'PC' },
        activityType: { name: 'T', kind: ActivityTaxonomyKind.PROJECT },
      };
      tra.findFirst.mockResolvedValue(row);
      const res = await service.cancelForProject('c1', 'p1', 'a1', 'u1', {});
      expect(res.cancelledAt).toBe(cancelledAt.toISOString());
      expect(tra.update).not.toHaveBeenCalled();
      expect(auditCreate).not.toHaveBeenCalled();
    });
  });
});
