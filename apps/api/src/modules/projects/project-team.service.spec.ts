import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRaciKind, ProjectTeamRoleSystemKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectTeamService } from './project-team.service';

describe('ProjectTeamService', () => {
  let service: ProjectTeamService;
  let prisma: {
    projectTeamRole: {
      count: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    projectTeamMember: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    projectRaciAction: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      delete: jest.Mock;
      aggregate: jest.Mock;
    };
    projectRaciCell: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      upsert: jest.Mock;
    };
    project: { findFirst: jest.Mock; update: jest.Mock };
    clientUser: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const clientId = 'c1';
  const projectId = 'p1';
  const roleId = 'r1';
  const userId = 'u1';

  beforeEach(async () => {
    prisma = {
      projectTeamRole: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      projectTeamMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      projectRaciAction: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
      },
      projectRaciCell: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        upsert: jest.fn(),
      },
      project: { findFirst: jest.fn(), update: jest.fn() },
      clientUser: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          projectTeamMember: prisma.projectTeamMember,
          projectTeamRole: prisma.projectTeamRole,
          projectRaciAction: prisma.projectRaciAction,
          projectRaciCell: prisma.projectRaciCell,
          project: prisma.project,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectTeamService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectTeamService>(ProjectTeamService);
    jest.clearAllMocks();
  });

  describe('ensureDefaultTeamRolesForClient', () => {
    it('crée Sponsor / Responsable / Référent si absents', async () => {
      prisma.projectTeamRole.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.projectTeamRole.create.mockResolvedValue({});

      await service.ensureDefaultTeamRolesForClient(clientId);

      expect(prisma.projectTeamRole.create).toHaveBeenCalledTimes(3);
      expect(prisma.projectTeamRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId,
          systemKind: ProjectTeamRoleSystemKind.SPONSOR,
          name: 'Sponsor',
        }),
      });
    });

    it('ne recrée pas les rôles système déjà présents', async () => {
      prisma.projectTeamRole.findFirst
        .mockResolvedValueOnce({ id: 'r1' })
        .mockResolvedValueOnce({ id: 'r2' })
        .mockResolvedValueOnce({ id: 'r3' });

      await service.ensureDefaultTeamRolesForClient(clientId);

      expect(prisma.projectTeamRole.create).not.toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('refuse si utilisateur pas actif sur le client', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectTeamRole.findFirst.mockResolvedValue({
        id: roleId,
        clientId,
        name: 'X',
        systemKind: null,
      });
      prisma.clientUser.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember(clientId, projectId, { roleId, userId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFound si projet inconnu', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.addMember(clientId, projectId, { roleId, userId }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTeam', () => {
    it('lève NotFound si projet inconnu', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.getTeam(clientId, projectId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRaciMatrix', () => {
    it('retourne actions, acteurs et cellules', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectTeamRole.findFirst
        .mockResolvedValueOnce({ id: 'r-sponsor' })
        .mockResolvedValueOnce({ id: 'r-owner' })
        .mockResolvedValueOnce({ id: 'r-metier' });
      prisma.projectRaciAction.count.mockResolvedValue(1);
      prisma.projectRaciAction.findMany.mockResolvedValue([
        { id: 'a1', label: 'Définition du projet', sortOrder: 0 },
      ]);
      prisma.projectTeamRole.findMany.mockResolvedValue([
        { id: 'r-sponsor', name: 'Sponsor', sortOrder: 0 },
        { id: 'r-owner', name: 'Responsable de projet', sortOrder: 1 },
      ]);
      prisma.projectRaciCell.findMany.mockResolvedValue([
        {
          actionId: 'a1',
          roleId: 'r-sponsor',
          kind: ProjectRaciKind.ACCOUNTABLE,
        },
      ]);

      const matrix = await service.getRaciMatrix(clientId, projectId);

      expect(matrix.actions).toHaveLength(1);
      expect(matrix.actors).toHaveLength(2);
      expect(matrix.cells).toEqual([
        {
          actionId: 'a1',
          roleId: 'r-sponsor',
          kind: ProjectRaciKind.ACCOUNTABLE,
        },
      ]);
    });

    it('amorce les actions par défaut si aucune', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectTeamRole.findFirst
        .mockResolvedValueOnce({ id: 'r1' })
        .mockResolvedValueOnce({ id: 'r2' })
        .mockResolvedValueOnce({ id: 'r3' });
      prisma.projectRaciAction.count.mockResolvedValue(0);
      prisma.projectRaciAction.createMany.mockResolvedValue({ count: 8 });
      prisma.projectRaciAction.findMany.mockResolvedValue([]);
      prisma.projectTeamRole.findMany.mockResolvedValue([]);
      prisma.projectRaciCell.findMany.mockResolvedValue([]);

      await service.getRaciMatrix(clientId, projectId);

      expect(prisma.projectRaciAction.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            clientId,
            projectId,
            label: 'Analyser les besoins internes',
          }),
        ]),
      });
    });
  });

  describe('setRaciCell', () => {
    it('upsert une cellule RACI', async () => {
      const actionId = 'a1';
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectRaciAction.findFirst.mockResolvedValue({ id: actionId });
      prisma.projectTeamRole.findFirst.mockResolvedValue({ id: roleId, clientId });
      prisma.projectRaciCell.upsert.mockResolvedValue({});
      prisma.projectRaciAction.count.mockResolvedValue(1);
      prisma.projectRaciAction.findMany.mockResolvedValue([]);
      prisma.projectTeamRole.findMany.mockResolvedValue([]);
      prisma.projectRaciCell.findMany.mockResolvedValue([]);

      await service.setRaciCell(
        clientId,
        projectId,
        actionId,
        roleId,
        ProjectRaciKind.RESPONSIBLE,
      );

      expect(prisma.projectRaciCell.upsert).toHaveBeenCalledWith({
        where: {
          projectId_actionId_roleId: { projectId, actionId, roleId },
        },
        create: {
          clientId,
          projectId,
          actionId,
          roleId,
          kind: ProjectRaciKind.RESPONSIBLE,
        },
        update: { kind: ProjectRaciKind.RESPONSIBLE },
      });
    });

    it('retire le A des autres acteurs sur la même action', async () => {
      const actionId = 'a1';
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectRaciAction.findFirst.mockResolvedValue({ id: actionId });
      prisma.projectTeamRole.findFirst.mockResolvedValue({ id: roleId, clientId });
      prisma.projectRaciCell.deleteMany.mockResolvedValue({ count: 1 });
      prisma.projectRaciCell.upsert.mockResolvedValue({});
      prisma.projectRaciAction.count.mockResolvedValue(1);
      prisma.projectRaciAction.findMany.mockResolvedValue([]);
      prisma.projectTeamRole.findMany.mockResolvedValue([]);
      prisma.projectRaciCell.findMany.mockResolvedValue([]);

      await service.setRaciCell(
        clientId,
        projectId,
        actionId,
        roleId,
        ProjectRaciKind.ACCOUNTABLE,
      );

      expect(prisma.projectRaciCell.deleteMany).toHaveBeenCalledWith({
        where: {
          clientId,
          projectId,
          actionId,
          kind: ProjectRaciKind.ACCOUNTABLE,
          roleId: { not: roleId },
        },
      });
      expect(prisma.projectRaciCell.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            roleId,
            kind: ProjectRaciKind.ACCOUNTABLE,
          }),
        }),
      );
    });

    it('efface la cellule quand kind est null', async () => {
      const actionId = 'a1';
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectRaciAction.findFirst.mockResolvedValue({ id: actionId });
      prisma.projectTeamRole.findFirst.mockResolvedValue({ id: roleId, clientId });
      prisma.projectRaciCell.deleteMany.mockResolvedValue({ count: 1 });
      prisma.projectRaciAction.count.mockResolvedValue(1);
      prisma.projectRaciAction.findMany.mockResolvedValue([]);
      prisma.projectTeamRole.findMany.mockResolvedValue([]);
      prisma.projectRaciCell.findMany.mockResolvedValue([]);

      await service.setRaciCell(clientId, projectId, actionId, roleId, null);

      expect(prisma.projectRaciCell.deleteMany).toHaveBeenCalledWith({
        where: { clientId, projectId, actionId, roleId },
      });
    });
  });
});
