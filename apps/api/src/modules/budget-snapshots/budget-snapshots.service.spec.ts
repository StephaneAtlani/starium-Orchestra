import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetStatus } from '@prisma/client';
import { BudgetSnapshotsService } from './budget-snapshots.service';

const clientId = 'client-1';
const budgetId = 'budget-1';
const exerciseId = 'ex-1';

function mockBudget(overrides: Record<string, unknown> = {}) {
  return {
    id: budgetId,
    clientId,
    exerciseId,
    name: 'Budget 2026',
    code: 'BUD-2026',
    currency: 'EUR',
    status: BudgetStatus.ACTIVE,
    exercise: { clientId, id: exerciseId },
    ...overrides,
  };
}

function mockSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'snap-1',
    clientId,
    budgetId,
    exerciseId,
    name: 'Snapshot Jan',
    code: 'SNAP-20260131-abc123',
    description: null,
    snapshotDate: new Date('2026-01-31'),
    status: 'ACTIVE',
    budgetName: 'Budget 2026',
    budgetCode: 'BUD-2026',
    budgetCurrency: 'EUR',
    budgetStatus: BudgetStatus.ACTIVE,
    totalRevisedAmount: 100000,
    totalForecastAmount: 98000,
    totalCommittedAmount: 60000,
    totalConsumedAmount: 22000,
    totalRemainingAmount: 23000,
    totalInitialAmount: 100000,
    createdByUserId: null,
    createdAt: new Date('2026-03-14T12:00:00Z'),
    lines: [],
    ...overrides,
  };
}

function mockSnapshotLine(overrides: Record<string, unknown> = {}) {
  return {
    id: 'snapline-1',
    budgetLineId: 'line-1',
    lineCode: 'BL-001',
    lineName: 'Line 1',
    revisedAmount: 10000,
    forecastAmount: 9500,
    committedAmount: 5000,
    consumedAmount: 2000,
    remainingAmount: 7500,
    ...overrides,
  };
}

describe('BudgetSnapshotsService', () => {
  let service: BudgetSnapshotsService;
  let prisma: any;
  let auditLogs: any;

  beforeEach(() => {
    prisma = {
      budget: { findFirst: jest.fn() },
      budgetLine: { findMany: jest.fn() },
      budgetSnapshot: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      budgetSnapshotLine: { createMany: jest.fn() },
      $transaction: jest.fn((fn: (tx: any) => Promise<unknown>) => {
        const tx = {
          budgetSnapshot: { create: jest.fn() },
          budgetSnapshotLine: { createMany: jest.fn() },
        };
        return fn(tx);
      }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetSnapshotsService(prisma, auditLogs);
  });

  describe('create', () => {
    it('crée un snapshot pour un budget valide du client', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget());
      prisma.budgetLine.findMany.mockResolvedValue([
        {
          id: 'line-1',
          budgetId,
          envelopeId: 'env-1',
          envelope: { name: 'Env', code: 'E1', type: 'RUN' },
          code: 'BL-1',
          name: 'Line 1',
          expenseType: 'OPEX',
          currency: 'EUR',
          status: 'ACTIVE',
          initialAmount: 10000,
          revisedAmount: 10000,
          forecastAmount: 9500,
          committedAmount: 5000,
          consumedAmount: 2000,
          remainingAmount: 7500,
        },
      ]);
      const createdSnap = mockSnapshot({
        id: 'snap-new',
        name: 'Snapshot Mars',
        code: 'SNAP-20260314-abcdef',
        lines: undefined,
        createdAt: new Date('2026-03-14T12:00:00Z'),
      });
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<unknown>) => {
        const tx = {
          budgetSnapshot: {
            create: jest.fn().mockResolvedValue(createdSnap),
          },
          budgetSnapshotLine: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return fn(tx);
      });

      const result = await service.create(
        clientId,
        { budgetId, name: 'Snapshot Mars' },
        { actorUserId: 'user-1', meta: {} },
      );

      expect(prisma.budget.findFirst).toHaveBeenCalledWith({
        where: { id: budgetId, clientId },
        include: { exercise: true },
      });
      expect(prisma.budgetLine.findMany).toHaveBeenCalledWith({
        where: { budgetId, clientId },
        include: { envelope: true },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget_snapshot.created',
          resourceType: 'budget_snapshot',
          resourceId: 'snap-new',
          newValue: expect.objectContaining({
            budgetId,
            name: 'Snapshot Mars',
            code: 'SNAP-20260314-abcdef',
            linesCount: 1,
            totalInitialAmount: 10000,
            totalRevisedAmount: 10000,
          }),
        }),
      );
      expect(result.id).toBe('snap-new');
      expect(result.lines).toBeUndefined();
    });

    it('refuse si budget introuvable', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);

      await expect(
        service.create(clientId, { budgetId: 'other', name: 'Snap' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuse si exercice appartient à un autre client', async () => {
      prisma.budget.findFirst.mockResolvedValue(
        mockBudget({ exercise: { clientId: 'other-client', id: exerciseId } }),
      );

      await expect(
        service.create(clientId, { budgetId, name: 'Snap' }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('retourne la liste paginée filtrée par clientId et optionnellement budgetId', async () => {
      const items = [mockSnapshot()];
      prisma.budgetSnapshot.findMany.mockResolvedValue(items);
      prisma.budgetSnapshot.count.mockResolvedValue(1);

      const result = await service.list(clientId, {
        budgetId,
        limit: 20,
        offset: 0,
      });

      expect(prisma.budgetSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId, budgetId },
          orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
          skip: 0,
          take: 20,
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });

  describe('getById', () => {
    it('retourne le détail avec totaux et lignes', async () => {
      const snap = mockSnapshot({
        lines: [mockSnapshotLine()],
      });
      prisma.budgetSnapshot.findFirst.mockResolvedValue(snap);

      const result = await service.getById(clientId, 'snap-1');

      expect(prisma.budgetSnapshot.findFirst).toHaveBeenCalledWith({
        where: { id: 'snap-1', clientId },
        include: { lines: true },
      });
      expect(result.totals).toBeDefined();
      expect(result.lines).toHaveLength(1);
    });

    it('404 si snapshot absent', async () => {
      prisma.budgetSnapshot.findFirst.mockResolvedValue(null);

      await expect(service.getById(clientId, 'absent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('compare', () => {
    it('compare deux snapshots du même budget', async () => {
      const left = mockSnapshot({
        id: 'left-1',
        name: 'Left',
        budgetId,
        lines: [mockSnapshotLine({ budgetLineId: 'line-1', revisedAmount: 10000 })],
      });
      const right = mockSnapshot({
        id: 'right-1',
        name: 'Right',
        budgetId,
        lines: [mockSnapshotLine({ budgetLineId: 'line-1', revisedAmount: 12000 })],
      });
      prisma.budgetSnapshot.findFirst
        .mockResolvedValueOnce(left)
        .mockResolvedValueOnce(right);

      const result = await service.compare(
        clientId,
        'left-1',
        'right-1',
      );

      expect(result.leftSnapshot.id).toBe('left-1');
      expect(result.rightSnapshot.id).toBe('right-1');
      expect(result.totalsDiff).toBeDefined();
      expect(result.lineDiffs).toBeDefined();
      expect(result.lineDiffs!.every(
        (d) =>
          'budgetLineId' in d &&
          'lineCode' in d &&
          'lineName' in d &&
          'left' in d &&
          'right' in d &&
          'diff' in d,
      )).toBe(true);
    });

    it('404 si un snapshot est absent', async () => {
      prisma.budgetSnapshot.findFirst
        .mockResolvedValueOnce(mockSnapshot({ id: 'left-1' }))
        .mockResolvedValueOnce(null);

      await expect(
        service.compare(clientId, 'left-1', 'absent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('400 si les deux snapshots sont de budgets différents', async () => {
      prisma.budgetSnapshot.findFirst
        .mockResolvedValueOnce(mockSnapshot({ id: 'left-1', budgetId: 'b1' }))
        .mockResolvedValueOnce(mockSnapshot({ id: 'right-1', budgetId: 'b2' }));

      await expect(
        service.compare(clientId, 'left-1', 'right-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
