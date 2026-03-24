import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { DefaultProfilesService } from './default-profiles.service';

describe('DefaultProfilesService', () => {
  let service: DefaultProfilesService;
  const prismaMock = {
    permission: { findMany: jest.fn() },
    role: { findFirst: jest.fn(), create: jest.fn() },
    rolePermission: { createMany: jest.fn() },
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

  it('n’effectue plus de création de rôles client par défaut', async () => {
    await service.applyForClient('client-1');

    expect(prismaMock.permission.findMany).not.toHaveBeenCalled();
    expect(prismaMock.role.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.role.create).not.toHaveBeenCalled();
    expect(prismaMock.rolePermission.createMany).not.toHaveBeenCalled();
  });
});
