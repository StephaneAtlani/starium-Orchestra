import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResourceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ResourcesService } from './resources.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let prisma: any;
  const auditLogs = { create: jest.fn() };

  beforeEach(() => {
    prisma = {
      resource: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      resourceRole: {
        findFirst: jest.fn(),
      },
      clientUser: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    service = new ResourcesService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  describe('assertResourceRoleForClient (via create)', () => {
    it('404 si roleId pointe vers un autre client', async () => {
      prisma.resourceRole.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          'c1',
          {
            name: 'Alice',
            type: ResourceType.HUMAN,
            roleId: 'rr-1',
          } as any,
          { name: 'Alice', type: 'HUMAN', roleId: 'rr-1' },
          { actorUserId: 'u1', meta: {} },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('validateTypeRules', () => {
    it('rejette email pour MATERIAL', async () => {
      prisma.resourceRole.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          'c1',
          {
            name: 'Srv',
            type: ResourceType.MATERIAL,
            email: 'a@b.com',
          } as any,
          { name: 'Srv', type: 'MATERIAL', email: 'a@b.com' },
          { actorUserId: 'u1', meta: {} },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette affiliation pour MATERIAL', async () => {
      prisma.resourceRole.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          'c1',
          {
            name: 'Srv',
            type: ResourceType.MATERIAL,
          } as any,
          { name: 'Srv', type: 'MATERIAL', affiliation: 'INTERNAL' },
          { actorUserId: 'u1', meta: {} },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette firstName pour MATERIAL', async () => {
      prisma.resourceRole.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          'c1',
          {
            name: 'Srv',
            type: ResourceType.MATERIAL,
          } as any,
          { name: 'Srv', type: 'MATERIAL', firstName: 'Jean' },
          { actorUserId: 'u1', meta: {} },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejette companyName pour MATERIAL', async () => {
      prisma.resourceRole.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          'c1',
          {
            name: 'Srv',
            type: ResourceType.MATERIAL,
          } as any,
          { name: 'Srv', type: 'MATERIAL', companyName: 'Acme' },
          { actorUserId: 'u1', meta: {} },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update — identité liée membre', () => {
    const humanExisting = {
      id: 'res-1',
      clientId: 'c1',
      name: 'Dupont',
      firstName: 'Jean',
      email: 'j@client.fr',
      type: ResourceType.HUMAN,
      code: null,
      affiliation: 'INTERNAL',
      companyName: null,
      dailyRate: null,
      metadata: null,
      roleId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('rejette changement de nom si ressource alignée sur un membre (email)', async () => {
      prisma.resource.findFirst.mockResolvedValue(humanExisting);
      prisma.clientUser.findFirst.mockResolvedValue({ userId: 'user-mem' });

      await expect(
        service.update(
          'c1',
          'res-1',
          { name: 'Autre' },
          { name: 'Autre' },
          { actorUserId: 'u1', meta: {} },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.resource.update).not.toHaveBeenCalled();
    });

    it('autorise mise à jour TJ si identité liée membre', async () => {
      prisma.resource.findFirst
        .mockResolvedValueOnce(humanExisting)
        .mockResolvedValueOnce({
          ...humanExisting,
          resourceRole: null,
        });
      prisma.clientUser.findFirst.mockResolvedValue({ userId: 'user-mem' });
      prisma.resource.update.mockResolvedValue({
        ...humanExisting,
        dailyRate: { toString: () => '500' },
        resourceRole: null,
      });

      await service.update(
        'c1',
        'res-1',
        { dailyRate: 500 },
        { dailyRate: 500 },
        { actorUserId: 'u1', meta: {} },
      );

      expect(prisma.resource.update).toHaveBeenCalled();
    });
  });
});
