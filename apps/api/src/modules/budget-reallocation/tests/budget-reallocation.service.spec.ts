import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetLineStatus, BudgetStatus } from '@prisma/client';
import { BudgetReallocationService } from '../budget-reallocation.service';

describe('BudgetReallocationService', () => {
  let service: BudgetReallocationService;
  let prisma: any;
  let calculator: any;
  let auditLogs: any;

  const clientId = 'client-1';
  const sourceLineId = 'line-source';
  const targetLineId = 'line-target';
  const budgetId = 'budget-1';

  const sourceLine = {
    id: sourceLineId,
    clientId,
    budgetId,
    currency: 'EUR',
    status: BudgetLineStatus.ACTIVE,
    remainingAmount: 5000,
    budget: { id: budgetId, status: BudgetStatus.VALIDATED },
  };

  const targetLine = {
    id: targetLineId,
    clientId,
    budgetId,
    currency: 'EUR',
    status: BudgetLineStatus.ACTIVE,
    remainingAmount: 1000,
    budget: { id: budgetId, status: BudgetStatus.VALIDATED },
  };

  const createdReallocation = {
    id: 'realloc-1',
    budgetId,
    sourceLineId,
    targetLineId,
    amount: 500,
    currency: 'EUR',
    reason: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      budgetLine: {
        findFirst: jest.fn(),
      },
      budgetReallocation: { create: jest.fn() },
      financialEvent: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    calculator = { recalculateForBudgetLine: jest.fn().mockResolvedValue(undefined) };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetReallocationService(prisma, calculator, auditLogs);

    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
      const tx = {
        budgetReallocation: { create: jest.fn().mockResolvedValue(createdReallocation) },
        financialEvent: { create: jest.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.budgetLine.findFirst
        .mockResolvedValueOnce({ ...sourceLine, budget: sourceLine.budget })
        .mockResolvedValueOnce({ ...targetLine, budget: targetLine.budget });
    });

    it('transfert valide crée reallocation, 2 events, recalc et audit', async () => {
      const result = await service.create(
        clientId,
        { sourceLineId, targetLineId, amount: 500, reason: 'Arbitrage' },
        { actorUserId: 'user-1', meta: {} },
      );

      expect(result.id).toBe(createdReallocation.id);
      expect(result.amount).toBe(500);
      expect(result.budgetId).toBe(budgetId);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget.reallocated',
          resourceType: 'budget_reallocation',
          resourceId: createdReallocation.id,
          newValue: expect.objectContaining({
            sourceLineId,
            targetLineId,
            amount: 500,
          }),
        }),
      );
      expect(calculator.recalculateForBudgetLine).toHaveBeenCalledWith(sourceLineId, clientId, expect.anything());
      expect(calculator.recalculateForBudgetLine).toHaveBeenCalledWith(targetLineId, clientId, expect.anything());
    });

    it('amount exactement égal à remainingAmount => succès', async () => {
      prisma.budgetLine.findFirst
        .mockReset()
        .mockResolvedValueOnce({ ...sourceLine, remainingAmount: 300, budget: sourceLine.budget })
        .mockResolvedValueOnce({ ...targetLine, budget: targetLine.budget });
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          budgetReallocation: {
            create: jest.fn().mockResolvedValue({ ...createdReallocation, amount: 300 }),
          },
          financialEvent: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.create(clientId, {
        sourceLineId,
        targetLineId,
        amount: 300,
      });
      expect(result.id).toBe(createdReallocation.id);
      expect(result.amount).toBe(300);
    });

    it('sourceLineId === targetLineId => BadRequestException', async () => {
      await expect(
        service.create(clientId, {
          sourceLineId: 'same',
          targetLineId: 'same',
          amount: 100,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('amount > remainingAmount => BadRequestException', async () => {
      prisma.budgetLine.findFirst
        .mockReset()
        .mockResolvedValueOnce({ ...sourceLine, remainingAmount: 100, budget: sourceLine.budget })
        .mockResolvedValueOnce({ ...targetLine, budget: targetLine.budget });

      await expect(
        service.create(clientId, {
          sourceLineId,
          targetLineId,
          amount: 200,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('budgets différents => BadRequestException', async () => {
      prisma.budgetLine.findFirst
        .mockReset()
        .mockResolvedValueOnce({ ...sourceLine, budgetId: 'b1', budget: { id: 'b1', status: BudgetStatus.VALIDATED } })
        .mockResolvedValueOnce({ ...targetLine, budgetId: 'b2', budget: { id: 'b2', status: BudgetStatus.VALIDATED } });

      await expect(
        service.create(clientId, { sourceLineId, targetLineId, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('source ligne autre client (non trouvée) => NotFoundException', async () => {
      prisma.budgetLine.findFirst.mockReset().mockResolvedValueOnce(null).mockResolvedValueOnce(targetLine);

      await expect(
        service.create(clientId, { sourceLineId, targetLineId, amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('target ligne autre client (non trouvée) => NotFoundException', async () => {
      prisma.budgetLine.findFirst.mockReset().mockResolvedValueOnce(sourceLine).mockResolvedValueOnce(null);

      await expect(
        service.create(clientId, { sourceLineId, targetLineId, amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('devise différente => BadRequestException', async () => {
      prisma.budgetLine.findFirst
        .mockReset()
        .mockResolvedValueOnce({ ...sourceLine, currency: 'EUR', budget: sourceLine.budget })
        .mockResolvedValueOnce({ ...targetLine, currency: 'USD', budget: targetLine.budget });

      await expect(
        service.create(clientId, { sourceLineId, targetLineId, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('budget LOCKED => BadRequestException', async () => {
      prisma.budgetLine.findFirst
        .mockReset()
        .mockResolvedValueOnce({ ...sourceLine, budget: { id: budgetId, status: BudgetStatus.LOCKED } })
        .mockResolvedValueOnce({ ...targetLine, budget: { id: budgetId, status: BudgetStatus.LOCKED } });

      await expect(
        service.create(clientId, { sourceLineId, targetLineId, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('budget ARCHIVED => BadRequestException', async () => {
      prisma.budgetLine.findFirst
        .mockReset()
        .mockResolvedValueOnce({ ...sourceLine, budget: { id: budgetId, status: BudgetStatus.ARCHIVED } })
        .mockResolvedValueOnce({ ...targetLine, budget: { id: budgetId, status: BudgetStatus.ARCHIVED } });

      await expect(
        service.create(clientId, { sourceLineId, targetLineId, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('source line hors pilotage (DRAFT) => BadRequestException', async () => {
      prisma.budgetLine.findFirst
        .mockReset()
        .mockResolvedValueOnce({
          ...sourceLine,
          status: BudgetLineStatus.DRAFT,
          budget: sourceLine.budget,
        })
        .mockResolvedValueOnce({ ...targetLine, budget: targetLine.budget });

      await expect(
        service.create(clientId, { sourceLineId, targetLineId, amount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('si la transaction échoue, audit non appelé', async () => {
      prisma.$transaction.mockRejectedValueOnce(new Error('Tx failed'));

      await expect(
        service.create(clientId, { sourceLineId, targetLineId, amount: 500 }),
      ).rejects.toThrow('Tx failed');
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('recalcul appelé pour source puis cible (ligne source remaining diminue, cible augmente après recalcul)', async () => {
      await service.create(clientId, {
        sourceLineId,
        targetLineId,
        amount: 500,
      });
      expect(calculator.recalculateForBudgetLine).toHaveBeenCalledTimes(2);
      expect(calculator.recalculateForBudgetLine).toHaveBeenNthCalledWith(
        1,
        sourceLineId,
        clientId,
        expect.anything(),
      );
      expect(calculator.recalculateForBudgetLine).toHaveBeenNthCalledWith(
        2,
        targetLineId,
        clientId,
        expect.anything(),
      );
    });

    it('reason vide ou whitespace stocké comme null', async () => {
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          budgetReallocation: {
            create: jest.fn().mockImplementation((args: any) => {
              expect(args.data.reason).toBeNull();
              return Promise.resolve({ ...createdReallocation, reason: null });
            }),
          },
          financialEvent: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });
      await service.create(clientId, {
        sourceLineId,
        targetLineId,
        amount: 500,
        reason: '   ',
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('retourne items paginés avec filtre clientId', async () => {
      prisma.budgetReallocation = {
        findMany: jest.fn().mockResolvedValue([createdReallocation]),
        count: jest.fn().mockResolvedValue(1),
      };

      const result = await service.list(clientId, { limit: 20, offset: 0 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(prisma.budgetReallocation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('dateFrom > dateTo => BadRequestException', async () => {
      prisma.budgetReallocation = { findMany: jest.fn(), count: jest.fn() };
      const dateFrom = new Date('2026-02-01');
      const dateTo = new Date('2026-01-01');

      await expect(
        service.list(clientId, { dateFrom, dateTo }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetReallocation.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('retourne la réallocation si trouvée', async () => {
      prisma.budgetReallocation = { findFirst: jest.fn().mockResolvedValue(createdReallocation) };

      const result = await service.getById(clientId, createdReallocation.id);
      expect(result.id).toBe(createdReallocation.id);
      expect(result.amount).toBe(500);
    });

    it('NotFoundException si absente', async () => {
      prisma.budgetReallocation = { findFirst: jest.fn().mockResolvedValue(null) };

      await expect(service.getById(clientId, 'unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
