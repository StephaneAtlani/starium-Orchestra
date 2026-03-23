import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectTeamRoleSystemKind } from '@prisma/client';
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
      project: { findFirst: jest.fn(), update: jest.fn() },
      clientUser: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          projectTeamMember: prisma.projectTeamMember,
          projectTeamRole: prisma.projectTeamRole,
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
});
