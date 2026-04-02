import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { DefaultProfilesService } from '../roles/default-profiles.service';
import { ClientsService } from './clients.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectTeamService } from '../projects/project-team.service';
import { ResourcesModuleBootstrapService } from '../resources/resources-module-bootstrap.service';
import { RiskTaxonomyService } from '../risk-taxonomy/risk-taxonomy.service';
import { ActivityTypesService } from '../activity-types/activity-types.service';

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
            module: {
              findMany: jest.fn(),
            },
            clientModule: {
              createMany: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: DefaultProfilesService,
          useValue: {
            applyForClient: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ProjectTeamService,
          useValue: {
            seedDefaultRolesForClient: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ResourcesModuleBootstrapService,
          useValue: {
            bootstrapForClient: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: RiskTaxonomyService,
          useValue: {
            ensureForClient: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ActivityTypesService,
          useValue: {
            ensureDefaultsForClient: jest.fn().mockResolvedValue(undefined),
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
    it('should create client when slug is free and apply default profiles', async () => {
      const defaultProfiles = {
        applyForClient: jest.fn().mockResolvedValue(undefined),
      };
      const riskTaxonomy = { ensureForClient: jest.fn().mockResolvedValue(undefined) };
      const activityTypes = {
        ensureDefaultsForClient: jest.fn().mockResolvedValue(undefined),
      };
      const testModule = await Test.createTestingModule({
        providers: [
          ClientsService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuditLogsService, useValue: { create: jest.fn() } },
          { provide: DefaultProfilesService, useValue: defaultProfiles },
          {
            provide: ProjectTeamService,
            useValue: { seedDefaultRolesForClient: jest.fn().mockResolvedValue(undefined) },
          },
          {
            provide: ResourcesModuleBootstrapService,
            useValue: { bootstrapForClient: jest.fn().mockResolvedValue(undefined) },
          },
          { provide: RiskTaxonomyService, useValue: riskTaxonomy },
          { provide: ActivityTypesService, useValue: activityTypes },
        ],
      }).compile();
      const svc = testModule.get<ClientsService>(ClientsService);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.client.create as jest.Mock).mockResolvedValue(mockClient);
      (prisma as any).module.findMany.mockResolvedValue([{ id: 'module-1' }]);
      (prisma as any).clientModule.createMany.mockResolvedValue({ count: 1 });

      const dto = { name: 'Client démo', slug: 'demo' };
      const result = await svc.create(dto);

      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { slug: dto.slug },
      });
      expect(prisma.client.create).toHaveBeenCalledWith({
        data: { name: dto.name, slug: dto.slug },
      });
      expect(defaultProfiles.applyForClient).toHaveBeenCalledWith(mockClient.id);
      expect((prisma as any).module.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true },
      });
      expect((prisma as any).clientModule.createMany).toHaveBeenCalledWith({
        data: [{ clientId: mockClient.id, moduleId: 'module-1', status: 'ENABLED' }],
        skipDuplicates: true,
      });
      const projectTeam = testModule.get(ProjectTeamService);
      expect(projectTeam.seedDefaultRolesForClient).toHaveBeenCalledWith(mockClient.id);
      const resourcesBootstrap = testModule.get(ResourcesModuleBootstrapService);
      expect(resourcesBootstrap.bootstrapForClient).toHaveBeenCalledWith(
        mockClient.id,
      );
      expect(riskTaxonomy.ensureForClient).toHaveBeenCalledWith(mockClient.id);
      expect(activityTypes.ensureDefaultsForClient).toHaveBeenCalledWith(
        mockClient.id,
      );
      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
        slug: mockClient.slug,
      });
    });

    it('should throw ConflictException when slug already exists', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        service.create({
          name: 'Other',
          slug: mockClient.slug,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('should rollback client when bootstrap fails', async () => {
      const defaultProfiles = {
        applyForClient: jest
          .fn()
          .mockRejectedValue(new Error('missing permissions')),
      };
      const testModule = await Test.createTestingModule({
        providers: [
          ClientsService,
          { provide: PrismaService, useValue: prisma },
          { provide: AuditLogsService, useValue: { create: jest.fn() } },
          { provide: DefaultProfilesService, useValue: defaultProfiles },
          {
            provide: ProjectTeamService,
            useValue: { seedDefaultRolesForClient: jest.fn().mockResolvedValue(undefined) },
          },
          {
            provide: ResourcesModuleBootstrapService,
            useValue: { bootstrapForClient: jest.fn().mockResolvedValue(undefined) },
          },
          {
            provide: RiskTaxonomyService,
            useValue: { ensureForClient: jest.fn().mockResolvedValue(undefined) },
          },
          {
            provide: ActivityTypesService,
            useValue: {
              ensureDefaultsForClient: jest.fn().mockResolvedValue(undefined),
            },
          },
        ],
      }).compile();
      const svc = testModule.get<ClientsService>(ClientsService);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.client.create as jest.Mock).mockResolvedValue(mockClient);
      (prisma.client.delete as jest.Mock).mockResolvedValue(undefined);
      (prisma as any).module.findMany.mockResolvedValue([{ id: 'module-1' }]);
      (prisma as any).clientModule.createMany.mockResolvedValue({ count: 1 });

      await expect(
        svc.create({ name: 'Client démo', slug: 'demo' }),
      ).rejects.toThrow('missing permissions');

      expect(prisma.client.delete).toHaveBeenCalledWith({
        where: { id: mockClient.id },
      });
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
