import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  GovernanceCycleCadence,
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
  GovernanceCycleStatus,
  Prisma,
} from '@prisma/client';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PATCH_MIXED_EDITION_ARBITRATION_MESSAGE } from './lib/governance-cycle-decimal.util';
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
    aggregate: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  project: { findFirst: jest.Mock };
  budget: { findFirst: jest.Mock };
  budgetLine: { findFirst: jest.Mock };
  strategicObjective: { findFirst: jest.Mock };
  projectRisk: { findFirst: jest.Mock };
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

const baseItem = {
  id: 'item-1',
  clientId: 'client-a',
  cycleId: 'cycle-1',
  sourceType: GovernanceCycleItemSourceType.PROJECT,
  projectId: 'proj-1',
  budgetId: null,
  budgetLineId: null,
  strategicObjectiveId: null,
  riskId: null,
  title: 'Projet Alpha',
  description: null,
  decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
  decisionReason: null,
  valueScore: null,
  riskScore: null,
  budgetScore: null,
  capacityScore: null,
  alignmentScore: null,
  priorityScore: null,
  estimatedBudgetAmount: new Prisma.Decimal('1000.50'),
  estimatedCapacityDays: new Prisma.Decimal('12.25'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  project: { id: 'proj-1', name: 'Projet Alpha', code: 'PRJ-1' },
  budget: null,
  budgetLine: null,
  strategicObjective: null,
  risk: null,
};

describe('GovernanceCyclesService', () => {
  let service: GovernanceCyclesService;
  let prisma: PrismaMock;
  let auditLogs: { create: jest.Mock };
  let effectivePermissions: { resolvePermissionCodesForRequest: jest.Mock };

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
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            estimatedBudgetAmount: null,
            estimatedCapacityDays: null,
          },
          _avg: { priorityScore: null },
        }),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      project: { findFirst: jest.fn() },
      budget: { findFirst: jest.fn() },
      budgetLine: { findFirst: jest.fn() },
      strategicObjective: { findFirst: jest.fn() },
      projectRisk: { findFirst: jest.fn() },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    effectivePermissions = {
      resolvePermissionCodesForRequest: jest.fn().mockResolvedValue(
        new Set([
          'governance_cycles.read',
          'governance_cycles.create',
          'governance_cycles.update',
          'governance_cycles.arbitrate',
        ]),
      ),
    };
    service = new GovernanceCyclesService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
      effectivePermissions as unknown as EffectivePermissionsService,
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

  function mockMutableCycle() {
    prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
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

  describe('audits cycle', () => {
    function mockUpdateCycleFetch(updated: typeof baseCycle) {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      prisma.governanceCycle.update.mockResolvedValue(updated);
      mockSummaryAggregates('cycle-1', { total: 0, accepted: 0, deferred: 0 });
    }

    it('updateCycle change le nom audite updated', async () => {
      const updated = { ...baseCycle, name: 'CODIR T3 2026' };
      mockUpdateCycleFetch(updated);

      await service.updateCycle(
        'client-a',
        'cycle-1',
        { name: 'CODIR T3 2026' },
        { actorUserId: 'user-1' },
      );

      expect(prisma.governanceCycle.update).toHaveBeenCalledWith({
        where: { id: 'cycle-1' },
        data: { name: 'CODIR T3 2026' },
      });
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle.updated',
          resourceType: 'governance_cycle',
          resourceId: 'cycle-1',
        }),
      );
    });

    it('updateCycle body vide ne déclenche ni Prisma ni audit', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      mockSummaryAggregates('cycle-1', { total: 0, accepted: 0, deferred: 0 });

      await service.updateCycle('client-a', 'cycle-1', {});

      expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('updateCycle PATCH nom identique après trim ne déclenche ni Prisma ni audit', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      mockSummaryAggregates('cycle-1', { total: 0, accepted: 0, deferred: 0 });

      await service.updateCycle('client-a', 'cycle-1', {
        name: '  CODIR T2 2026  ',
      });

      expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('updateCycle PATCH status identique ne déclenche ni Prisma ni audit', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      mockSummaryAggregates('cycle-1', { total: 0, accepted: 0, deferred: 0 });

      await service.updateCycle('client-a', 'cycle-1', {
        status: GovernanceCycleStatus.DRAFT,
      });

      expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('status → TO_ARBITRATE avec items OK audite updated + validated', async () => {
      prisma.governanceCycleItem.count.mockResolvedValue(0);
      const validatedAt = new Date('2026-05-30T12:00:00.000Z');
      const updated = {
        ...baseCycle,
        status: GovernanceCycleStatus.TO_ARBITRATE,
        validatedAt,
        validatedByUserId: 'user-1',
      };
      mockUpdateCycleFetch(updated);

      await service.updateCycle(
        'client-a',
        'cycle-1',
        { status: GovernanceCycleStatus.TO_ARBITRATE },
        { actorUserId: 'user-1' },
      );

      expect(prisma.governanceCycleItem.count).toHaveBeenCalledWith({
        where: {
          clientId: 'client-a',
          cycleId: 'cycle-1',
          decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
        },
      });
      expect(prisma.governanceCycle.update).toHaveBeenCalledWith({
        where: { id: 'cycle-1' },
        data: expect.objectContaining({
          status: GovernanceCycleStatus.TO_ARBITRATE,
          validatedByUserId: 'user-1',
          validatedAt: expect.any(Date),
        }),
      });
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'governance_cycle.updated' }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle.validated',
          newValue: expect.objectContaining({
            status: GovernanceCycleStatus.TO_ARBITRATE,
            validatedByUserId: 'user-1',
          }),
        }),
      );
    });

    it('status → TO_ARBITRATE avec item CANDIDATE refuse sans Prisma ni audit', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      prisma.governanceCycleItem.count.mockResolvedValue(1);

      await expect(
        service.updateCycle(
          'client-a',
          'cycle-1',
          { status: GovernanceCycleStatus.TO_ARBITRATE },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('status → TO_ARBITRATE sans actorUserId refuse sans Prisma ni audit', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      prisma.governanceCycleItem.count.mockResolvedValue(0);

      await expect(
        service.updateCycle('client-a', 'cycle-1', {
          status: GovernanceCycleStatus.TO_ARBITRATE,
        }),
      ).rejects.toThrow('Contexte utilisateur manquant');

      expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('status → CLOSED avec items arbitrés audite updated + closed', async () => {
      prisma.governanceCycleItem.count.mockImplementation(({ where }) => {
        if (where.decisionStatus?.in) return Promise.resolve(0);
        return Promise.resolve(2);
      });
      const closedAt = new Date('2026-06-01T00:00:00.000Z');
      const updated = {
        ...baseCycle,
        status: GovernanceCycleStatus.CLOSED,
        closedAt,
      };
      mockUpdateCycleFetch(updated);

      await service.updateCycle(
        'client-a',
        'cycle-1',
        { status: GovernanceCycleStatus.CLOSED },
        { actorUserId: 'user-1' },
      );

      expect(prisma.governanceCycleItem.count).toHaveBeenCalledWith({
        where: { clientId: 'client-a', cycleId: 'cycle-1' },
      });
      expect(prisma.governanceCycleItem.count).toHaveBeenCalledWith({
        where: {
          clientId: 'client-a',
          cycleId: 'cycle-1',
          decisionStatus: {
            in: [
              GovernanceCycleItemDecisionStatus.CANDIDATE,
              GovernanceCycleItemDecisionStatus.TO_ARBITRATE,
            ],
          },
        },
      });
      expect(prisma.governanceCycle.update).toHaveBeenCalledWith({
        where: { id: 'cycle-1' },
        data: expect.objectContaining({
          status: GovernanceCycleStatus.CLOSED,
          closedAt: expect.any(Date),
        }),
      });
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'governance_cycle.updated' }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle.closed',
          newValue: expect.objectContaining({
            status: GovernanceCycleStatus.CLOSED,
            closedAt: closedAt.toISOString(),
          }),
        }),
      );
    });

    it('status → CLOSED cycle vide refuse sans audit', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      prisma.governanceCycleItem.count.mockResolvedValue(0);

      await expect(
        service.updateCycle(
          'client-a',
          'cycle-1',
          { status: GovernanceCycleStatus.CLOSED },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('status → CLOSED avec item CANDIDATE refuse sans audit', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      prisma.governanceCycleItem.count.mockImplementation(({ where }) => {
        if (!where.decisionStatus) return Promise.resolve(1);
        if (where.decisionStatus?.in) return Promise.resolve(1);
        return Promise.resolve(0);
      });

      await expect(
        service.updateCycle(
          'client-a',
          'cycle-1',
          { status: GovernanceCycleStatus.CLOSED },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('status → CLOSED avec item TO_ARBITRATE refuse sans audit', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      prisma.governanceCycleItem.count.mockImplementation(({ where }) => {
        if (!where.decisionStatus) return Promise.resolve(2);
        if (where.decisionStatus?.in) return Promise.resolve(1);
        return Promise.resolve(0);
      });

      await expect(
        service.updateCycle(
          'client-a',
          'cycle-1',
          { status: GovernanceCycleStatus.CLOSED },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.governanceCycle.update).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });
  });

  it('createCycle puis getCycleById autre client → NotFoundException', async () => {
    prisma.governanceCycle.create.mockResolvedValue(baseCycle);
    prisma.governanceCycle.findFirst
      .mockResolvedValueOnce(baseCycle)
      .mockResolvedValueOnce(null);
    mockSummaryAggregates('cycle-1', { total: 0, accepted: 0, deferred: 0 });

    await service.createCycle(
      'client-a',
      { name: 'CODIR T2 2026', cadence: GovernanceCycleCadence.QUARTERLY },
      { actorUserId: 'user-1' },
    );

    await expect(service.getCycleById('client-b', 'cycle-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
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

  describe('getCycleSummary (B7 KPI global)', () => {
    const mockGlobalSummaryQueries = (options: {
      statusGroups?: Array<{
        decisionStatus: GovernanceCycleItemDecisionStatus;
        _count: { _all: number };
      }>;
      aggregate?: {
        _sum: {
          estimatedBudgetAmount: Prisma.Decimal | null;
          estimatedCapacityDays: Prisma.Decimal | null;
        };
        _avg: { priorityScore: number | null };
      };
      highRiskCount?: number;
    }) => {
      prisma.governanceCycle.findFirst.mockResolvedValue(baseCycle);
      prisma.governanceCycleItem.groupBy.mockResolvedValue(
        options.statusGroups ?? [],
      );
      prisma.governanceCycleItem.aggregate.mockResolvedValue(
        options.aggregate ?? {
          _sum: {
            estimatedBudgetAmount: null,
            estimatedCapacityDays: null,
          },
          _avg: { priorityScore: null },
        },
      );
      prisma.governanceCycleItem.count.mockResolvedValue(
        options.highRiskCount ?? 0,
      );
    };

    it('renvoie 404 si cycle absent ou hors client actif', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.getCycleSummary('client-b', 'cycle-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('agrège tous les statuts, totaux et moyenne priorityScore', async () => {
      mockGlobalSummaryQueries({
        statusGroups: [
          {
            decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
            _count: { _all: 2 },
          },
          {
            decisionStatus: GovernanceCycleItemDecisionStatus.TO_ARBITRATE,
            _count: { _all: 1 },
          },
          {
            decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
            _count: { _all: 3 },
          },
          {
            decisionStatus: GovernanceCycleItemDecisionStatus.DEFERRED,
            _count: { _all: 1 },
          },
          {
            decisionStatus: GovernanceCycleItemDecisionStatus.REJECTED,
            _count: { _all: 1 },
          },
          {
            decisionStatus: GovernanceCycleItemDecisionStatus.NEEDS_INFORMATION,
            _count: { _all: 1 },
          },
          {
            decisionStatus:
              GovernanceCycleItemDecisionStatus.ACCEPTED_WITH_RESERVE,
            _count: { _all: 1 },
          },
        ],
        aggregate: {
          _sum: {
            estimatedBudgetAmount: new Prisma.Decimal('125000.506'),
            estimatedCapacityDays: new Prisma.Decimal('42.999'),
          },
          _avg: { priorityScore: 12.3456 },
        },
        highRiskCount: 4,
      });

      const result = await service.getCycleSummary('client-a', 'cycle-1');

      expect(result).toEqual(
        expect.objectContaining({
          cycleId: 'cycle-1',
          totalItems: 10,
          candidateCount: 2,
          toArbitrateCount: 1,
          acceptedCount: 3,
          deferredCount: 1,
          rejectedCount: 1,
          needsInformationCount: 1,
          acceptedWithReserveCount: 1,
          estimatedBudgetTotal: '125000.51',
          estimatedCapacityDaysTotal: '43.00',
          averagePriorityScore: 12.35,
          highRiskItemsCount: 4,
        }),
      );
      expect(result.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(prisma.governanceCycleItem.count).toHaveBeenCalledWith({
        where: {
          clientId: 'client-a',
          cycleId: 'cycle-1',
          riskScore: { gte: 4 },
        },
      });
    });

    it('retourne 0 pour les statuts absents du groupBy', async () => {
      mockGlobalSummaryQueries({
        statusGroups: [
          {
            decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
            _count: { _all: 2 },
          },
        ],
      });

      const result = await service.getCycleSummary('client-a', 'cycle-1');

      expect(result.totalItems).toBe(2);
      expect(result.acceptedCount).toBe(2);
      expect(result.candidateCount).toBe(0);
      expect(result.toArbitrateCount).toBe(0);
      expect(result.deferredCount).toBe(0);
      expect(result.rejectedCount).toBe(0);
      expect(result.needsInformationCount).toBe(0);
      expect(result.acceptedWithReserveCount).toBe(0);
    });

    it('cycle sans items : counts à 0, totaux "0.00", averagePriorityScore null', async () => {
      mockGlobalSummaryQueries({});

      const result = await service.getCycleSummary('client-a', 'cycle-1');

      expect(result).toEqual(
        expect.objectContaining({
          cycleId: 'cycle-1',
          totalItems: 0,
          candidateCount: 0,
          toArbitrateCount: 0,
          acceptedCount: 0,
          deferredCount: 0,
          rejectedCount: 0,
          needsInformationCount: 0,
          acceptedWithReserveCount: 0,
          estimatedBudgetTotal: '0.00',
          estimatedCapacityDaysTotal: '0.00',
          averagePriorityScore: null,
          highRiskItemsCount: 0,
        }),
      );
    });

    it('highRiskItemsCount reflète le count riskScore >= 4', async () => {
      mockGlobalSummaryQueries({ highRiskCount: 7 });

      const result = await service.getCycleSummary('client-a', 'cycle-1');

      expect(result.highRiskItemsCount).toBe(7);
    });
  });

  describe('items', () => {
    it('createItem PROJECT dérive le titre et audite', async () => {
      mockMutableCycle();
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Projet Alpha',
      });
      prisma.governanceCycleItem.create.mockResolvedValue(baseItem);

      const result = await service.createItem(
        'client-a',
        'cycle-1',
        {
          sourceType: GovernanceCycleItemSourceType.PROJECT,
          projectId: 'proj-1',
        },
        { actorUserId: 'user-1' },
      );

      expect(prisma.governanceCycleItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: 'client-a',
            cycleId: 'cycle-1',
            projectId: 'proj-1',
            title: 'Projet Alpha',
          }),
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle_item.created',
          resourceType: 'governance_cycle_item',
        }),
      );
      expect(result.estimatedBudgetAmount).toBe('1000.50');
      expect(result.estimatedCapacityDays).toBe('12.25');
      expect(result.sourceRef).toEqual({ id: 'proj-1', label: 'PRJ-1 — Projet Alpha' });
    });

    it('createItem sérialise les Decimal fournis en entrée', async () => {
      mockMutableCycle();
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Projet Alpha',
      });
      prisma.governanceCycleItem.create.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          estimatedBudgetAmount: data.estimatedBudgetAmount,
          estimatedCapacityDays: data.estimatedCapacityDays,
          include,
        }),
      );

      const result = await service.createItem('client-a', 'cycle-1', {
        sourceType: GovernanceCycleItemSourceType.PROJECT,
        projectId: 'proj-1',
        estimatedBudgetAmount: '2500.75',
        estimatedCapacityDays: '8.5',
      });

      expect(result.estimatedBudgetAmount).toBe('2500.75');
      expect(result.estimatedCapacityDays).toBe('8.50');
    });

    it('createItem doublon projet → ConflictException', async () => {
      mockMutableCycle();
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Projet Alpha',
      });
      prisma.governanceCycleItem.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.createItem('client-a', 'cycle-1', {
          sourceType: GovernanceCycleItemSourceType.PROJECT,
          projectId: 'proj-1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('createItem référence projet hors client → NotFoundException', async () => {
      mockMutableCycle();
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.createItem('client-a', 'cycle-1', {
          sourceType: GovernanceCycleItemSourceType.PROJECT,
          projectId: 'proj-x',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('createItem MANUAL sans titre → BadRequestException', async () => {
      mockMutableCycle();

      await expect(
        service.createItem('client-a', 'cycle-1', {
          sourceType: GovernanceCycleItemSourceType.MANUAL,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('createItem MANUAL avec projectId → BadRequestException', async () => {
      mockMutableCycle();

      await expect(
        service.createItem('client-a', 'cycle-1', {
          sourceType: GovernanceCycleItemSourceType.MANUAL,
          title: 'Sujet libre',
          projectId: 'proj-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updateItem PATCH mixte édition + arbitrage → BadRequestException', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);

      await expect(
        service.updateItem(
          'client-a',
          'cycle-1',
          'item-1',
          {
            title: 'Nouveau titre',
            decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
          },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toMatchObject({
        response: { message: PATCH_MIXED_EDITION_ARBITRATION_MESSAGE },
      });
    });

    it('updateItem édition sans governance_cycles.update → ForbiddenException', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set(['governance_cycles.arbitrate']),
      );

      await expect(
        service.updateItem(
          'client-a',
          'cycle-1',
          'item-1',
          { title: 'Nouveau titre' },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('updateItem arbitrage sans governance_cycles.arbitrate → ForbiddenException', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set(['governance_cycles.update']),
      );

      await expect(
        service.updateItem(
          'client-a',
          'cycle-1',
          'item-1',
          { decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('updateItem arbitrage audite decision_changed', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      prisma.governanceCycleItem.update.mockResolvedValue({
        ...baseItem,
        decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
      });

      await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        { decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED },
        { actorUserId: 'user-1' },
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle_item.decision_changed',
          resourceType: 'governance_cycle_item',
        }),
      );
    });

    it('updateItem arbitrage sans changement effectif n audite pas decision_changed', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      prisma.governanceCycleItem.update.mockResolvedValue(baseItem);

      await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        { decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE },
        { actorUserId: 'user-1' },
      );

      expect(auditLogs.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle_item.decision_changed',
        }),
      );
    });

    it('updateItem titre seul audite updated sans decision_changed', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      prisma.governanceCycleItem.update.mockResolvedValue({
        ...baseItem,
        title: 'Nouveau titre',
      });

      await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        { title: 'Nouveau titre' },
        { actorUserId: 'user-1' },
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle_item.updated',
          resourceType: 'governance_cycle_item',
        }),
      );
      expect(auditLogs.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle_item.decision_changed',
        }),
      );
    });

    it('updateItem score seul audite updated', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue({
        ...baseItem,
        valueScore: 5,
        alignmentScore: 5,
        budgetScore: 4,
        capacityScore: 4,
        riskScore: 2,
        priorityScore: 42,
      });
      prisma.governanceCycleItem.update.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          valueScore: data.valueScore ?? null,
          alignmentScore: data.alignmentScore ?? null,
          budgetScore: data.budgetScore ?? null,
          capacityScore: data.capacityScore ?? null,
          riskScore: data.riskScore ?? null,
          priorityScore: data.priorityScore ?? null,
          include,
        }),
      );

      await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        { valueScore: 3 },
        { actorUserId: 'user-1' },
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle_item.updated',
          resourceType: 'governance_cycle_item',
        }),
      );
    });

    it('getItemById renvoie 404 hors client ou absent', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(null);

      await expect(
        service.getItemById('client-a', 'cycle-1', 'item-missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('createItem sur cycle ARCHIVED → ConflictException', async () => {
      prisma.governanceCycle.findFirst.mockResolvedValue({
        ...baseCycle,
        status: GovernanceCycleStatus.ARCHIVED,
      });

      await expect(
        service.createItem('client-a', 'cycle-1', {
          sourceType: GovernanceCycleItemSourceType.MANUAL,
          title: 'Libre',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deleteItem audite deleted', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      prisma.governanceCycleItem.delete.mockResolvedValue(baseItem);

      await service.deleteItem('client-a', 'cycle-1', 'item-1', {
        actorUserId: 'user-1',
      });

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'governance_cycle_item.deleted',
          resourceType: 'governance_cycle_item',
        }),
      );
    });

    it('listItems filtre par clientId et cycleId', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findMany.mockResolvedValue([baseItem]);
      prisma.governanceCycleItem.count.mockResolvedValue(1);

      await service.listItems('client-a', 'cycle-1', { limit: 20, offset: 0 });

      expect(prisma.governanceCycleItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: 'client-a', cycleId: 'cycle-1' }),
          orderBy: [
            { priorityScore: { sort: 'desc', nulls: 'last' } },
            { updatedAt: 'desc' },
          ],
        }),
      );
    });

    it('createItem avec 5 scores calcule priorityScore', async () => {
      mockMutableCycle();
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Projet Alpha',
      });
      prisma.governanceCycleItem.create.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          valueScore: data.valueScore,
          riskScore: data.riskScore,
          budgetScore: data.budgetScore,
          capacityScore: data.capacityScore,
          alignmentScore: data.alignmentScore,
          priorityScore: data.priorityScore,
          include,
        }),
      );

      const result = await service.createItem('client-a', 'cycle-1', {
        sourceType: GovernanceCycleItemSourceType.PROJECT,
        projectId: 'proj-1',
        valueScore: 5,
        alignmentScore: 5,
        budgetScore: 4,
        capacityScore: 4,
        riskScore: 2,
      });

      expect(prisma.governanceCycleItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valueScore: 5,
            alignmentScore: 5,
            budgetScore: 4,
            capacityScore: 4,
            riskScore: 2,
            priorityScore: 42,
          }),
        }),
      );
      expect(result.priorityScore).toBe(42);
      expect(result.valueScore).toBe(5);
    });

    it('createItem sans scores laisse priorityScore à null', async () => {
      mockMutableCycle();
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Projet Alpha',
      });
      prisma.governanceCycleItem.create.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          valueScore: data.valueScore,
          riskScore: data.riskScore,
          budgetScore: data.budgetScore,
          capacityScore: data.capacityScore,
          alignmentScore: data.alignmentScore,
          priorityScore: data.priorityScore,
          include,
        }),
      );

      const result = await service.createItem('client-a', 'cycle-1', {
        sourceType: GovernanceCycleItemSourceType.PROJECT,
        projectId: 'proj-1',
      });

      expect(prisma.governanceCycleItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valueScore: null,
            priorityScore: null,
          }),
        }),
      );
      expect(result.priorityScore).toBeNull();
    });

    it('updateItem score partiel avec scores existants complets recalcule priorityScore', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue({
        ...baseItem,
        valueScore: 5,
        alignmentScore: 5,
        budgetScore: 4,
        capacityScore: 4,
        riskScore: 2,
        priorityScore: 42,
      });
      prisma.governanceCycleItem.update.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          valueScore: data.valueScore ?? null,
          riskScore: data.riskScore ?? null,
          budgetScore: data.budgetScore ?? null,
          capacityScore: data.capacityScore ?? null,
          alignmentScore: data.alignmentScore ?? null,
          priorityScore: data.priorityScore ?? null,
          include,
        }),
      );

      const result = await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        { valueScore: 3 },
        { actorUserId: 'user-1' },
      );

      expect(prisma.governanceCycleItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valueScore: 3,
            priorityScore: 36,
          }),
        }),
      );
      expect(result.priorityScore).toBe(36);
    });

    it('updateItem score partiel recalcule priorityScore à null si incomplet', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      prisma.governanceCycleItem.update.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          valueScore: data.valueScore ?? baseItem.valueScore,
          riskScore: data.riskScore ?? baseItem.riskScore,
          budgetScore: data.budgetScore ?? baseItem.budgetScore,
          capacityScore: data.capacityScore ?? baseItem.capacityScore,
          alignmentScore: data.alignmentScore ?? baseItem.alignmentScore,
          priorityScore: data.priorityScore ?? baseItem.priorityScore,
          include,
        }),
      );

      const result = await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        { valueScore: 4 },
        { actorUserId: 'user-1' },
      );

      expect(prisma.governanceCycleItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valueScore: 4,
            priorityScore: null,
          }),
        }),
      );
      expect(result.priorityScore).toBeNull();
    });

    it('updateItem sans champ score ne modifie pas priorityScore', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue({
        ...baseItem,
        valueScore: 5,
        alignmentScore: 5,
        budgetScore: 4,
        capacityScore: 4,
        riskScore: 2,
        priorityScore: 42,
        title: 'Ancien titre',
      });
      prisma.governanceCycleItem.update.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          title: data.title ?? 'Ancien titre',
          valueScore: 5,
          alignmentScore: 5,
          budgetScore: 4,
          capacityScore: 4,
          riskScore: 2,
          priorityScore: 42,
          include,
        }),
      );

      const result = await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        { title: 'Nouveau titre' },
        { actorUserId: 'user-1' },
      );

      const updateCall = prisma.governanceCycleItem.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('priorityScore');
      expect(updateCall.data).not.toHaveProperty('valueScore');
      expect(result.priorityScore).toBe(42);
      expect(result.title).toBe('Nouveau titre');
    });

    it('updateItem valueScore null efface le score et priorityScore', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue({
        ...baseItem,
        valueScore: 5,
        alignmentScore: 5,
        budgetScore: 4,
        capacityScore: 4,
        riskScore: 2,
        priorityScore: 42,
      });
      prisma.governanceCycleItem.update.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          valueScore: data.valueScore ?? null,
          riskScore: data.riskScore ?? baseItem.riskScore,
          budgetScore: data.budgetScore ?? baseItem.budgetScore,
          capacityScore: data.capacityScore ?? baseItem.capacityScore,
          alignmentScore: data.alignmentScore ?? baseItem.alignmentScore,
          priorityScore: data.priorityScore ?? null,
          include,
        }),
      );

      const result = await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        { valueScore: null },
        { actorUserId: 'user-1' },
      );

      expect(prisma.governanceCycleItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valueScore: null,
            priorityScore: null,
          }),
        }),
      );
      expect(result.valueScore).toBeNull();
      expect(result.priorityScore).toBeNull();
    });

    it('updateItem PATCH scores + decisionStatus → BadRequestException', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);

      await expect(
        service.updateItem(
          'client-a',
          'cycle-1',
          'item-1',
          {
            valueScore: 4,
            decisionStatus: GovernanceCycleItemDecisionStatus.ACCEPTED,
          },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toMatchObject({
        response: { message: PATCH_MIXED_EDITION_ARBITRATION_MESSAGE },
      });
    });

    it('updateItem scores sans governance_cycles.update → ForbiddenException', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
        new Set(['governance_cycles.arbitrate']),
      );

      await expect(
        service.updateItem(
          'client-a',
          'cycle-1',
          'item-1',
          { valueScore: 4 },
          { actorUserId: 'user-1' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('updateItem scores complets recalcule priorityScore', async () => {
      mockMutableCycle();
      prisma.governanceCycleItem.findFirst.mockResolvedValue(baseItem);
      prisma.governanceCycleItem.update.mockImplementation(({ data, include }) =>
        Promise.resolve({
          ...baseItem,
          valueScore: data.valueScore ?? null,
          riskScore: data.riskScore ?? null,
          budgetScore: data.budgetScore ?? null,
          capacityScore: data.capacityScore ?? null,
          alignmentScore: data.alignmentScore ?? null,
          priorityScore: data.priorityScore ?? null,
          include,
        }),
      );

      const result = await service.updateItem(
        'client-a',
        'cycle-1',
        'item-1',
        {
          valueScore: 5,
          alignmentScore: 5,
          budgetScore: 4,
          capacityScore: 4,
          riskScore: 2,
        },
        { actorUserId: 'user-1' },
      );

      expect(result.priorityScore).toBe(42);
    });
  });
});
