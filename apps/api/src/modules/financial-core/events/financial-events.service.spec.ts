import { NotFoundException } from '@nestjs/common';
import { FinancialEventType } from '@prisma/client';
import { FinancialEventsService } from './financial-events.service';
import { CreateFinancialEventDto } from './dto/create-financial-event.dto';
import * as budgetLineHelper from '../helpers/budget-line.helper';

describe('FinancialEventsService', () => {
  let service: FinancialEventsService;
  let prisma: any;
  let calculator: any;
  let auditLogs: any;

  const clientId = 'client-1';
  const budgetLineId = 'line-1';

  beforeEach(() => {
    prisma = {
      budgetLine: { findFirst: jest.fn() },
      financialEvent: {
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
    service = new FinancialEventsService(prisma, calculator, auditLogs);
  });

  describe('create', () => {
    it('crée un événement COMMITMENT_REGISTERED et appelle le recalcul puis l\'audit', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);
      const created = {
        id: 'evt-1',
        budgetLineId,
        eventType: FinancialEventType.COMMITMENT_REGISTERED,
        amount: 50,
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Commitment',
      };
      prisma.financialEvent.create.mockResolvedValue(created);

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'ORDER' as any,
        sourceId: 'ord-1',
        eventType: FinancialEventType.COMMITMENT_REGISTERED,
        amount: 50,
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Commitment',
      };

      const result = await service.create(clientId, dto, {
        actorUserId: 'user-1',
        meta: {},
      });

      expect(calculator.recalculateForBudgetLine).toHaveBeenCalledWith(
        budgetLineId,
        clientId,
        prisma,
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'financial_event.created',
          resourceType: 'financial_event',
          resourceId: created.id,
          clientId,
        }),
      );
      expect(result).toEqual(created);
    });

    it('crée un événement LINE_CREATED sans appeler le recalcul', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);
      const created = {
        id: 'evt-2',
        budgetLineId,
        eventType: FinancialEventType.LINE_CREATED,
        amount: 0,
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Line created',
      };
      prisma.financialEvent.create.mockResolvedValue(created);

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.LINE_CREATED,
        amount: 0,
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Line created',
      };

      await service.create(clientId, dto);

      expect(calculator.recalculateForBudgetLine).not.toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalled();
    });

    it('isolation client : budgetLine d\'un autre client → NotFoundException', async () => {
      jest
        .spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient')
        .mockRejectedValue(new NotFoundException('not found'));

      const dto: CreateFinancialEventDto = {
        budgetLineId: 'line-other',
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.ADJUSTMENT,
        amount: 10,
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Adjustment',
      };

      await expect(service.create(clientId, dto)).rejects.toThrow(NotFoundException);
      expect(auditLogs.create).not.toHaveBeenCalled();
    });
  });

  describe('listByBudgetLine', () => {
    it('vérifie que la ligne appartient au client puis retourne la liste', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);
      prisma.financialEvent.findMany.mockResolvedValue([]);
      prisma.financialEvent.count.mockResolvedValue(0);

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
    });
  });
});
