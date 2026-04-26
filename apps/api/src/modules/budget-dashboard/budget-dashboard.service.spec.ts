import { NotFoundException } from '@nestjs/common';
import { BudgetDashboardWidgetType } from '@prisma/client';
import { BudgetDashboardConfigService } from './budget-dashboard-config.service';
import { BudgetDashboardService } from './budget-dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { DashboardQueryDto } from './dto/dashboard.query.dto';
import type { BudgetCockpitResponse } from './types/budget-dashboard.types';

const clientId = 'client-1';
const exerciseId = 'ex-1';
const budgetId = 'bud-1';

const mockBudget = {
  id: budgetId,
  name: 'Budget 1',
  code: 'B1',
  exerciseId,
  currency: 'EUR',
  status: 'VALIDATED',
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
  initialAmount: number;
  revisedAmount: number;
  committedAmount: number;
  remainingAmount: number;
  consumedAmount: number;
  forecastAmount: number;
  expenseType: string;
  code: string;
  name: string;
}> = {}) {
  const defaults = {
    id: 'line-1',
    envelopeId: 'env-1',
    revisedAmount: 1000,
    initialAmount: 1000,
    committedAmount: 300,
    remainingAmount: 600,
    consumedAmount: 400,
    forecastAmount: 450,
    expenseType: 'OPEX',
    code: 'L1',
    name: 'Ligne 1',
    envelope: { id: 'env-1', code: 'E1', name: 'Enveloppe 1', type: 'RUN' },
  };
  const merged = { ...defaults, ...overrides };
  // Le cockpit agrège `initialAmount` ; si le test ne fournit que `revisedAmount`, on aligne.
  if (!('initialAmount' in overrides) && 'revisedAmount' in overrides) {
    merged.initialAmount = merged.revisedAmount;
  }
  return merged;
}

function mockDashboardConfigWidgets() {
  const base = {
    clientId,
    configId: 'cfg-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    size: 'full',
  };
  return [
    { ...base, id: 'w-kpi', type: BudgetDashboardWidgetType.KPI, position: 0, title: 'KPI', settings: null },
    { ...base, id: 'w-al', type: BudgetDashboardWidgetType.ALERT_LIST, position: 1, title: 'Alertes', settings: null },
    { ...base, id: 'w-env', type: BudgetDashboardWidgetType.ENVELOPE_LIST, position: 2, title: 'Env', settings: null },
    { ...base, id: 'w-line', type: BudgetDashboardWidgetType.LINE_LIST, position: 3, title: 'Lignes', settings: null },
    {
      ...base,
      id: 'w-c1',
      type: BudgetDashboardWidgetType.CHART,
      position: 4,
      title: 'R/B',
      settings: { chartType: 'RUN_BUILD_BREAKDOWN' },
    },
    {
      ...base,
      id: 'w-c2',
      type: BudgetDashboardWidgetType.CHART,
      position: 5,
      title: 'Trend',
      settings: { chartType: 'CONSUMPTION_TREND' },
    },
  ];
}

function mockDashboardConfig() {
  return {
    id: 'cfg-1',
    name: 'Cockpit par défaut',
    isDefault: true,
    clientId,
    defaultExerciseId: null,
    defaultBudgetId: null,
    layoutConfig: { columns: 2 },
    filtersConfig: null,
    thresholdsConfig: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    widgets: mockDashboardConfigWidgets(),
  };
}

function kpiBlock(r: BudgetCockpitResponse) {
  const w = r.widgets.find((x) => x.type === 'KPI');
  if (!w || w.data === null || w.type !== 'KPI') throw new Error('KPI widget manquant');
  return w.data.kpis;
}

function envelopeListData(r: BudgetCockpitResponse) {
  const w = r.widgets.find((x) => x.type === 'ENVELOPE_LIST');
  if (!w || w.data === null || w.type !== 'ENVELOPE_LIST') {
    throw new Error('ENVELOPE_LIST manquant');
  }
  return w.data;
}

function lineListData(r: BudgetCockpitResponse) {
  const w = r.widgets.find((x) => x.type === 'LINE_LIST');
  if (!w || w.data === null || w.type !== 'LINE_LIST') {
    throw new Error('LINE_LIST manquant');
  }
  return w.data;
}

function chartRunBuild(r: BudgetCockpitResponse) {
  const w = r.widgets.find(
    (x) => x.type === 'CHART' && x.settings && (x.settings as { chartType?: string }).chartType === 'RUN_BUILD_BREAKDOWN',
  );
  if (!w || w.data === null || w.type !== 'CHART') throw new Error('chart R/B');
  if (w.data.chartType !== 'RUN_BUILD_BREAKDOWN') throw new Error('bad chart');
  return w.data.series;
}

function alertListItems(r: BudgetCockpitResponse) {
  const w = r.widgets.find((x) => x.type === 'ALERT_LIST');
  if (!w || w.data === null || w.type !== 'ALERT_LIST') throw new Error('ALERT_LIST');
  return w.data;
}

describe('BudgetDashboardService', () => {
  let service: BudgetDashboardService;
  let mockConfigService: { ensureDefaultConfig: jest.Mock };
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
    mockConfigService = {
      ensureDefaultConfig: jest.fn().mockResolvedValue(mockDashboardConfig()),
    };
    prisma = {
      budget: { findFirst: jest.fn() },
      budgetExercise: { findFirst: jest.fn() },
      budgetVersionSet: { findFirst: jest.fn() },
      budgetLine: { findMany: jest.fn() },
      financialAllocation: { findMany: jest.fn() },
      financialEvent: { findMany: jest.fn() },
      client: { findUnique: jest.fn().mockResolvedValue({ defaultTaxRate: null }) },
    };
    service = new BudgetDashboardService(
      prisma as unknown as PrismaService,
      mockConfigService as unknown as BudgetDashboardConfigService,
    );
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

      expect(kpiBlock(result).totalBudget).toBe(1500);
      expect(kpiBlock(result).remaining).toBe(500);
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

      expect(kpiBlock(result).consumptionRate).toBe(0);
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

      const riskEnvelopes = envelopeListData(result).riskEnvelopes;
      expect(riskEnvelopes.length).toBeGreaterThan(0);
      const low = riskEnvelopes.find((r) => r.riskLevel === 'LOW');
      const medium = riskEnvelopes.find((r) => r.riskLevel === 'MEDIUM');
      const high = riskEnvelopes.find((r) => r.riskLevel === 'HIGH');
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
    it('vide les listes enveloppes dans le widget ENVELOPE_LIST', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([mockLine()]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
        includeEnvelopes: false,
      } as DashboardQueryDto);

      const env = envelopeListData(result);
      expect(env.topEnvelopes).toEqual([]);
      expect(env.riskEnvelopes).toEqual([]);
      expect(kpiBlock(result)).toBeDefined();
      const trendWidget = result.widgets.find(
        (x) => x.type === 'CHART' && x.data && x.data.chartType === 'CONSUMPTION_TREND',
      );
      expect(trendWidget?.data && 'series' in trendWidget.data).toBeTruthy();
    });
  });

  describe('includeLines false', () => {
    it('vide les lignes dans LINE_LIST et ALERT_LIST', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([mockLine()]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(clientId, {
        budgetId,
        includeLines: false,
      } as DashboardQueryDto);

      expect(lineListData(result).topBudgetLines).toEqual([]);
      expect(lineListData(result).criticalBudgetLines).toEqual([]);
      expect(alertListItems(result).items).toEqual([]);
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

      expect(envelopeListData(result).topEnvelopes.length).toBeLessThanOrEqual(10);
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

      expect(lineListData(result).topBudgetLines.length).toBeLessThanOrEqual(10);
    });
  });

  describe('runBuildDistribution et alertsSummary', () => {
    it('agrège RUN / BUILD / TRANSVERSE sur initialAmount (budget HT)', async () => {
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

      expect(chartRunBuild(result)).toEqual({
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

      const totals = alertListItems(result).totals;
      expect(totals?.negativeRemaining).toBe(1);
      expect(totals?.overCommitted).toBe(1);
      expect(totals?.overConsumed).toBe(1);
      expect(totals?.forecastOverBudget).toBe(1);
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

      const crit = lineListData(result).criticalBudgetLines;
      expect(crit.some((l) => l.lineId === 'ok')).toBe(false);
      expect(crit.some((l) => l.lineId === 'crit')).toBe(true);
      expect(crit[0].lineRiskLevel).toBe('CRITICAL');
    });
  });
});
