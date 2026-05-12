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
            patchHumanResourceLinkForClientMember: jest.fn(),
            getClientMemberForClient: jest.fn(),
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
        humanResourceSummary: null,
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

  describe('patchHumanResourceLink', () => {
    it('should validate client then patch and return member', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-1' });
      const member = {
        id: 'user-1',
        email: 'a@test.fr',
        firstName: 'A',
        lastName: 'User',
        role: 'CLIENT_USER',
        status: 'ACTIVE',
        licenseType: 'READ_ONLY',
        licenseBillingMode: 'NON_BILLABLE',
        subscriptionId: null,
        licenseStartsAt: null,
        licenseEndsAt: null,
        licenseAssignmentReason: null,
        excludeFromResourceCatalog: false,
        humanResourceSummary: {
          resourceId: 'chumanresddddddddddddddddd',
          displayName: 'Test — t@test.fr',
          email: 't@test.fr',
        },
        isDirectorySynced: false,
        isDirectoryLocked: false,
      };
      usersService.patchHumanResourceLinkForClientMember.mockResolvedValue(undefined);
      usersService.getClientMemberForClient.mockResolvedValue(member as never);

      const dto = { humanResourceId: 'chumanresddddddddddddddddd' as string | null };
      const result = await controller.patchHumanResourceLink(
        'client-1',
        'user-1',
        dto,
        'actor-1',
        {},
      );

      expect(usersService.patchHumanResourceLinkForClientMember).toHaveBeenCalledWith(
        'client-1',
        'user-1',
        'chumanresddddddddddddddddd',
        { actorUserId: 'actor-1', meta: {} },
      );
      expect(usersService.getClientMemberForClient).toHaveBeenCalledWith('client-1', 'user-1');
      expect(result).toEqual(member);
    });

    it('should 404 when client missing on PATCH', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(
        controller.patchHumanResourceLink('missing', 'user-1', {}, undefined, {}),
      ).rejects.toThrow(NotFoundException);
      expect(usersService.patchHumanResourceLinkForClientMember).not.toHaveBeenCalled();
    });
  });
});
