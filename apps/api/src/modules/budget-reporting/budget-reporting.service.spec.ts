import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetReportingService } from './budget-reporting.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BudgetReportingService', () => {
  let service: BudgetReportingService;
  let prisma: {
    budgetExercise: { findFirst: jest.Mock };
    budget: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    budgetEnvelope: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    budgetLine: { findMany: jest.Mock; count: jest.Mock };
  };

  const clientId = 'client-A';

  beforeEach(() => {
    prisma = {
      budgetExercise: { findFirst: jest.fn() },
      budget: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      budgetEnvelope: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      budgetLine: { findMany: jest.fn(), count: jest.fn() },
    };
    service = new BudgetReportingService(prisma as unknown as PrismaService);
  });

  describe('getExerciseSummary', () => {
    it('404 si exercice introuvable', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue(null);
      await expect(
        service.getExerciseSummary(clientId, 'absent'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budgetExercise.findFirst).toHaveBeenCalledWith({
        where: { id: 'absent', clientId },
        include: { budgets: { select: { id: true } } },
      });
    });

    it('retourne currency null si aucune ligne (exercice)', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue({
        id: 'ex-1',
        clientId,
        budgets: [{ id: 'b1' }],
      });
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.budgetEnvelope.count.mockResolvedValue(3);
      const result = await service.getExerciseSummary(clientId, 'ex-1');
      expect(result.currency).toBeNull();
      expect(result.lineCount).toBe(0);
      expect(result.budgetCount).toBe(1);
      expect(result.envelopeCount).toBe(3);
    });

    it('retourne 400 si plusieurs devises dans les lignes', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue({
        id: 'ex-1',
        clientId,
        budgets: [{ id: 'b1' }],
      });
      prisma.budgetLine.findMany.mockResolvedValue([
        { currency: 'EUR', initialAmount: 0, revisedAmount: 100, forecastAmount: 0, committedAmount: 0, consumedAmount: 0, remainingAmount: 100 },
        { currency: 'USD', initialAmount: 0, revisedAmount: 50, forecastAmount: 0, committedAmount: 0, consumedAmount: 0, remainingAmount: 50 },
      ]);
      prisma.budgetEnvelope.count.mockResolvedValue(1);
      await expect(
        service.getExerciseSummary(clientId, 'ex-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getExerciseSummary(clientId, 'ex-1'),
      ).rejects.toThrow(/plusieurs devises/);
    });
  });

  describe('getBudgetSummary', () => {
    it('404 si budget introuvable', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);
      await expect(
        service.getBudgetSummary(clientId, 'absent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('retourne budget.currency si aucune ligne', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: 'b1',
        clientId,
        currency: 'GBP',
      });
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.budgetEnvelope.count.mockResolvedValue(2);
      const result = await service.getBudgetSummary(clientId, 'b1');
      expect(result.currency).toBe('GBP');
      expect(result.lineCount).toBe(0);
    });
  });

  describe('getEnvelopeSummary', () => {
    it('404 si enveloppe introuvable', async () => {
      prisma.budgetEnvelope.findFirst.mockResolvedValue(null);
      await expect(
        service.getEnvelopeSummary(clientId, 'absent', false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listBudgetsForExercise', () => {
    it('404 si exercice introuvable', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue(null);
      await expect(
        service.listBudgetsForExercise(clientId, 'absent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listEnvelopesForBudget', () => {
    it('404 si budget introuvable', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);
      await expect(
        service.listEnvelopesForBudget(clientId, 'absent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listLinesForEnvelope', () => {
    it('404 si enveloppe introuvable', async () => {
      prisma.budgetEnvelope.findFirst.mockResolvedValue(null);
      await expect(
        service.listLinesForEnvelope(clientId, 'absent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBreakdownByType', () => {
    it('404 si budget introuvable', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);
      await expect(
        service.getBreakdownByType(clientId, 'absent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
