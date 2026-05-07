import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import 'reflect-metadata';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformClientUsersController } from './platform-client-users.controller';
import { UsersService } from './users.service';

describe('PlatformClientUsersController', () => {
  let controller: PlatformClientUsersController;
  let usersService: jest.Mocked<UsersService>;
  let prisma: { client: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      client: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformClientUsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get(PlatformClientUsersController);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should be protected by JwtAuthGuard and PlatformAdminGuard only (no ActiveClientGuard)', () => {
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', PlatformClientUsersController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(PlatformAdminGuard);
    const names = guards
      .map((g) => (typeof g === 'function' ? g.name : ''))
      .filter(Boolean);
    expect(names).not.toContain('ActiveClientGuard');
  });

  it('should validate client existence then delegate to UsersService.findAll with same shape as GET /api/users', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
    const usersResponse = [
      {
        id: 'user-1',
        email: 'a@test.fr',
        firstName: 'A',
        lastName: 'User',
        role: 'CLIENT_USER',
        status: 'ACTIVE',
        licenseType: 'READ_WRITE',
        licenseBillingMode: 'EVALUATION',
        subscriptionId: null,
        licenseStartsAt: '2026-01-01T00:00:00.000Z',
        licenseEndsAt: '2026-01-31T00:00:00.000Z',
        licenseAssignmentReason: 'POC',
        excludeFromResourceCatalog: false,
        isDirectorySynced: false,
        isDirectoryLocked: false,
      },
    ];
    usersService.findAll.mockResolvedValue(usersResponse as never);

    const result = await controller.listClientUsers('client-1');

    expect(prisma.client.findUnique).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      select: { id: true },
    });
    expect(usersService.findAll).toHaveBeenCalledWith('client-1');
    expect(result).toBe(usersResponse);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        email: expect.any(String),
        licenseType: expect.any(String),
        licenseBillingMode: expect.any(String),
        licenseStartsAt: expect.any(String),
        licenseEndsAt: expect.any(String),
        licenseAssignmentReason: expect.any(String),
      }),
    );
  });

  it('should 404 when clientId does not exist', async () => {
    prisma.client.findUnique.mockResolvedValue(null);
    await expect(controller.listClientUsers('missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(usersService.findAll).not.toHaveBeenCalled();
  });
});
