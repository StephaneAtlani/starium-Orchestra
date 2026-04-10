import { BadRequestException } from '@nestjs/common';
import { BudgetLinePlanningMode, BudgetLineStatus, BudgetStatus, Prisma } from '@prisma/client';
import { BudgetLinePlanningService } from '../budget-lines/budget-line-planning.service';

describe('BudgetLinePlanningService (audit & core behavior)', () => {
  let service: BudgetLinePlanningService;
  let prisma: any;
  let auditLogs: any;

  const clientId = 'client-1';
  const lineId = 'line-1';

  const editableLine = () => ({
    id: lineId,
    clientId,
    budgetId: 'budget-1',
    status: BudgetLineStatus.DRAFT,
    initialAmount: new Prisma.Decimal(1200),
    consumedAmount: new Prisma.Decimal(0),
    committedAmount: new Prisma.Decimal(0),
    budget: {
      id: 'budget-1',
      clientId,
      status: BudgetStatus.DRAFT,
      isVersioned: false,
      versionStatus: null,
    },
  });

  const lineWithPlanning = (overrides: Partial<any> = {}) => ({
    id: lineId,
    clientId,
    consumedAmount: new Prisma.Decimal(0),
    committedAmount: new Prisma.Decimal(0),
    initialAmount: new Prisma.Decimal(1200),
    planningMode: BudgetLinePlanningMode.MANUAL,
    budget: {
      id: 'budget-1',
      clientId,
      status: BudgetStatus.DRAFT,
      isVersioned: false,
      versionStatus: null,
      exercise: {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    },
    planningMonths: Array.from({ length: 12 }, (_, idx) => ({
      monthIndex: idx + 1,
      amount: new Prisma.Decimal(100),
    })),
    planningScenarios: [],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      budgetLine: {
        findFirst: jest.fn().mockResolvedValue(lineWithPlanning()),
        findFirstOrThrow: jest.fn().mockResolvedValue(lineWithPlanning()),
        update: jest.fn().mockResolvedValue({}),
      },
      budgetLinePlanningMonth: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      budgetLinePlanningScenario: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          budgetLine: prisma.budgetLine,
          budgetLinePlanningMonth: prisma.budgetLinePlanningMonth,
          budgetLinePlanningScenario: prisma.budgetLinePlanningScenario,
        };
        return cb(tx);
      }),
    };

    auditLogs = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    service = new BudgetLinePlanningService(prisma, auditLogs);
  });

  describe('replaceManualPlanning', () => {
    it('remplace les 12 mois, met à jour le mode et écrit un audit canonique budget_line.planning.updated', async () => {
      const dto = {
        months: Array.from({ length: 12 }, (_, idx) => ({
          monthIndex: idx + 1,
          amount: 50,
        })),
      };

      const context = {
        actorUserId: 'user-1',
        meta: {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          requestId: 'req-1',
        },
      };

      const result = await service.replaceManualPlanning(clientId, lineId, dto as any, context as any);

      expect(prisma.budgetLinePlanningMonth.deleteMany).toHaveBeenCalledWith({
        where: { clientId, budgetLineId: lineId },
      });
      expect(prisma.budgetLinePlanningMonth.createMany).toHaveBeenCalled();
      expect(prisma.budgetLine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: lineId },
          data: expect.objectContaining({
            planningMode: BudgetLinePlanningMode.MANUAL,
          }),
        }),
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId,
          userId: 'user-1',
          action: 'budget_line.planning.updated',
          resourceType: 'budget_line',
          resourceId: lineId,
          oldValue: expect.any(Object),
          newValue: expect.objectContaining({
            mode: BudgetLinePlanningMode.MANUAL,
            planningTotalAmount: result.planningTotalAmount,
            months: expect.any(Array),
          }),
        }),
      );

      expect(result.months).toHaveLength(12);
      expect(result.planningMode).toBe(BudgetLinePlanningMode.MANUAL);
      expect(result.planningDelta).toBe(result.deltaVsBudget);
      expect(result.landingVariance).toBe(result.variance);
    });

    it('rejette un tableau de mois invalide (index hors bornes ou montant négatif)', async () => {
      await expect(
        service.replaceManualPlanning(
          clientId,
          lineId,
          {
            months: [{ monthIndex: 0, amount: 10 }],
          } as any,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.replaceManualPlanning(
          clientId,
          lineId,
          {
            months: [{ monthIndex: 1, amount: -1 }],
          } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyAnnualSpread', () => {
    it('crée un scenario non manuel et écrit un audit canonique budget_line.planning.applied_mode', async () => {
      const dto = {
        annualAmount: 1200,
        activeMonthIndexes: [1, 2, 3],
      };

      const context = {
        actorUserId: 'user-2',
        meta: {
          ipAddress: '10.0.0.1',
          userAgent: 'jest',
          requestId: 'req-2',
        },
      };

      const result = await service.applyAnnualSpread(clientId, lineId, dto as any, context as any);

      expect(prisma.budgetLinePlanningScenario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId,
            budgetLineId: lineId,
            mode: BudgetLinePlanningMode.ANNUAL_SPREAD,
            inputJson: dto,
            createdById: 'user-2',
          }),
        }),
      );

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId,
          userId: 'user-2',
          action: 'budget_line.planning.applied_mode',
          resourceType: 'budget_line',
          resourceId: lineId,
          oldValue: expect.any(Object),
          newValue: expect.objectContaining({
            mode: BudgetLinePlanningMode.ANNUAL_SPREAD,
            planningTotalAmount: result.planningTotalAmount,
            input: dto,
          }),
        }),
      );
    });

    it('rejette activeMonthIndexes vide', async () => {
      await expect(
        service.applyAnnualSpread(
          clientId,
          lineId,
          { annualAmount: 1000, activeMonthIndexes: [] } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('calculateFormula & applyCalculation (audit CALCULATED)', () => {
    it('calculateFormula renvoie une preview et écrit un audit budget_line.planning.previewed', async () => {
      prisma.budgetLine.findFirst.mockResolvedValueOnce(editableLine());

      const dto = {
        formulaType: 'QUANTITY_X_UNIT_PRICE',
        quantity: {
          startValue: 10,
          growthType: 'PERCENT',
          growthValue: 0,
          growthFrequency: 'MONTHLY',
        },
        unitPrice: {
          value: 5,
        },
        activeMonthIndexes: [1, 2, 3],
      };

      const preview = await service.calculateFormula(clientId, lineId, dto as any);

      expect(preview.previewMonths).toHaveLength(12);
      expect(preview.previewTotalAmount).toBeGreaterThan(0);

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId,
          action: 'budget_line.planning.previewed',
          resourceType: 'budget_line',
          resourceId: lineId,
          newValue: expect.objectContaining({
            mode: BudgetLinePlanningMode.CALCULATED,
            planningTotalAmount: preview.previewTotalAmount,
            input: dto,
          }),
        }),
      );
    });

    it('applyCalculation applique la formule et écrit un audit budget_line.planning.applied_mode', async () => {
      prisma.budgetLine.findFirstOrThrow.mockResolvedValue(
        lineWithPlanning({ planningMode: BudgetLinePlanningMode.CALCULATED }),
      );

      const dto = {
        formulaType: 'QUANTITY_X_UNIT_PRICE',
        quantity: {
          startValue: 10,
          growthType: 'FIXED',
          growthValue: 1,
          growthFrequency: 'MONTHLY',
        },
        unitPrice: {
          value: 2,
        },
        activeMonthIndexes: [1, 2, 3, 4],
      };

      const context = {
        actorUserId: 'user-3',
        meta: {
          ipAddress: '10.0.0.3',
          userAgent: 'jest',
          requestId: 'req-3',
        },
      };

      const result = await service.applyCalculation(clientId, lineId, dto as any, context as any);

      expect(result.months).toHaveLength(12);
      expect(result.planningMode).toBe(BudgetLinePlanningMode.CALCULATED);

      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId,
          userId: 'user-3',
          action: 'budget_line.planning.applied_mode',
          resourceType: 'budget_line',
          resourceId: lineId,
          newValue: expect.objectContaining({
            mode: BudgetLinePlanningMode.CALCULATED,
            planningTotalAmount: result.planningTotalAmount,
            input: dto,
          }),
        }),
      );
    });
  });
});
