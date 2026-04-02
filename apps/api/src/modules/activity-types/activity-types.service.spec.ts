import { Test } from '@nestjs/testing';
import {
  ActivityTaxonomyKind,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ActivityTypesService } from './activity-types.service';

describe('ActivityTypesService', () => {
  let service: ActivityTypesService;
  let auditCreate: jest.Mock;
  let activityTypeMock: {
    count: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  let prisma: PrismaService & {
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    auditCreate = jest.fn();
    activityTypeMock = {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };

    prisma = {
      activityType: activityTypeMock,
      $transaction: jest.fn((arg: unknown) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg as Promise<unknown>[]);
        }
        if (typeof arg === 'function') {
          return (arg as (tx: { activityType: typeof activityTypeMock }) => Promise<unknown>)({
            activityType: activityTypeMock,
          });
        }
        return Promise.resolve(arg);
      }),
    } as unknown as PrismaService & { $transaction: jest.Mock };

    const module = await Test.createTestingModule({
      providers: [
        ActivityTypesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { create: auditCreate } },
      ],
    }).compile();

    service = module.get(ActivityTypesService);
    jest.clearAllMocks();
  });

  it('normalizeCode: trim, vide -> null, sinon UPPER', () => {
    expect(service.normalizeCode('  ')).toBeNull();
    expect(service.normalizeCode('')).toBeNull();
    expect(service.normalizeCode(undefined)).toBeNull();
    expect(service.normalizeCode('  ab_12  ')).toBe('AB_12');
  });

  describe('list', () => {
    it('exclude les archivés si includeArchived=false', async () => {
      activityTypeMock.count.mockResolvedValue(0);
      activityTypeMock.findMany.mockResolvedValue([]);
      const result = await service.list('c1', {
        includeArchived: false,
      } as Parameters<ActivityTypesService['list']>[1]);
      expect(result.items).toEqual([]);
      expect(activityTypeMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'c1',
            archivedAt: null,
          }),
        }),
      );
    });

    it('inclut les archivés si includeArchived=true', async () => {
      activityTypeMock.count.mockResolvedValue(1);
      activityTypeMock.findMany.mockResolvedValue([]);
      await service.list('c1', {
        includeArchived: true,
      } as Parameters<ActivityTypesService['list']>[1]);
      const call = activityTypeMock.findMany.mock.calls[0][0] as {
        where: Prisma.ActivityTypeWhereInput;
      };
      expect(call.where.archivedAt).toBeUndefined();
    });
  });

  describe('archive / restore idempotents', () => {
    const row = {
      id: 'a1',
      clientId: 'c1',
      kind: ActivityTaxonomyKind.PROJECT,
      name: 'P',
      code: null,
      description: null,
      sortOrder: 0,
      isDefaultForKind: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('archive: déjà archivé → pas de update, pas d’audit', async () => {
      const archived = { ...row, archivedAt: new Date('2020-01-01') };
      activityTypeMock.findFirst.mockResolvedValue(archived);
      const out = await service.archive('c1', 'a1', 'u1', {});
      expect(out.archivedAt).toEqual(archived.archivedAt);
      expect(activityTypeMock.update).not.toHaveBeenCalled();
      expect(auditCreate).not.toHaveBeenCalled();
    });

    it('restore: déjà actif → pas de update, pas d’audit', async () => {
      activityTypeMock.findFirst.mockResolvedValue(row);
      const out = await service.restore('c1', 'a1', 'u1', {});
      expect(out.archivedAt).toBeNull();
      expect(activityTypeMock.update).not.toHaveBeenCalled();
      expect(auditCreate).not.toHaveBeenCalled();
    });
  });

  describe('isDefaultForKind', () => {
    it('create avec défaut met les autres lignes du kind à false', async () => {
      const created = {
        id: 'new',
        clientId: 'c1',
        kind: ActivityTaxonomyKind.RUN,
        name: 'R2',
        code: null,
        description: null,
        sortOrder: 1,
        isDefaultForKind: true,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      activityTypeMock.create.mockResolvedValue(created);
      activityTypeMock.findFirst.mockResolvedValue(null);

      await service.create(
        'c1',
        {
          kind: ActivityTaxonomyKind.RUN,
          name: 'R2',
          isDefaultForKind: true,
        },
        'u1',
        {},
      );

      expect(activityTypeMock.updateMany).toHaveBeenCalledWith({
        where: { clientId: 'c1', kind: ActivityTaxonomyKind.RUN },
        data: { isDefaultForKind: false },
      });
      expect(activityTypeMock.create).toHaveBeenCalled();
      expect(auditCreate).toHaveBeenCalled();
    });
  });

  describe('ensureDefaultsForClient', () => {
    it('délègue à ensureDefaultActivityTypes (idempotent via mock prisma)', async () => {
      const realPrisma = {
        activityType: {
          count: jest.fn().mockResolvedValue(1),
          create: jest.fn(),
        },
        $transaction: prisma.$transaction,
      };
      const m = await Test.createTestingModule({
        providers: [
          ActivityTypesService,
          { provide: PrismaService, useValue: realPrisma },
          { provide: AuditLogsService, useValue: { create: jest.fn() } },
        ],
      }).compile();
      const svc = m.get(ActivityTypesService);
      await svc.ensureDefaultsForClient('c1');
      expect(realPrisma.activityType.count).toHaveBeenCalled();
    });
  });
});
