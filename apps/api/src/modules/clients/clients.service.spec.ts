import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: PrismaService;

  const mockClient = {
    id: 'client-1',
    name: 'Client démo',
    slug: 'demo',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockUser = {
    id: 'user-1',
    email: 'admin@test.fr',
    passwordHash: 'hash',
    firstName: 'Admin',
    lastName: 'User',
    isPlatformAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockClientUser = {
    id: 'cu-1',
    userId: mockUser.id,
    clientId: mockClient.id,
    role: ClientUserRole.CLIENT_ADMIN,
    status: ClientUserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const txMock = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    client: { findUnique: jest.fn(), create: jest.fn() },
    clientUser: { findUnique: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            clientUser: { findUnique: jest.fn(), create: jest.fn() },
            user: { findUnique: jest.fn(), create: jest.fn() },
            $transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) =>
              cb(txMock),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all clients sorted by createdAt desc', async () => {
      (prisma.client.findMany as jest.Mock).mockResolvedValue([mockClient]);
      const result = await service.findAll();
      expect(prisma.client.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockClient.id);
      expect(result[0].name).toBe(mockClient.name);
      expect(result[0].slug).toBe(mockClient.slug);
    });
  });

  describe('create', () => {
    it('should create client and ClientUser when admin email exists', async () => {
      (txMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (txMock.client.findUnique as jest.Mock).mockResolvedValue(null);
      (txMock.client.create as jest.Mock).mockResolvedValue(mockClient);
      (txMock.clientUser.findUnique as jest.Mock).mockResolvedValue(null);
      (txMock.clientUser.create as jest.Mock).mockResolvedValue(mockClientUser);

      const dto = {
        name: 'Client démo',
        slug: 'demo',
        adminEmail: mockUser.email,
      };
      const result = await service.create(dto);

      expect(txMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.adminEmail },
      });
      expect(txMock.user.create).not.toHaveBeenCalled();
      expect(txMock.client.create).toHaveBeenCalledWith({
        data: { name: dto.name, slug: dto.slug },
      });
      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
        slug: mockClient.slug,
      });
    });

    it('should create User, Client and ClientUser when admin email is new and adminPassword provided', async () => {
      const newUser = { ...mockUser, id: 'user-2', email: 'new@test.fr' };
      (txMock.user.findUnique as jest.Mock).mockResolvedValue(null);
      (txMock.user.create as jest.Mock).mockResolvedValue(newUser);
      (txMock.client.findUnique as jest.Mock).mockResolvedValue(null);
      (txMock.client.create as jest.Mock).mockResolvedValue(mockClient);
      (txMock.clientUser.findUnique as jest.Mock).mockResolvedValue(null);
      (txMock.clientUser.create as jest.Mock).mockResolvedValue(mockClientUser);

      const dto = {
        name: 'New Client',
        slug: 'new-client',
        adminEmail: newUser.email,
        adminPassword: 'password12',
      };
      const result = await service.create(dto);

      expect(txMock.user.create).toHaveBeenCalled();
      expect(txMock.client.create).toHaveBeenCalled();
      expect(txMock.clientUser.create).toHaveBeenCalledWith({
        data: {
          userId: newUser.id,
          clientId: mockClient.id,
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
        },
      });
      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
        slug: mockClient.slug,
      });
    });

    it('should throw BadRequestException when admin email unknown and no adminPassword', async () => {
      (txMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          name: 'X',
          slug: 'x',
          adminEmail: 'unknown@test.fr',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(txMock.client.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when slug already exists', async () => {
      (txMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (txMock.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        service.create({
          name: 'Other',
          slug: mockClient.slug,
          adminEmail: mockUser.email,
        }),
      ).rejects.toThrow(ConflictException);
      expect(txMock.client.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when admin already linked to this client', async () => {
      (txMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (txMock.client.findUnique as jest.Mock).mockResolvedValue(null);
      (txMock.client.create as jest.Mock).mockResolvedValue(mockClient);
      (txMock.clientUser.findUnique as jest.Mock).mockResolvedValue(
        mockClientUser,
      );

      await expect(
        service.create({
          name: mockClient.name,
          slug: mockClient.slug,
          adminEmail: mockUser.email,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update client and return { id, name, slug }', async () => {
      const updated = {
        ...mockClient,
        name: 'Updated Name',
        slug: 'updated-slug',
      };
      (prisma.client.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockClient)
        .mockResolvedValueOnce(updated);
      (prisma.client.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(mockClient.id, {
        name: 'Updated Name',
        slug: 'updated-slug',
      });

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: mockClient.id },
        data: { name: 'Updated Name', slug: 'updated-slug' },
      });
      expect(result).toEqual({
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
      });
    });

    it('should throw ConflictException when slug taken by another client', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);
      (prisma.client.findFirst as jest.Mock).mockResolvedValue({
        id: 'other-id',
        slug: 'other-slug',
      });

      await expect(
        service.update(mockClient.id, { slug: 'other-slug' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.client.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when client does not exist', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('unknown-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete client (ClientUser cascade, User never deleted)', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);
      (prisma.client.delete as jest.Mock).mockResolvedValue(undefined);

      await service.remove(mockClient.id);

      expect(prisma.client.delete).toHaveBeenCalledWith({
        where: { id: mockClient.id },
      });
    });

    it('should throw NotFoundException when client does not exist', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.client.delete).not.toHaveBeenCalled();
    });
  });
});
