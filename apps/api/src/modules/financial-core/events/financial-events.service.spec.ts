import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FinancialEventType, Prisma } from '@prisma/client';
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
        amountHt: new Prisma.Decimal(50),
        taxRate: new Prisma.Decimal(20),
        taxAmount: new Prisma.Decimal(10),
        amountTtc: new Prisma.Decimal(60),
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
        amountHt: '50',
        taxRate: '20',
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
          action: 'financial-event.created',
          resourceType: 'financial_event',
          resourceId: created.id,
          clientId,
          newValue: expect.objectContaining({
            amountHt: 50,
            taxRate: 20,
            taxAmount: 10,
            amountTtc: 60,
          }),
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
        amountHt: new Prisma.Decimal(0),
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        amountTtc: new Prisma.Decimal(0),
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Line created',
      };
      prisma.financialEvent.create.mockResolvedValue(created);

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: '0',
        taxRate: '0',
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Line created',
      };

      await service.create(clientId, dto);

      expect(calculator.recalculateForBudgetLine).not.toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalled();
    });

    it('combo1 amountHt + taxRate calc taxAmount + amountTtc', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);

      prisma.financialEvent.create.mockResolvedValue({
        id: 'evt-3',
        budgetLineId,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: new Prisma.Decimal(50),
        taxRate: new Prisma.Decimal(20),
        taxAmount: new Prisma.Decimal(10),
        amountTtc: new Prisma.Decimal(60),
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Combo1',
      });

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: '50',
        taxRate: '20',
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Combo1',
      };

      await service.create(clientId, dto);

      const call = prisma.financialEvent.create.mock.calls[0][0];
      expect(Number(call.data.amountHt)).toBe(50);
      expect(Number(call.data.taxRate)).toBe(20);
      expect(Number(call.data.taxAmount)).toBe(10);
      expect(Number(call.data.amountTtc)).toBe(60);
    });

    it('combo2 amountTtc + taxRate calc amountHt + taxAmount', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);

      prisma.financialEvent.create.mockResolvedValue({
        id: 'evt-4',
        budgetLineId,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: new Prisma.Decimal(100),
        taxRate: new Prisma.Decimal(20),
        taxAmount: new Prisma.Decimal(20),
        amountTtc: new Prisma.Decimal(120),
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Combo2',
      });

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.LINE_CREATED,
        amountTtc: '120',
        taxRate: '20',
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Combo2',
      };

      await service.create(clientId, dto);

      const call = prisma.financialEvent.create.mock.calls[0][0];
      expect(Number(call.data.amountHt)).toBe(100);
      expect(Number(call.data.taxAmount)).toBe(20);
      expect(Number(call.data.amountTtc)).toBe(120);
    });

    it('combo3 amountHt + taxAmount + amountTtc calc taxRate dérivé', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);

      prisma.financialEvent.create.mockResolvedValue({
        id: 'evt-5',
        budgetLineId,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: new Prisma.Decimal(100),
        taxRate: new Prisma.Decimal(20),
        taxAmount: new Prisma.Decimal(20),
        amountTtc: new Prisma.Decimal(120),
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Combo3',
      });

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: '100',
        taxAmount: '20',
        amountTtc: '120',
        currency: 'EUR',
        eventDate: new Date(),
        label: 'Combo3',
      };

      await service.create(clientId, dto);

      const call = prisma.financialEvent.create.mock.calls[0][0];
      expect(Number(call.data.taxRate)).toBe(20);
      expect(Number(call.data.taxAmount)).toBe(20);
      expect(Number(call.data.amountTtc)).toBe(120);
    });

    it('taxRate=0 calc taxe nulle', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);

      prisma.financialEvent.create.mockResolvedValue({
        id: 'evt-6',
        budgetLineId,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: new Prisma.Decimal(99.99),
        taxRate: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        amountTtc: new Prisma.Decimal(99.99),
        currency: 'EUR',
        eventDate: new Date(),
        label: 'taxRate0',
      });

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: '99.99',
        taxRate: '0',
        currency: 'EUR',
        eventDate: new Date(),
        label: 'taxRate0',
      };

      await service.create(clientId, dto);

      const call = prisma.financialEvent.create.mock.calls[0][0];
      expect(Number(call.data.taxAmount)).toBe(0);
      expect(Number(call.data.amountTtc)).toBe(99.99);
    });

    it('rejette une incohérence combo3 (amountTtc mismatch)', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: '100',
        taxAmount: '20',
        amountTtc: '119.99',
        currency: 'EUR',
        eventDate: new Date(),
        label: 'bad-combo3',
      };

      await expect(service.create(clientId, dto)).rejects.toThrow(BadRequestException);
      expect(prisma.financialEvent.create).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });

    it('rejette une saisie ambiguë (amountHt + amountTtc + taxRate)', async () => {
      jest.spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient').mockResolvedValue({} as any);

      const dto: CreateFinancialEventDto = {
        budgetLineId,
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.LINE_CREATED,
        amountHt: '100',
        amountTtc: '120',
        taxRate: '20',
        currency: 'EUR',
        eventDate: new Date(),
        label: 'ambiguous',
      };

      await expect(service.create(clientId, dto)).rejects.toThrow(BadRequestException);
      expect(prisma.financialEvent.create).not.toHaveBeenCalled();
    });

    it('isolation client : budgetLine d\'un autre client → NotFoundException', async () => {
      jest
        .spyOn(budgetLineHelper, 'assertBudgetLineExistsForClient')
        .mockRejectedValue(new NotFoundException('not found'));

      const dto: CreateFinancialEventDto = {
        budgetLineId: 'line-other',
        sourceType: 'MANUAL' as any,
        eventType: FinancialEventType.ADJUSTMENT,
        amountHt: '10',
        taxRate: '0',
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
