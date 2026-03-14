import { AllocationType, FinancialEventType } from '@prisma/client';
import { BudgetLineCalculatorService } from './budget-line-calculator.service';

jest.mock('./helpers/budget-line.helper', () => ({
  assertBudgetLineExistsForClient: jest.fn().mockResolvedValue(undefined),
}));

describe('BudgetLineCalculatorService', () => {
  let service: BudgetLineCalculatorService;
  let prisma: any;

  const clientId = 'client-1';
  const budgetLineId = 'line-1';

  beforeEach(() => {
    prisma = {
      budgetLine: {
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      financialAllocation: { findMany: jest.fn() },
      financialEvent: { findMany: jest.fn() },
    };
    service = new BudgetLineCalculatorService(prisma);
  });

  describe('recalculateForBudgetLine', () => {
    it('calcule forecastAmount comme somme des allocations FORECAST', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        revisedAmount: 1000,
      });
      prisma.financialAllocation.findMany.mockResolvedValue([
        { allocationType: AllocationType.FORECAST, allocatedAmount: 100.5 },
        { allocationType: AllocationType.FORECAST, allocatedAmount: 200.49 },
      ]);
      prisma.financialEvent.findMany.mockResolvedValue([]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      expect(prisma.budgetLine.update).toHaveBeenCalledWith({
        where: { id: budgetLineId },
        data: expect.objectContaining({
          forecastAmount: expect.anything(),
        }),
      });
      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(Number(updateData.forecastAmount)).toBeCloseTo(300.99);
    });

    it('calcule committedAmount (COMMITTED + COMMITMENT_REGISTERED)', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        revisedAmount: 5000,
      });
      prisma.financialAllocation.findMany.mockResolvedValue([
        { allocationType: AllocationType.COMMITTED, allocatedAmount: 100 },
        { allocationType: AllocationType.COMMITTED, allocatedAmount: 50.5 },
      ]);
      prisma.financialEvent.findMany.mockResolvedValue([
        {
          eventType: FinancialEventType.COMMITMENT_REGISTERED,
          amount: 99.99,
        },
      ]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(Number(updateData.committedAmount)).toBeCloseTo(250.49);
    });

    it('calcule consumedAmount (CONSUMED + CONSUMPTION_REGISTERED)', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        revisedAmount: 1000,
      });
      prisma.financialAllocation.findMany.mockResolvedValue([
        { allocationType: AllocationType.CONSUMED, allocatedAmount: 10.01 },
        { allocationType: AllocationType.CONSUMED, allocatedAmount: 20.02 },
      ]);
      prisma.financialEvent.findMany.mockResolvedValue([
        {
          eventType: FinancialEventType.CONSUMPTION_REGISTERED,
          amount: 69.96,
        },
      ]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(Number(updateData.consumedAmount)).toBeCloseTo(99.99);
    });

    it('calcule remainingAmount = budgetBase - committed - consumed (décimaux)', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        revisedAmount: 1000.5,
      });
      prisma.financialAllocation.findMany.mockResolvedValue([
        { allocationType: AllocationType.COMMITTED, allocatedAmount: 100.5 },
        { allocationType: AllocationType.CONSUMED, allocatedAmount: 200.25 },
      ]);
      prisma.financialEvent.findMany.mockResolvedValue([]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      const remaining = Number(updateData.remainingAmount);
      expect(remaining).toBeCloseTo(1000.5 - 100.5 - 200.25);
      expect(remaining).toBeCloseTo(699.75);
    });

    it('utilise tx quand fourni', async () => {
      const tx = {
        budgetLine: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({ revisedAmount: 100 }),
          update: jest.fn().mockResolvedValue({}),
        },
        financialAllocation: { findMany: jest.fn().mockResolvedValue([]) },
        financialEvent: { findMany: jest.fn().mockResolvedValue([]) },
      };

      await service.recalculateForBudgetLine(budgetLineId, clientId, tx as any);

      expect(tx.budgetLine.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: budgetLineId, clientId },
        select: { revisedAmount: true },
      });
      expect(tx.budgetLine.update).toHaveBeenCalled();
      expect(prisma.budgetLine.update).not.toHaveBeenCalled();
    });

    it('revisedAmount 1000 + REALLOCATION_DONE +200 => effective base 1200', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        revisedAmount: 1000,
      });
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([
        { eventType: FinancialEventType.REALLOCATION_DONE, amount: 200 },
      ]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(Number(updateData.remainingAmount)).toBe(1200);
    });

    it('revisedAmount 1000 + REALLOCATION_DONE -200 => effective base 800', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        revisedAmount: 1000,
      });
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([
        { eventType: FinancialEventType.REALLOCATION_DONE, amount: -200 },
      ]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(Number(updateData.remainingAmount)).toBe(800);
    });

    it('revisedAmount 1000, REALLOCATION_DONE +200, committed 300, consumed 100 => remaining 800', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        revisedAmount: 1000,
      });
      prisma.financialAllocation.findMany.mockResolvedValue([
        { allocationType: AllocationType.COMMITTED, allocatedAmount: 300 },
        { allocationType: AllocationType.CONSUMED, allocatedAmount: 100 },
      ]);
      prisma.financialEvent.findMany.mockResolvedValue([
        { eventType: FinancialEventType.REALLOCATION_DONE, amount: 200 },
      ]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(Number(updateData.remainingAmount)).toBe(800);
    });
  });
});
