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
    projectTeamRaci: {
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
      projectTeamRaci: {
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
          projectTeamRaci: prisma.projectTeamRaci,
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
    it('propose des valeurs par défaut non persistées', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectTeamRole.findFirst
        .mockResolvedValueOnce({ id: 'r-sponsor' })
        .mockResolvedValueOnce({ id: 'r-owner' })
        .mockResolvedValueOnce({ id: 'r-metier' });
      prisma.projectTeamRole.findMany.mockResolvedValue([
        {
          id: 'r-sponsor',
          name: 'Sponsor',
          sortOrder: 0,
          systemKind: ProjectTeamRoleSystemKind.SPONSOR,
        },
        {
          id: 'r-owner',
          name: 'Responsable de projet',
          sortOrder: 1,
          systemKind: ProjectTeamRoleSystemKind.OWNER,
        },
        {
          id: 'r-metier',
          name: 'Référent métier',
          sortOrder: 2,
          systemKind: null,
        },
      ]);
      prisma.projectTeamRaci.findMany.mockResolvedValue([]);

      const rows = await service.getRaciMatrix(clientId, projectId);

      expect(rows).toEqual([
        expect.objectContaining({
          roleId: 'r-sponsor',
          kinds: [ProjectRaciKind.ACCOUNTABLE],
          persisted: false,
        }),
        expect.objectContaining({
          roleId: 'r-owner',
          kinds: [ProjectRaciKind.RESPONSIBLE],
          persisted: false,
        }),
        expect.objectContaining({
          roleId: 'r-metier',
          kinds: [ProjectRaciKind.CONSULTED],
          persisted: false,
        }),
      ]);
    });
  });

  describe('setRoleRaci', () => {
    it('retire le A des autres rôles lors de l’activation', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectTeamRole.findFirst.mockResolvedValue({
        id: roleId,
        clientId,
        name: 'Sponsor',
        systemKind: ProjectTeamRoleSystemKind.SPONSOR,
      });
      prisma.projectTeamRaci.deleteMany.mockResolvedValue({ count: 1 });
      prisma.projectTeamRaci.upsert.mockResolvedValue({});
      prisma.projectTeamRole.findMany.mockResolvedValue([
        {
          id: roleId,
          name: 'Sponsor',
          sortOrder: 0,
          systemKind: ProjectTeamRoleSystemKind.SPONSOR,
        },
      ]);
      prisma.projectTeamRaci.findMany.mockResolvedValue([
        {
          roleId,
          kind: ProjectRaciKind.ACCOUNTABLE,
        },
      ]);

      await service.setRoleRaci(
        clientId,
        projectId,
        roleId,
        ProjectRaciKind.ACCOUNTABLE,
        true,
      );

      expect(prisma.projectTeamRaci.deleteMany).toHaveBeenCalledWith({
        where: {
          clientId,
          projectId,
          kind: ProjectRaciKind.ACCOUNTABLE,
          roleId: { not: roleId },
        },
      });
      expect(prisma.projectTeamRaci.upsert).toHaveBeenCalled();
    });
  });
});
