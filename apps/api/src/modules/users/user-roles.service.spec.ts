import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserStatus } from '@prisma/client';
import { UserRolesService } from './user-roles.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('UserRolesService', () => {
  let service: UserRolesService;
  let prisma: any;

  const clientId = 'client-1';
  const userId = 'user-1';

  beforeEach(() => {
    prisma = {
      userRole: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
      },
      clientUser: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const auditLogs: Partial<AuditLogsService> = {
      create: jest.fn(),
    };

    service = new UserRolesService(prisma, auditLogs as AuditLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureUserBelongsToClient (via comportement public)', () => {
    it('lève NotFoundException si aucun ClientUser ACTIVE', async () => {
      prisma.clientUser.findFirst.mockResolvedValue(null);

      await expect(
        (service as any).ensureUserBelongsToClient(clientId, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ne lève pas si un ClientUser ACTIVE existe', async () => {
      prisma.clientUser.findFirst.mockResolvedValue({
        id: 'cu-1',
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      });

      await expect(
        (service as any).ensureUserBelongsToClient(clientId, userId),
      ).resolves.toBeUndefined();
    });
  });

  describe('getUserRolesForClient', () => {
    it('retourne les rôles mappés pour le client', async () => {
      prisma.clientUser.findFirst.mockResolvedValue({
        id: 'cu-1',
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      });
      prisma.userRole.findMany.mockResolvedValue([
        {
          role: {
            id: 'role-1',
            name: 'R1',
            description: 'd1',
            isSystem: false,
          },
        },
      ]);

      const result = await service.getUserRolesForClient(clientId, userId);

      expect(prisma.userRole.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          role: { clientId },
        },
        include: {
          role: true,
        },
        orderBy: {
          role: { name: 'asc' },
        },
      });
      expect(result).toEqual([
        {
          id: 'role-1',
          name: 'R1',
          description: 'd1',
          isSystem: false,
        },
      ]);
    });
  });

  describe('replaceUserRolesForClient', () => {
    const dto = { roleIds: ['role-1', 'role-2'] };

    it('lève BadRequestException si certains rôles ne sont pas dans le client', async () => {
      prisma.clientUser.findFirst.mockResolvedValue({
        id: 'cu-1',
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      });
      prisma.role.findMany.mockResolvedValueOnce([
        { id: 'role-1' },
      ]); // seulement un rôle autorisé

      await expect(
        service.replaceUserRolesForClient(clientId, userId, dto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('remplace les rôles pour le client actif', async () => {
      prisma.clientUser.findFirst.mockResolvedValue({
        id: 'cu-1',
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      });
      // premier findMany: rôles autorisés parmi dto.roleIds
      prisma.role.findMany
        .mockResolvedValueOnce([
          { id: 'role-1' },
          { id: 'role-2' },
        ])
        // second findMany: tous les rôles du client
        .mockResolvedValueOnce([
          { id: 'role-1' },
          { id: 'role-2' },
          { id: 'role-3' },
        ]);

      const txMock = {
        userRole: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(txMock);
      });

      const result = await service.replaceUserRolesForClient(
        clientId,
        userId,
        dto,
      );

      // suppression des rôles existants dans le client
      expect(txMock.userRole.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          roleId: { in: expect.arrayContaining(['role-1', 'role-2', 'role-3']) },
        },
      });

      // création des nouveaux liens pour ce client
      expect(txMock.userRole.createMany).toHaveBeenCalledWith({
        data: dto.roleIds.map((roleId) => ({
          userId,
          roleId,
        })),
      });

      expect(result).toEqual({ userId, roleIds: dto.roleIds });
    });
  });
});

