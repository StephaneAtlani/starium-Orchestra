import { NotFoundException } from '@nestjs/common';
import { BudgetDashboardService } from './budget-dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { DashboardQueryDto } from './dto/dashboard.query.dto';

const clientId = 'client-1';
const exerciseId = 'ex-1';
const budgetId = 'bud-1';

const mockBudget = {
  id: budgetId,
  name: 'Budget 1',
  code: 'B1',
  exerciseId,
  currency: 'EUR',
  status: 'ACTIVE',
};
const mockExercise = {
  id: exerciseId,
  name: 'Exercice 2025',
  code: '2025',
};
const mockVersionSet = {
  id: 'vs-1',
  clientId,
  exerciseId,
  activeBudgetId: budgetId,
  activeBudget: mockBudget,
};

function mockLine(overrides: Partial<{
  id: string;
  envelopeId: string;
  envelope: { id: string; code: string; name: string; type: string };
  revisedAmount: number;
  committedAmount: number;
  remainingAmount: number;
  consumedAmount: number;
  forecastAmount: number;
  expenseType: string;
  code: string;
  name: string;
}> = {}) {
  return {
    id: 'line-1',
    envelopeId: 'env-1',
    revisedAmount: 1000,
    committedAmount: 300,
    remainingAmount: 600,
    consumedAmount: 400,
    forecastAmount: 450,
    expenseType: 'OPEX',
    code: 'L1',
    name: 'Ligne 1',
    envelope: { id: 'env-1', code: 'E1', name: 'Enveloppe 1', type: 'RUN' },
    ...overrides,
  };
}

describe('BudgetDashboardService', () => {
  let service: BudgetDashboardService;
  let prisma: {
    budget: { findFirst: jest.Mock };
    budgetExercise: { findFirst: jest.Mock };
    budgetVersionSet: { findFirst: jest.Mock };
    budgetLine: { findMany: jest.Mock };
    financialAllocation: { findMany: jest.Mock };
    financialEvent: { findMany: jest.Mock };
    client: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      budget: { findFirst: jest.fn() },
      budgetExercise: { findFirst: jest.fn() },
      budgetVersionSet: { findFirst: jest.fn() },
      budgetLine: { findMany: jest.fn() },
      financialAllocation: { findMany: jest.fn() },
      financialEvent: { findMany: jest.fn() },
      client: { findUnique: jest.fn().mockResolvedValue({ defaultTaxRate: null }) },
    };
    service = new BudgetDashboardService(prisma as unknown as PrismaService);
  });

  describe('résolution budgetId', () => {
    it('retourne 404 si budget introuvable', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);
      await expect(
        service.getDashboard(clientId, { budgetId: 'absent' } as DashboardQueryDto),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budget.findFirst).toHaveBeenCalledWith({
        where: { id: 'absent', clientId },
      });
    });

    it('utilise le budget et charge l’exercice quand budgetId fourni', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([mockLine()]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
      } as DashboardQueryDto);

      expect(result.exercise.id).toBe(exerciseId);
      expect(result.budget.id).toBe(budgetId);
      expect(prisma.budgetVersionSet.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('résolution exerciseId', () => {
    it('404 si exercice introuvable', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue(null);
      await expect(
        service.getDashboard(clientId, { exerciseId: 'absent' } as DashboardQueryDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('utilise le budget versionné actif si disponible', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetVersionSet.findFirst.mockResolvedValue(mockVersionSet);
      prisma.budgetLine.findMany.mockResolvedValue([mockLine()]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        exerciseId,
      } as DashboardQueryDto);

      expect(result.budget.id).toBe(budgetId);
      expect(prisma.budget.findFirst).toHaveBeenCalledWith({
        where: { id: budgetId, clientId },
        select: { defaultTaxRate: true },
      });
    });

    it('404 si aucun budget pour l’exercice', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetVersionSet.findFirst.mockResolvedValue(null);
      prisma.budget.findFirst.mockResolvedValue(null);

      await expect(
        service.getDashboard(clientId, { exerciseId } as DashboardQueryDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('résolution sans paramètre', () => {
    it('404 si aucun exercice', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue(null);

      await expect(
        service.getDashboard(clientId, {} as DashboardQueryDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calcul KPI', () => {
    it('totalBudget et remaining depuis BudgetLine', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([
        mockLine({ revisedAmount: 1000, remainingAmount: 300 }),
        mockLine({ revisedAmount: 500, remainingAmount: 200 }),
      ]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
      } as DashboardQueryDto);

      expect(result.kpis.totalBudget).toBe(1500);
      expect(result.kpis.remaining).toBe(500);
    });

    it('consumptionRate = 0 si totalBudget = 0', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
      } as DashboardQueryDto);

      expect(result.kpis.consumptionRate).toBe(0);
    });
  });

  describe('riskEnvelopes seuils', () => {
    it('riskLevel LOW / MEDIUM / HIGH selon riskRatio', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([
        mockLine({
          envelopeId: 'e1',
          envelope: { id: 'e1', code: 'E1', name: 'E1', type: 'RUN' },
          revisedAmount: 100,
          forecastAmount: 50,
        }),
        mockLine({
          envelopeId: 'e2',
          envelope: { id: 'e2', code: 'E2', name: 'E2', type: 'RUN' },
          revisedAmount: 100,
          forecastAmount: 80,
        }),
        mockLine({
          envelopeId: 'e3',
          envelope: { id: 'e3', code: 'E3', name: 'E3', type: 'RUN' },
          revisedAmount: 100,
          forecastAmount: 95,
        }),
      ]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
        includeEnvelopes: true,
      } as DashboardQueryDto);

      expect(result.riskEnvelopes).toBeDefined();
      const low = result.riskEnvelopes!.find((r) => r.riskLevel === 'LOW');
      const medium = result.riskEnvelopes!.find((r) => r.riskLevel === 'MEDIUM');
      const high = result.riskEnvelopes!.find((r) => r.riskLevel === 'HIGH');
      expect(low).toBeDefined();
      expect(medium).toBeDefined();
      expect(high).toBeDefined();
      expect(low!.riskRatio).toBeLessThan(0.7);
      expect(medium!.riskRatio).toBeGreaterThanOrEqual(0.7);
      expect(medium!.riskRatio).toBeLessThanOrEqual(0.9);
      expect(high!.riskRatio).toBeGreaterThan(0.9);
    });
  });

  describe('includeEnvelopes false', () => {
    it('ne retourne pas topEnvelopes ni riskEnvelopes', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([mockLine()]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
        includeEnvelopes: false,
      } as DashboardQueryDto);

      expect(result.topEnvelopes).toBeUndefined();
      expect(result.riskEnvelopes).toBeUndefined();
      expect(result.kpis).toBeDefined();
      expect(result.monthlyTrend).toBeDefined();
    });
  });

  describe('includeLines false', () => {
    it('ne retourne pas topBudgetLines', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([mockLine()]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
        includeLines: false,
      } as DashboardQueryDto);

      expect(result.topBudgetLines).toBeUndefined();
      expect(result.criticalBudgetLines).toBeUndefined();
    });
  });

  describe('limite 10', () => {
    it('topEnvelopes au plus 10', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      const manyLines = Array.from({ length: 20 }, (_, i) =>
        mockLine({
          id: `line-${i}`,
          envelopeId: `env-${i}`,
          envelope: {
            id: `env-${i}`,
            code: `E${i}`,
            name: `Env ${i}`,
            type: 'RUN',
          },
        }),
      );
      prisma.budgetLine.findMany.mockResolvedValue(manyLines);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
        includeEnvelopes: true,
      } as DashboardQueryDto);

      expect(result.topEnvelopes!.length).toBeLessThanOrEqual(10);
    });

    it('topBudgetLines au plus 10', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      const manyLines = Array.from({ length: 15 }, (_, i) =>
        mockLine({ id: `line-${i}` }),
      );
      prisma.budgetLine.findMany.mockResolvedValue(manyLines);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
        includeLines: true,
      } as DashboardQueryDto);

      expect(result.topBudgetLines!.length).toBeLessThanOrEqual(10);
    });
  });

  describe('runBuildDistribution et alertsSummary', () => {
    it('agrège RUN / BUILD / TRANSVERSE sur revisedAmount', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([
        mockLine({
          revisedAmount: 100,
          envelope: { id: 'a', code: 'A', name: 'A', type: 'RUN' },
        }),
        mockLine({
          revisedAmount: 200,
          envelope: { id: 'b', code: 'B', name: 'B', type: 'BUILD' },
        }),
        mockLine({
          revisedAmount: 50,
          envelope: { id: 'c', code: 'C', name: 'C', type: 'TRANSVERSE' },
        }),
      ]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
      } as DashboardQueryDto);

      expect(result.runBuildDistribution).toEqual({
        run: 100,
        build: 200,
        transverse: 50,
      });
    });

    it('alertsSummary compte les lignes selon les règles', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([
        mockLine({
          id: 'l1',
          remainingAmount: -10,
          revisedAmount: 100,
          committedAmount: 50,
          consumedAmount: 30,
          forecastAmount: 40,
        }),
        mockLine({
          id: 'l2',
          remainingAmount: 20,
          revisedAmount: 100,
          committedAmount: 150,
          consumedAmount: 50,
          forecastAmount: 40,
        }),
        mockLine({
          id: 'l3',
          remainingAmount: 20,
          revisedAmount: 100,
          committedAmount: 50,
          consumedAmount: 120,
          forecastAmount: 40,
        }),
        mockLine({
          id: 'l4',
          remainingAmount: 20,
          revisedAmount: 100,
          committedAmount: 50,
          consumedAmount: 30,
          forecastAmount: 150,
        }),
      ]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
      } as DashboardQueryDto);

      expect(result.alertsSummary.negativeRemaining).toBe(1);
      expect(result.alertsSummary.overCommitted).toBe(1);
      expect(result.alertsSummary.overConsumed).toBe(1);
      expect(result.alertsSummary.forecastOverBudget).toBe(1);
    });

    it('criticalBudgetLines exclut les lignes OK', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([
        mockLine({
          id: 'ok',
          name: 'OK',
          revisedAmount: 1000,
          committedAmount: 100,
          consumedAmount: 50,
          forecastAmount: 80,
          remainingAmount: 900,
        }),
        mockLine({
          id: 'crit',
          name: 'Crit',
          revisedAmount: 100,
          committedAmount: 50,
          consumedAmount: 30,
          forecastAmount: 150,
          remainingAmount: 70,
        }),
      ]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
        includeLines: true,
      } as DashboardQueryDto);

      expect(result.criticalBudgetLines!.some((l) => l.lineId === 'ok')).toBe(
        false,
      );
      expect(result.criticalBudgetLines!.some((l) => l.lineId === 'crit')).toBe(
        true,
      );
      expect(result.criticalBudgetLines![0].lineRiskLevel).toBe('CRITICAL');
    });
  });
});
