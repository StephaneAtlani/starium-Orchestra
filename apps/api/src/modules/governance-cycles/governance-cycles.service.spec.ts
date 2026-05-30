import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  GovernanceCycleCadence,
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GovernanceCyclesService } from './governance-cycles.service';

type PrismaMock = {
  $transaction: jest.Mock;
  governanceCycle: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  governanceCycleItem: {
    groupBy: jest.Mock;
  };
};

const baseCycle = {
  id: 'cycle-1',
  clientId: 'client-a',
  name: 'CODIR T2 2026',
  code: 'CODIR-T2',
  description: null,
  cadence: GovernanceCycleCadence.QUARTERLY,
  status: GovernanceCycleStatus.DRAFT,
  startDate: null,
  endDate: null,
  sponsorLabel: null,
  objectiveSummary: null,
  decisionSummary: null,
  validatedByUserId: null,
  validatedAt: null,
  closedAt: null,
  createdByUserId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

describe('GovernanceCyclesService', () => {
  let service: GovernanceCyclesService;
  let prisma: PrismaMock;
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      governanceCycle: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      governanceCycleItem: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new GovernanceCyclesService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  function mockSummaryAggregates(
    cycleId: string,
    counts: { total: number; accepted: number; deferred: number },
  ) {
    prisma.governanceCycleItem.groupBy
      .mockResolvedValueOnce(
        counts.total > 0 ? [{ cycleId, _count: { _all: counts.total } }] : [],
      )
      .mockResolvedValueOnce(
        counts.accepted > 0
          ? [{ cycleId, _count: { _all: counts.accepted } }]
          : [],
      )
      .mockResolvedValueOnce(
        counts.deferred > 0
          ? [{ cycleId, _count: { _all: counts.deferred } }]
          : [],
      );
  }

  it('listCycles filtre par clientId et retourne pagination', async () => {
    prisma.governanceCycle.findMany.mockResolvedValue([baseCycle]);
    prisma.governanceCycle.count.mockResolvedValue(1);
    mockSummaryAggregates('cycle-1', { total: 3, accepted: 1, deferred: 1 });

    const result = await service.listCycles('client-a', { limit: 20, offset: 0 });

    expect(prisma.governanceCycle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-a' }),
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'cycle-1',
          name: 'CODIR T2 2026',
          code: 'CODIR-T2',
          summary: {
            itemsCount: 3,
            acceptedItemsCount: 1,
            deferredItemsCount: 1,
          },
        }),
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });

  it('getCycleById renvoie 404 hors client', async () => {
    prisma.governanceCycle.findFirst.mockResolvedValue(null);
    await expect(service.getCycleById('client-b', 'cycle-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('createCycle injecte clientId et audite', async () => {
    prisma.governanceCycle.create.mockResolvedValue(baseCycle);
    prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
    mockSummaryAggregates('cycle-1', { total: 0, accepted: 0, deferred: 0 });

    await service.createCycle(
      'client-a',
      {
        name: 'CODIR T2 2026',
        cadence: GovernanceCycleCadence.QUARTERLY,
      },
      { actorUserId: 'user-1' },
    );

    expect(prisma.governanceCycle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: 'client-a', name: 'CODIR T2 2026' }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'governance_cycle.created',
        resourceType: 'governance_cycle',
        resourceId: 'cycle-1',
      }),
    );
  });

  it('updateCycle refuse un cycle ARCHIVED', async () => {
    prisma.governanceCycle.findFirst.mockResolvedValue({
      ...baseCycle,
      status: GovernanceCycleStatus.ARCHIVED,
    });

    await expect(
      service.updateCycle('client-a', 'cycle-1', { name: 'Nouveau nom' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('archiveCycle passe en ARCHIVED et audite', async () => {
    prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
    prisma.governanceCycle.update.mockResolvedValue({
      ...baseCycle,
      status: GovernanceCycleStatus.ARCHIVED,
    });

    await service.archiveCycle('client-a', 'cycle-1', { actorUserId: 'user-1' });

    expect(prisma.governanceCycle.update).toHaveBeenCalledWith({
      where: { id: 'cycle-1' },
      data: { status: GovernanceCycleStatus.ARCHIVED },
    });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'governance_cycle.archived' }),
    );
  });

  it('archiveCycle est idempotent si déjà ARCHIVED', async () => {
    prisma.governanceCycle.findFirst.mockResolvedValue({
      ...baseCycle,
      status: GovernanceCycleStatus.ARCHIVED,
    });

    await service.archiveCycle('client-a', 'cycle-1');

    expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('summary agrège accepted et deferred', async () => {
    prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
    prisma.governanceCycleItem.groupBy
      .mockResolvedValueOnce([{ cycleId: 'cycle-1', _count: { _all: 5 } }])
      .mockResolvedValueOnce([
        {
          cycleId: 'cycle-1',
          _count: { _all: 2 },
          decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
        },
      ])
      .mockResolvedValueOnce([
        {
          cycleId: 'cycle-1',
          _count: { _all: 1 },
          decisionStatus: GovernanceCycleItemDecisionStatus.DEFERRED,
        },
      ]);

    const result = await service.getCycleById('client-a', 'cycle-1');

    expect(result.summary).toEqual({
      itemsCount: 5,
      acceptedItemsCount: 2,
      deferredItemsCount: 1,
    });
  });
});
