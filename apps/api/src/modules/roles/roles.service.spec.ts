import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: any;

  const clientId = 'client-1';

  const roleRecord = {
    id: 'role-1',
    clientId,
    name: 'Responsable budgets',
    description: 'desc',
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      role: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const auditLogs: Partial<AuditLogsService> = {
      create: jest.fn(),
    };

    service = new RolesService(prisma, auditLogs as AuditLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listRoles', () => {
    it('retourne les rôles du client avec le bon select', async () => {
      prisma.role.findMany.mockResolvedValue([roleRecord]);

      const result = await service.listRoles(clientId);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { clientId },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          isSystem: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result[0].id).toBe(roleRecord.id);
      expect(result[0].isSystem).toBe(false);
    });
  });

  describe('createRole', () => {
    it('crée un rôle et renvoie un RoleItem', async () => {
      const ensureSpy = jest
        .spyOn<any, any>(service as any, 'ensureRoleNameUnique')
        .mockResolvedValue(undefined);
      prisma.role.create.mockResolvedValue(roleRecord);

      const result = await service.createRole(clientId, {
        name: roleRecord.name,
        description: roleRecord.description,
      });

      expect(ensureSpy).toHaveBeenCalledWith(clientId, roleRecord.name);
      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          clientId,
          name: roleRecord.name,
          description: roleRecord.description,
        },
      });
      expect(result).toEqual({
        id: roleRecord.id,
        name: roleRecord.name,
        description: roleRecord.description,
        isSystem: false,
        createdAt: roleRecord.createdAt,
        updatedAt: roleRecord.updatedAt,
      });
    });
  });

  describe('getRoleById', () => {
    it('lève NotFoundException si le rôle est absent dans le client', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.getRoleById(clientId, roleRecord.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('retourne le rôle si trouvé', async () => {
      prisma.role.findFirst.mockResolvedValue(roleRecord);

      const result = await service.getRoleById(clientId, roleRecord.id);
      expect(result.id).toBe(roleRecord.id);
      expect(result.name).toBe(roleRecord.name);
    });
  });

  describe('updateRole', () => {
    it('met à jour name/description et renvoie RoleItem', async () => {
      prisma.role.findFirst.mockResolvedValueOnce(roleRecord).mockResolvedValueOnce({
        ...roleRecord,
        name: 'Nouveau',
        description: 'Updated',
      });
      const ensureSpy = jest
        .spyOn<any, any>(service as any, 'ensureRoleNameUnique')
        .mockResolvedValue(undefined);
      prisma.role.update.mockResolvedValue({
        ...roleRecord,
        name: 'Nouveau',
        description: 'Updated',
      });

      const result = await service.updateRole(clientId, roleRecord.id, {
        name: 'Nouveau',
        description: 'Updated',
      });

      expect(ensureSpy).toHaveBeenCalledWith(clientId, 'Nouveau', roleRecord.id);
      expect(prisma.role.update).toHaveBeenCalled();
      expect(result.name).toBe('Nouveau');
      expect(result.description).toBe('Updated');
    });

    it('lève NotFoundException si le rôle est absent', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRole(clientId, 'unknown', { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteRole', () => {
    it('lève NotFoundException si absent', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteRole(clientId, 'unknown'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('lève ConflictException si isSystem', async () => {
      prisma.role.findFirst.mockResolvedValue({
        ...roleRecord,
        isSystem: true,
        userRoles: [],
      });

      await expect(
        service.deleteRole(clientId, roleRecord.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('lève ConflictException si encore assigné', async () => {
      prisma.role.findFirst.mockResolvedValue({
        ...roleRecord,
        isSystem: false,
        userRoles: [{ id: 'ur-1' }],
      });

      await expect(
        service.deleteRole(clientId, roleRecord.id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('supprime le rôle sinon', async () => {
      prisma.role.findFirst.mockResolvedValue({
        ...roleRecord,
        isSystem: false,
        userRoles: [],
      });
      prisma.role.delete.mockResolvedValue(undefined);

      await service.deleteRole(clientId, roleRecord.id);
      expect(prisma.role.delete).toHaveBeenCalledWith({
        where: { id: roleRecord.id },
      });
    });
  });

  describe('listPermissionsForClient', () => {
    it('filtre par modules activés et mappe correctement', async () => {
      prisma.permission.findMany.mockResolvedValue([
        {
          id: 'perm-1',
          code: 'budgets.read',
          label: 'Lecture budgets',
          description: 'desc',
          module: {
            code: 'budgets',
            name: 'Budgets',
          },
        },
      ]);

      const result = await service.listPermissionsForClient(clientId);

      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: {
          module: {
            isActive: true,
            clientModules: {
              some: { clientId, status: 'ENABLED' },
            },
          },
        },
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          label: true,
          description: true,
          module: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      });

      expect(result).toEqual([
        {
          id: 'perm-1',
          code: 'budgets.read',
          label: 'Lecture budgets',
          description: 'desc',
          moduleCode: 'budgets',
          moduleName: 'Budgets',
        },
      ]);
    });
  });

  describe('replaceRolePermissions', () => {
    const dto = { permissionIds: ['perm-1', 'perm-2'] };

    it('lève NotFoundException si le rôle est absent', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.replaceRolePermissions(clientId, roleRecord.id, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lève BadRequestException si certaines permissions sont invalides', async () => {
      prisma.role.findFirst.mockResolvedValue(roleRecord);
      prisma.permission.findMany.mockResolvedValue([
        { id: 'perm-1' },
      ]);

      await expect(
        service.replaceRolePermissions(clientId, roleRecord.id, dto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('remplace les permissions via une transaction', async () => {
      prisma.role.findFirst.mockResolvedValue(roleRecord);
      prisma.permission.findMany.mockResolvedValue([
        { id: 'perm-1' },
        { id: 'perm-2' },
      ]);

      const txMock = {
        rolePermission: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => {
        await cb(txMock);
      });

      const result = await service.replaceRolePermissions(
        clientId,
        roleRecord.id,
        dto,
      );

      expect(txMock.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: roleRecord.id },
      });
      expect(txMock.rolePermission.createMany).toHaveBeenCalledWith({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: roleRecord.id,
          permissionId,
        })),
      });
      expect(result.permissionIds).toEqual(dto.permissionIds);
      expect(result.role.id).toBe(roleRecord.id);
    });
  });
});

