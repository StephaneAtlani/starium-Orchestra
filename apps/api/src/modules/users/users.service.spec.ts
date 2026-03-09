import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ActiveClientCacheService } from '../../common/cache/active-client-cache.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let activeClientCache: ActiveClientCacheService;

  const clientId = 'client-1';
  const mockUser = {
    id: 'user-1',
    email: 'existing@test.fr',
    passwordHash: 'hash',
    firstName: 'Jean',
    lastName: 'Dupont',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockClientUser = {
    id: 'cu-1',
    userId: mockUser.id,
    clientId,
    role: ClientUserRole.CLIENT_ADMIN,
    status: ClientUserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const activeClientCacheMock: Partial<ActiveClientCacheService> = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
            clientUser: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: ActiveClientCacheService,
          useValue: activeClientCacheMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    activeClientCache = module.get<ActiveClientCacheService>(
      ActiveClientCacheService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return only users of the client', async () => {
      (prisma.clientUser.findMany as jest.Mock).mockResolvedValue([
        { user: mockUser, role: ClientUserRole.CLIENT_ADMIN, status: ClientUserStatus.ACTIVE },
      ]);
      const result = await service.findAll(clientId);
      expect(prisma.clientUser.findMany).toHaveBeenCalledWith({
        where: { clientId },
        include: { user: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockUser.id);
      expect(result[0].email).toBe(mockUser.email);
      expect(result[0].role).toBe(ClientUserRole.CLIENT_ADMIN);
    });
  });

  describe('create', () => {
    it('should attach existing user and create ClientUser only', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.clientUser.create as jest.Mock).mockResolvedValue({
        ...mockClientUser,
        user: mockUser,
      });
      const result = await service.create(clientId, {
        email: mockUser.email,
        firstName: 'Other',
        lastName: 'Name',
        role: ClientUserRole.CLIENT_USER,
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.clientUser.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          clientId,
          role: ClientUserRole.CLIENT_USER,
          status: ClientUserStatus.ACTIVE,
        },
        include: { user: true },
      });
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw 400 when email exists and password is provided', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(clientId, {
          email: mockUser.email,
          role: ClientUserRole.CLIENT_USER,
          password: 'password12',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.clientUser.create).not.toHaveBeenCalled();
    });

    it('should throw 409 when user already linked to client', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue(mockClientUser);
      await expect(
        service.create(clientId, {
          email: mockUser.email,
          role: ClientUserRole.CLIENT_USER,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.clientUser.create).not.toHaveBeenCalled();
    });

    it('should create User and ClientUser when email does not exist', async () => {
      const newUser = { ...mockUser, id: 'user-2', email: 'new@test.fr' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(newUser);
      (prisma.clientUser.create as jest.Mock).mockResolvedValue({
        ...mockClientUser,
        userId: newUser.id,
        user: newUser,
      });
      const result = await service.create(clientId, {
        email: newUser.email,
        firstName: 'New',
        lastName: 'User',
        role: ClientUserRole.CLIENT_USER,
        password: 'password12',
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.clientUser.create).toHaveBeenCalled();
      expect(result.email).toBe(newUser.email);
    });

    it('should throw 400 when email unknown and password absent', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.create(clientId, {
          email: 'new@test.fr',
          role: ClientUserRole.CLIENT_USER,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update User and ClientUser in scope', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      const updatedClientUser = { ...mockClientUser, role: ClientUserRole.CLIENT_USER };
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser);
      (prisma.clientUser.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockClientUser)
        .mockResolvedValueOnce(updatedClientUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (prisma.clientUser.update as jest.Mock).mockResolvedValue(updatedClientUser);
      const result = await service.update(clientId, mockUser.id, {
        firstName: 'Updated',
        role: ClientUserRole.CLIENT_USER,
      });
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.clientUser.update).toHaveBeenCalled();
      expect(result.firstName).toBe('Updated');
      expect(result.role).toBe(ClientUserRole.CLIENT_USER);
    });

    it('should forbid demoting the last CLIENT_ADMIN for the client', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue(
        mockClientUser,
      );
      (prisma.clientUser.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.update(clientId, mockUser.id, {
          role: ClientUserRole.CLIENT_USER,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.clientUser.update).not.toHaveBeenCalled();
    });

    it('should throw 404 when user not in client', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update(clientId, mockUser.id, { firstName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete only ClientUser', async () => {
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue(
        mockClientUser,
      );
      (prisma.clientUser.count as jest.Mock).mockResolvedValue(2);
      (prisma.clientUser.delete as jest.Mock).mockResolvedValue(undefined);
      await service.remove(clientId, mockUser.id);
      expect(prisma.clientUser.delete).toHaveBeenCalledWith({
        where: { id: mockClientUser.id },
      });
    });

    it('should forbid deleting the last CLIENT_ADMIN for the client', async () => {
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue(
        mockClientUser,
      );
      (prisma.clientUser.count as jest.Mock).mockResolvedValue(1);

      await expect(service.remove(clientId, mockUser.id)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.clientUser.delete).not.toHaveBeenCalled();
    });

    it('should throw 404 when link does not exist', async () => {
      (prisma.clientUser.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.remove(clientId, mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
