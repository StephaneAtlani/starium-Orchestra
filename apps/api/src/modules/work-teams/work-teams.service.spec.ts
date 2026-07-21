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
    strategicDirection: { findFirst: jest.Mock };
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
      strategicDirection: { findFirst: jest.fn() },
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

  it('create: rattache strategicDirectionId après validation client', async () => {
    prisma.workTeam.findFirst.mockResolvedValue(null);
    prisma.resource.findFirst.mockResolvedValue({
      id: 'res1',
      clientId: 'c1',
      type: 'HUMAN',
      name: 'Dupont',
      firstName: 'Alice',
    });
    prisma.strategicDirection.findFirst.mockResolvedValue({
      id: 'sd1',
      isActive: true,
    });
    prisma.workTeam.create.mockResolvedValue({
      id: 'wt1',
      clientId: 'c1',
      name: 'Infra',
      code: null,
      parentId: null,
      strategicDirectionId: 'sd1',
      leadResourceId: 'res1',
      status: 'ACTIVE',
      archivedAt: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lead: { name: 'Dupont', firstName: 'Alice' },
      parent: null,
      strategicDirection: { id: 'sd1', name: 'DSI', code: 'DSI' },
    });

    const result = await service.create(
      'c1',
      {
        name: 'Infra',
        leadResourceId: 'res1',
        strategicDirectionId: 'sd1',
      },
      'user1',
    );

    expect(prisma.strategicDirection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sd1', clientId: 'c1' },
      }),
    );
    expect(prisma.workTeam.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strategicDirectionId: 'sd1',
          name: 'Infra',
        }),
      }),
    );
    expect(result.strategicDirectionId).toBe('sd1');
    expect(result.strategicDirectionName).toBe('DSI');
  });

  it('update: strategicDirectionId null détache la direction', async () => {
    prisma.workTeam.findFirst.mockResolvedValue({
      id: 'wt1',
      clientId: 'c1',
      name: 'Infra',
      code: null,
      parentId: null,
      strategicDirectionId: 'sd1',
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
      strategicDirectionId: null,
      leadResourceId: 'res1',
      status: 'ACTIVE',
      archivedAt: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lead: { name: 'Dupont', firstName: 'Alice' },
      parent: null,
      strategicDirection: null,
    });

    const result = await service.update(
      'c1',
      'wt1',
      { strategicDirectionId: null },
      'user1',
    );

    expect(prisma.workTeam.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          strategicDirection: { disconnect: true },
        }),
      }),
    );
    expect(result.strategicDirectionId).toBeNull();
    expect(result.strategicDirectionName).toBeNull();
  });
});
