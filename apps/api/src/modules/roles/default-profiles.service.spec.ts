import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { DefaultProfilesService } from './default-profiles.service';

describe('DefaultProfilesService', () => {
  let service: DefaultProfilesService;
  const prismaMock = {
    permission: { findMany: jest.fn() },
    role: { findFirst: jest.fn(), create: jest.fn() },
    rolePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DefaultProfilesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get<DefaultProfilesService>(DefaultProfilesService);
    jest.clearAllMocks();
  });

  it('throws when required permissions are missing', async () => {
    jest.spyOn(service, 'getProfilesDefinition').mockReturnValue([
      {
        name: 'Role A',
        description: 'Desc',
        permissionCodes: ['projects.read', 'projects.create'],
      },
    ]);
    prismaMock.permission.findMany.mockResolvedValue([
      { id: 'perm-1', code: 'projects.read' },
    ]);

    await expect(service.applyForClient('client-1')).rejects.toThrow(
      InternalServerErrorException,
    );

    expect(prismaMock.role.create).not.toHaveBeenCalled();
    expect(prismaMock.rolePermission.createMany).not.toHaveBeenCalled();
  });

  it('creates role permissions when all required permissions exist', async () => {
    jest.spyOn(service, 'getProfilesDefinition').mockReturnValue([
      {
        name: 'Role A',
        description: 'Desc',
        permissionCodes: ['projects.read', 'projects.create'],
      },
    ]);
    prismaMock.permission.findMany.mockResolvedValue([
      { id: 'perm-1', code: 'projects.read' },
      { id: 'perm-2', code: 'projects.create' },
    ]);
    prismaMock.role.findFirst.mockResolvedValue(null);
    prismaMock.role.create.mockResolvedValue({ id: 'role-1' });
    prismaMock.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.rolePermission.createMany.mockResolvedValue({ count: 2 });
    prismaMock.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );

    await service.applyForClient('client-1');

    expect(prismaMock.role.create).toHaveBeenCalledWith({
      data: {
        clientId: 'client-1',
        name: 'Role A',
        description: 'Desc',
        isSystem: true,
      },
    });
    expect(prismaMock.rolePermission.createMany).toHaveBeenCalledWith({
      data: [
        { roleId: 'role-1', permissionId: 'perm-1' },
        { roleId: 'role-1', permissionId: 'perm-2' },
      ],
    });
  });
});
