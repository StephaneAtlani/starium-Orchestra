import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { MeService } from './me.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MeService', () => {
  let service: MeService;
  let prisma: any;
  const securityLogs = { create: jest.fn() };
  const mfa = {
    getTwoFactorStatus: jest.fn(),
    startTotpEnrollment: jest.fn(),
    verifyTotpEnrollment: jest.fn(),
    disableTotp: jest.fn(),
  };
  const avatarStorage = {
    exists: jest.fn().mockReturnValue(false),
    write: jest.fn(),
    remove: jest.fn(),
    createReadStream: jest.fn(),
    dir: '/tmp',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      userEmailIdentity: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      clientUser: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      clientModule: {
        findMany: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as unknown as jest.Mocked<PrismaService>;
    service = new MeService(
      prisma,
      securityLogs as any,
      mfa as any,
      avatarStorage as any,
    );
  });

  describe('getProfile', () => {
    it('lève NotFoundException si user inexistant', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('retourne le profil si user trouvé', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        jobTitle: null,
        company: null,
        office: null,
        avatarMimeType: null,
        platformRole: null,
      } as any);

      const result = await service.getProfile('user-1');
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        department: null,
        jobTitle: null,
        company: null,
        office: null,
        hasAvatar: false,
        platformRole: null,
      });
    });

    it('retourne platformRole PLATFORM_ADMIN si défini', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        department: null,
        jobTitle: null,
        company: null,
        office: null,
        avatarMimeType: null,
        platformRole: 'PLATFORM_ADMIN',
      } as any);

      const result = await service.getProfile('admin-1');
      expect(result.platformRole).toBe('PLATFORM_ADMIN');
    });
  });

  describe('getClients', () => {
    it('mappe correctement les clients (id, name, slug, role, status, isDefault)', async () => {
      prisma.clientUser.findMany.mockResolvedValue([
        {
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
          isDefault: true,
          defaultEmailIdentityId: 'eid-1',
          defaultEmailIdentity: {
            id: 'eid-1',
            email: 'a@example.com',
            displayName: 'Travail',
            isVerified: true,
            isActive: true,
          },
          client: {
            id: 'client-1',
            name: 'Client Démo',
            slug: 'client-demo',
            budgetAccountingEnabled: true,
          },
        },
        {
          role: ClientUserRole.CLIENT_USER,
          status: ClientUserStatus.SUSPENDED,
          isDefault: false,
          defaultEmailIdentityId: null,
          defaultEmailIdentity: null,
          client: {
            id: 'client-2',
            name: 'Autre Client',
            slug: 'autre-client',
            budgetAccountingEnabled: false,
          },
        },
      ] as any);

      const result = await service.getClients('user-1');
      expect(result).toEqual([
        {
          id: 'client-1',
          name: 'Client Démo',
          slug: 'client-demo',
          budgetAccountingEnabled: true,
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
          isDefault: true,
          defaultEmailIdentityId: 'eid-1',
          defaultEmailIdentity: {
            id: 'eid-1',
            email: 'a@example.com',
            displayName: 'Travail',
            isVerified: true,
            isActive: true,
          },
        },
        {
          id: 'client-2',
          name: 'Autre Client',
          slug: 'autre-client',
          budgetAccountingEnabled: false,
          role: ClientUserRole.CLIENT_USER,
          status: ClientUserStatus.SUSPENDED,
          isDefault: false,
          defaultEmailIdentityId: null,
          defaultEmailIdentity: null,
        },
      ]);
    });

    it('ignore les ClientUser sans client associé', async () => {
      prisma.clientUser.findMany.mockResolvedValue([
        {
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
          isDefault: false,
          defaultEmailIdentityId: null,
          defaultEmailIdentity: null,
          client: null,
        },
      ] as any);

      const result = await service.getClients('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('deleteEmailIdentity', () => {
    it('lève NotFoundException si identité absente', async () => {
      prisma.userEmailIdentity.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteEmailIdentity('user-1', 'eid-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève ConflictException si identité utilisée comme défaut client', async () => {
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
      } as any);
      prisma.clientUser.count.mockResolvedValue(1);
      await expect(
        service.deleteEmailIdentity('user-1', 'eid-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.userEmailIdentity.delete).not.toHaveBeenCalled();
    });
  });

  describe('setDefaultEmailIdentityForClient', () => {
    it('lève ForbiddenException si le client n’est pas accessible', async () => {
      prisma.clientUser.findUnique.mockResolvedValue(null);
      await expect(
        service.setDefaultEmailIdentityForClient('user-1', 'c-1', {
          emailIdentityId: 'eid-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lève BadRequestException si l’identité est inactive', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clientId: 'c-1',
      } as any);
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        isActive: false,
      } as any);
      await expect(
        service.setDefaultEmailIdentityForClient('user-1', 'c-1', {
          emailIdentityId: 'eid-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('met à jour le ClientUser et retourne success', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clientId: 'c-1',
      } as any);
      prisma.userEmailIdentity.findFirst.mockResolvedValue({
        id: 'eid-1',
        userId: 'user-1',
        isActive: true,
      } as any);
      prisma.clientUser.update.mockResolvedValue({} as any);

      const result = await service.setDefaultEmailIdentityForClient('user-1', 'c-1', {
        emailIdentityId: 'eid-1',
      });
      expect(result).toEqual({
        success: true,
        clientId: 'c-1',
        defaultEmailIdentityId: 'eid-1',
      });
      expect(prisma.clientUser.update).toHaveBeenCalledWith({
        where: { id: 'cu-1' },
        data: { defaultEmailIdentityId: 'eid-1' },
      });
    });
  });

  describe('setDefaultClient', () => {
    it('met à jour le client par défaut et retourne success', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clientId: 'client-2',
        status: ClientUserStatus.ACTIVE,
      });
      prisma.clientUser.updateMany.mockResolvedValue({ count: 2 });
      prisma.clientUser.update.mockResolvedValue({});

      const result = await service.setDefaultClient('user-1', 'client-2');
      expect(result).toEqual({ success: true, defaultClientId: 'client-2' });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.clientUser.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isDefault: false },
      });
      expect(prisma.clientUser.update).toHaveBeenCalledWith({
        where: { id: 'cu-1' },
        data: { isDefault: true },
      });
    });

    it('lève ForbiddenException si le client n’appartient pas au user', async () => {
      prisma.clientUser.findUnique.mockResolvedValue(null);

      await expect(
        service.setDefaultClient('user-1', 'client-other'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si le rattachement n’est pas ACTIVE', async () => {
      prisma.clientUser.findUnique.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clientId: 'client-2',
        status: ClientUserStatus.SUSPENDED,
      });

      await expect(
        service.setDefaultClient('user-1', 'client-2'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getPermissionCodes', () => {
    it('retourne les codes si module plateforme actif et ClientModule ENABLED', async () => {
      prisma.clientModule.findMany.mockResolvedValue([{ moduleId: 'm-budgets' }]);
      prisma.userRole.findMany.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  code: 'budgets.read',
                  moduleId: 'm-budgets',
                  module: { isActive: true },
                },
              },
            ],
          },
        },
      ] as any);

      const codes = await service.getPermissionCodes('user-1', 'client-1');
      expect(codes).toEqual(['budgets.read']);
    });

    it('exclut si Module.isActive est false', async () => {
      prisma.clientModule.findMany.mockResolvedValue([{ moduleId: 'm-x' }]);
      prisma.userRole.findMany.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  code: 'x.read',
                  moduleId: 'm-x',
                  module: { isActive: false },
                },
              },
            ],
          },
        },
      ] as any);

      const codes = await service.getPermissionCodes('user-1', 'client-1');
      expect(codes).toEqual([]);
    });

    it('exclut si aucun ClientModule ENABLED pour ce module', async () => {
      prisma.clientModule.findMany.mockResolvedValue([]);
      prisma.userRole.findMany.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              {
                permission: {
                  code: 'budgets.read',
                  moduleId: 'm-budgets',
                  module: { isActive: true },
                },
              },
            ],
          },
        },
      ] as any);

      const codes = await service.getPermissionCodes('user-1', 'client-1');
      expect(codes).toEqual([]);
    });
  });
});

