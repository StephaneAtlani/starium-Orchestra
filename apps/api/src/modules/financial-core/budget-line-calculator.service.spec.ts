import { Test, TestingModule } from '@nestjs/testing';
import { AllocationType, FinancialEventType, Prisma } from '@prisma/client';
import { BudgetLineCalculatorService } from './budget-line-calculator.service';
import { BudgetLandingService } from '../budget-landing/budget-landing.service';

jest.mock('./helpers/budget-line.helper', () => ({
  assertBudgetLineExistsForClient: jest.fn().mockResolvedValue(undefined),
}));

describe('BudgetLineCalculatorService', () => {
  let service: BudgetLineCalculatorService;
  let landingService: { recalculateAndPersist: jest.Mock };
  let prisma: any;

  const clientId = 'client-1';
  const budgetLineId = 'line-1';

  beforeEach(() => {
    landingService = {
      recalculateAndPersist: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      budgetLine: {
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      financialAllocation: { findMany: jest.fn() },
      financialEvent: { findMany: jest.fn() },
    };
    service = new BudgetLineCalculatorService(
      prisma,
      landingService as unknown as BudgetLandingService,
    );
  });

  describe('recalculateForBudgetLine', () => {
    it('ne persiste plus forecastAmount depuis allocations FORECAST', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        initialAmount: new Prisma.Decimal(1000),
      });
      prisma.financialAllocation.findMany.mockResolvedValue([
        {
          allocationType: AllocationType.FORECAST,
          allocatedAmount: new Prisma.Decimal(300),
        },
      ]);
      prisma.financialEvent.findMany.mockResolvedValue([]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(updateData.forecastAmount).toBeUndefined();
      expect(landingService.recalculateAndPersist).toHaveBeenCalledWith(
        clientId,
        budgetLineId,
        undefined,
        undefined,
      );
    });

    it('calcule committedAmount (COMMITTED + COMMITMENT_REGISTERED)', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        initialAmount: new Prisma.Decimal(5000),
      });
      prisma.financialAllocation.findMany.mockResolvedValue([
        {
          allocationType: AllocationType.COMMITTED,
          allocatedAmount: new Prisma.Decimal(100),
        },
        {
          allocationType: AllocationType.COMMITTED,
          allocatedAmount: new Prisma.Decimal(50.5),
        },
      ]);
      prisma.financialEvent.findMany.mockResolvedValue([
        {
          eventType: FinancialEventType.COMMITMENT_REGISTERED,
          amountHt: new Prisma.Decimal(99.99),
        },
      ]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(Number(updateData.committedAmount)).toBeCloseTo(250.49);
    });

    it('calcule remainingAmount avec base effective incluant réallocations', async () => {
      prisma.budgetLine.findUniqueOrThrow.mockResolvedValue({
        initialAmount: new Prisma.Decimal(1000),
      });
      prisma.financialAllocation.findMany.mockResolvedValue([
        {
          allocationType: AllocationType.COMMITTED,
          allocatedAmount: new Prisma.Decimal(300),
        },
        {
          allocationType: AllocationType.CONSUMED,
          allocatedAmount: new Prisma.Decimal(100),
        },
      ]);
      prisma.financialEvent.findMany.mockResolvedValue([
        {
          eventType: FinancialEventType.REALLOCATION_DONE,
          amountHt: new Prisma.Decimal(200),
        },
      ]);
      prisma.budgetLine.update.mockResolvedValue({});

      await service.recalculateForBudgetLine(budgetLineId, clientId);

      const updateData = prisma.budgetLine.update.mock.calls[0][0].data;
      expect(Number(updateData.remainingAmount)).toBe(800);
    });
  });
});
