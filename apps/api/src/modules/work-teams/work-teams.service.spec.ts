import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { WorkTeamsService } from './work-teams.service';

describe('WorkTeamsService', () => {
  let service: WorkTeamsService;
  let prisma: {
    workTeam: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findFirstOrThrow: jest.Mock;
    };
    orgUnit: { findFirst: jest.Mock };
    resource: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditLogs: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      workTeam: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      orgUnit: { findFirst: jest.fn() },
      resource: { findFirst: jest.fn() },
      $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
    };
    auditLogs = { create: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        WorkTeamsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get(WorkTeamsService);
  });

  it('normalizeCode: trim et vide -> null', () => {
    expect(service.normalizeCode('  ')).toBeNull();
    expect(service.normalizeCode('')).toBeNull();
    expect(service.normalizeCode(undefined)).toBeNull();
    expect(service.normalizeCode('  ABC  ')).toBe('ABC');
  });

  it('create: rattache orgUnitId après validation client', async () => {
    prisma.workTeam.findFirst.mockResolvedValue(null);
    prisma.resource.findFirst.mockResolvedValue({
      id: 'res1',
      clientId: 'c1',
      type: 'HUMAN',
      name: 'Dupont',
      firstName: 'Alice',
    });
    prisma.orgUnit.findFirst.mockResolvedValue({
      id: 'ou1',
      name: 'DSI',
      type: 'DIRECTION',
      code: 'DSI',
      status: 'ACTIVE',
      clientId: 'c1',
    });
    prisma.workTeam.create.mockResolvedValue({
      id: 'wt1',
      clientId: 'c1',
      name: 'Infra',
      code: null,
      parentId: null,
      orgUnitId: 'ou1',
      leadResourceId: 'res1',
      status: 'ACTIVE',
      archivedAt: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lead: { name: 'Dupont', firstName: 'Alice' },
      parent: null,
      orgUnit: { id: 'ou1', name: 'DSI', code: 'DSI' },
    });

    const result = await service.create(
      'c1',
      {
        name: 'Infra',
        leadResourceId: 'res1',
        orgUnitId: 'ou1',
      },
      'user1',
    );

    expect(prisma.orgUnit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ou1', clientId: 'c1' },
      }),
    );
    expect(prisma.workTeam.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgUnitId: 'ou1', name: 'Infra' }),
      }),
    );
    expect(result.orgUnitId).toBe('ou1');
    expect(result.orgUnitName).toBe('DSI');
  });

  it('update: orgUnitId null détache la direction', async () => {
    prisma.workTeam.findFirst.mockResolvedValue({
      id: 'wt1',
      clientId: 'c1',
      name: 'Infra',
      code: null,
      parentId: null,
      orgUnitId: 'ou1',
      leadResourceId: 'res1',
      status: 'ACTIVE',
      archivedAt: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.workTeam.update.mockResolvedValue({
      id: 'wt1',
      clientId: 'c1',
      name: 'Infra',
      code: null,
      parentId: null,
      orgUnitId: null,
      leadResourceId: 'res1',
      status: 'ACTIVE',
      archivedAt: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lead: { name: 'Dupont', firstName: 'Alice' },
      parent: null,
      orgUnit: null,
    });

    const result = await service.update('c1', 'wt1', { orgUnitId: null }, 'user1');

    expect(prisma.workTeam.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgUnit: { disconnect: true } }),
      }),
    );
    expect(result.orgUnitId).toBeNull();
    expect(result.orgUnitName).toBeNull();
  });
});
