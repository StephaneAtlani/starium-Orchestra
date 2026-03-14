import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpenseType } from '@prisma/client';
import { BudgetLineStatus, BudgetStatus } from '@prisma/client';
import { BudgetLinesService } from '../budget-lines/budget-lines.service';

describe('BudgetLinesService', () => {
  let service: BudgetLinesService;
  let prisma: any;
  let auditLogs: any;

  const clientId = 'client-1';
  const budgetId = 'budget-1';
  const envelopeId = 'env-1';

  beforeEach(() => {
    prisma = {
      budget: { findFirst: jest.fn() },
      budgetEnvelope: { findFirst: jest.fn() },
      budgetLine: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetLinesService(prisma, auditLogs);
  });

  describe('create', () => {
    it('enveloppe et budget cohérents + initialisation des montants', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        status: BudgetStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetEnvelope.findFirst.mockResolvedValue({
        id: envelopeId,
        clientId,
        budgetId,
        name: 'E',
        code: 'E',
        type: 'RUN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetLine.findUnique.mockResolvedValue(null);
      prisma.budgetLine.create.mockResolvedValue({
        id: 'line-1',
        clientId,
        budgetId,
        envelopeId,
        name: 'Line',
        code: 'BL-1',
        expenseType: ExpenseType.OPEX,
        status: BudgetLineStatus.DRAFT,
        currency: 'EUR',
        initialAmount: 1000,
        revisedAmount: 1000,
        forecastAmount: 0,
        committedAmount: 0,
        consumedAmount: 0,
        remainingAmount: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        clientId,
        {
          budgetId,
          envelopeId,
          name: 'Line',
          code: 'BL-1',
          expenseType: ExpenseType.OPEX,
          initialAmount: 1000,
          currency: 'EUR',
        },
        { actorUserId: 'user-1', meta: {} },
      );

      const createCall = prisma.budgetLine.create.mock.calls[0][0];
      expect(createCall.data.initialAmount).toBeDefined();
      expect(Number(createCall.data.revisedAmount)).toBe(1000);
      expect(Number(createCall.data.forecastAmount)).toBe(0);
      expect(Number(createCall.data.committedAmount)).toBe(0);
      expect(Number(createCall.data.consumedAmount)).toBe(0);
      expect(Number(createCall.data.remainingAmount)).toBe(1000);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget_line.created',
          resourceType: 'budget_line',
        }),
      );
      expect(result.initialAmount).toBe(1000);
      expect(result.remainingAmount).toBe(1000);
    });

    it('rejet si envelope.budgetId !== budgetId', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        status: BudgetStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetEnvelope.findFirst.mockResolvedValue({
        id: envelopeId,
        clientId,
        budgetId: 'other-budget',
        name: 'E',
        code: 'E',
        type: 'RUN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create(clientId, {
          budgetId,
          envelopeId,
          name: 'L',
          expenseType: ExpenseType.OPEX,
          initialAmount: 100,
          currency: 'EUR',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetLine.create).not.toHaveBeenCalled();
    });

    it('rejet si budget parent LOCKED', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        status: BudgetStatus.LOCKED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create(clientId, {
          budgetId,
          envelopeId,
          name: 'L',
          expenseType: ExpenseType.OPEX,
          initialAmount: 100,
          currency: 'EUR',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('recalcule remainingAmount si revisedAmount change', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue({
        id: 'line-1',
        clientId,
        budgetId,
        envelopeId,
        name: 'L',
        code: 'BL-1',
        expenseType: ExpenseType.OPEX,
        status: BudgetLineStatus.DRAFT,
        currency: 'EUR',
        initialAmount: 1000,
        revisedAmount: 1000,
        forecastAmount: 0,
        committedAmount: 200,
        consumedAmount: 100,
        remainingAmount: 700,
        budget: { status: BudgetStatus.DRAFT },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetLine.update.mockResolvedValue({
        id: 'line-1',
        revisedAmount: 1500,
        remainingAmount: 1200,
        committedAmount: 200,
        consumedAmount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update(
        clientId,
        'line-1',
        { revisedAmount: 1500 },
        { actorUserId: 'user-1', meta: {} },
      );

      const updateCall = prisma.budgetLine.update.mock.calls[0][0];
      expect(updateCall.data.revisedAmount).toBeDefined();
      expect(updateCall.data.remainingAmount).toBeDefined();
      expect(Number(updateCall.data.remainingAmount)).toBe(1200); // 1500 - 200 - 100
    });

    it('rejet si ligne ARCHIVED', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue({
        id: 'line-1',
        clientId,
        budgetId,
        envelopeId,
        status: BudgetLineStatus.ARCHIVED,
        budget: { status: BudgetStatus.DRAFT },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        service.update(clientId, 'line-1', { name: 'New' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetLine.update).not.toHaveBeenCalled();
    });

    it('retourne 404 si ligne hors client', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue(null);

      await expect(
        service.getById(clientId, 'line-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
