import { NotFoundException } from '@nestjs/common';
import { FinancialSourceType } from '@prisma/client';
import { FinancialAllocationsService } from './financial-allocations.service';
import { CreateFinancialAllocationDto } from './dto/create-financial-allocation.dto';
import * as budgetLineHelper from '../helpers/budget-line.helper';

describe('FinancialAllocationsService', () => {
  let service: FinancialAllocationsService;
  let prisma: any;
  let calculator: any;
  let auditLogs: any;

  const clientId = 'client-1';
  const budgetLineId = 'line-1';

  beforeEach(() => {
    prisma = {
      budgetLine: { findFirst: jest.fn() },
      financialAllocation: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    calculator = {
      recalculateForBudgetLine: jest.fn().mockResolvedValue(undefined),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new FinancialAllocationsService(prisma, calculator, auditLogs);
  });

  describe('create', () => {
    it('crée une allocation et appelle le recalcul puis l\'audit', async () => {
      const line = { id: budgetLineId, clientId };
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue(line as any);
      const created = {
        id: 'alloc-1',
        budgetLineId,
        sourceType: FinancialSourceType.PROJECT,
        allocationType: 'COMMITTED' as any,
        allocatedAmount: 100,
        currency: 'EUR',
      };
      prisma.financialAllocation.create.mockResolvedValue(created);

      const dto: CreateFinancialAllocationDto = {
        budgetLineId,
        sourceType: FinancialSourceType.PROJECT,
        sourceId: 'proj-1',
        allocationType: 'COMMITTED' as any,
        allocatedAmount: 100,
        currency: 'EUR',
      };

      const result = await service.create(clientId, dto, {
        actorUserId: 'user-1',
        meta: {},
      });

      expect(budgetLineHelper.assertBudgetLineExistsForClient).toHaveBeenCalledWith(
        prisma,
        budgetLineId,
        clientId,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(calculator.recalculateForBudgetLine).toHaveBeenCalledWith(
        budgetLineId,
        clientId,
        prisma,
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'financial_allocation.created',
          resourceType: 'financial_allocation',
          resourceId: created.id,
          clientId,
          userId: 'user-1',
        }),
      );
      expect(result).toEqual(created);
    });

    it('isolation client : budgetLine d\'un autre client → NotFoundException', async () => {
      jest
        .spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient')
        .mockRejectedValue(new NotFoundException('not found'));

      const dto: CreateFinancialAllocationDto = {
        budgetLineId: 'line-other-client',
        sourceType: FinancialSourceType.MANUAL,
        sourceId: '',
        allocationType: 'FORECAST' as any,
        allocatedAmount: 50,
        currency: 'EUR',
      };

      await expect(service.create(clientId, dto)).rejects.toThrow(NotFoundException);
      expect(auditLogs.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('retourne items, total, limit, offset', async () => {
      prisma.financialAllocation.findMany.mockResolvedValue([{ id: 'a1' }]);
      prisma.financialAllocation.count.mockResolvedValue(1);

      const result = await service.list(clientId, { limit: 20, offset: 0 });

      expect(result).toEqual({
        items: [{ id: 'a1' }],
        total: 1,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('listByBudgetLine', () => {
    it('vérifie que la ligne appartient au client puis retourne la liste', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialAllocation.count.mockResolvedValue(0);

      const result = await service.listByBudgetLine(clientId, budgetLineId, {
        limit: 10,
        offset: 0,
      });

      expect(budgetLineHelper.assertBudgetLineExistsForClient).toHaveBeenCalledWith(
        prisma,
        budgetLineId,
        clientId,
      );
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });
});
