import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BudgetDashboardWidgetType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BudgetDashboardConfigService } from '../budget-dashboard-config.service';
import { BudgetDashboardController } from '../budget-dashboard.controller';
import { BudgetDashboardService } from '../budget-dashboard.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('Budget dashboard integration', () => {
  let controller: BudgetDashboardController;
  let prisma: {
    budget: { findFirst: jest.Mock };
    budgetExercise: { findFirst: jest.Mock };
    budgetVersionSet: { findFirst: jest.Mock };
    budgetLine: { findMany: jest.Mock };
    financialAllocation: { findMany: jest.Mock };
    financialEvent: { findMany: jest.Mock };
    client: { findUnique: jest.Mock };
  };

  const clientA = 'client-A';
  const clientB = 'client-B';
  const budgetId = 'bud-1';
  const exerciseId = 'ex-1';
  const passGuard = { canActivate: () => true };

  const mockBudget = {
    id: budgetId,
    name: 'Budget A',
    code: 'BA',
    exerciseId,
    currency: 'EUR',
    status: 'ACTIVE',
  };
  const mockExercise = { id: exerciseId, name: 'Ex A', code: '2025' };

  const mockDashboardConfig = () => ({
    id: 'cfg-1',
    name: 'Cockpit par défaut',
    isDefault: true,
    clientId: clientA,
    defaultExerciseId: null,
    defaultBudgetId: null,
    layoutConfig: { columns: 2 },
    filtersConfig: null,
    thresholdsConfig: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    widgets: [
      { id: 'w0', clientId: clientA, configId: 'cfg-1', type: BudgetDashboardWidgetType.KPI, position: 0, title: 'KPI', size: 'full', isActive: true, settings: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 'w1', clientId: clientA, configId: 'cfg-1', type: BudgetDashboardWidgetType.ALERT_LIST, position: 1, title: 'A', size: 'full', isActive: true, settings: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 'w2', clientId: clientA, configId: 'cfg-1', type: BudgetDashboardWidgetType.ENVELOPE_LIST, position: 2, title: 'E', size: 'full', isActive: true, settings: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 'w3', clientId: clientA, configId: 'cfg-1', type: BudgetDashboardWidgetType.LINE_LIST, position: 3, title: 'L', size: 'full', isActive: true, settings: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 'w4', clientId: clientA, configId: 'cfg-1', type: BudgetDashboardWidgetType.CHART, position: 4, title: 'C1', size: 'full', isActive: true, settings: { chartType: 'RUN_BUILD_BREAKDOWN' }, createdAt: new Date(), updatedAt: new Date() },
      { id: 'w5', clientId: clientA, configId: 'cfg-1', type: BudgetDashboardWidgetType.CHART, position: 5, title: 'C2', size: 'full', isActive: true, settings: { chartType: 'CONSUMPTION_TREND' }, createdAt: new Date(), updatedAt: new Date() },
    ],
  });

  const mockConfigService = {
    ensureDefaultConfig: jest.fn().mockImplementation((clientId: string) =>
      Promise.resolve(mockDashboardConfig()),
    ),
  };

  beforeAll(async () => {
    prisma = {
      budget: { findFirst: jest.fn() },
      budgetExercise: { findFirst: jest.fn() },
      budgetVersionSet: { findFirst: jest.fn() },
      budgetLine: { findMany: jest.fn() },
      financialAllocation: { findMany: jest.fn() },
      financialEvent: { findMany: jest.fn() },
      client: { findUnique: jest.fn().mockResolvedValue({ defaultTaxRate: null }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [BudgetDashboardController],
      providers: [
        BudgetDashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: BudgetDashboardConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(ModuleAccessGuard)
      .useValue(passGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(passGuard)
      .compile();

    controller = module.get<BudgetDashboardController>(BudgetDashboardController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /budget-dashboard', () => {
    it('200 avec client actif et permission budgets.read', async () => {
      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const result = await controller.getDashboard(clientA, {});

      expect(result).toBeDefined();
      expect(result.exercise.id).toBe(exerciseId);
      expect(result.budget.id).toBe(budgetId);
      expect(result.config).toBeDefined();
      const kpi = result.widgets.find((w) => w.type === 'KPI');
      expect(kpi && kpi.type === 'KPI' && kpi.data).toBeTruthy();
      if (kpi && kpi.type === 'KPI' && kpi.data) {
        expect(kpi.data.kpis).toBeDefined();
      }
      const chartRb = result.widgets.find(
        (w) =>
          w.type === 'CHART' &&
          w.settings &&
          (w.settings as { chartType?: string }).chartType === 'RUN_BUILD_BREAKDOWN',
      );
      expect(chartRb?.data && 'series' in (chartRb.data as object)).toBeTruthy();
      const alertW = result.widgets.find((w) => w.type === 'ALERT_LIST');
      expect(alertW?.data && 'totals' in (alertW.data as object)).toBeTruthy();
      const trend = result.widgets.find(
        (w) =>
          w.type === 'CHART' &&
          w.data &&
          (w.data as { chartType?: string }).chartType === 'CONSUMPTION_TREND',
      );
      expect((trend?.data as { series?: unknown })?.series).toEqual([]);
    });
  });

  describe('isolation client', () => {
    it('données du client B non retournées quand budget appartient au client A', async () => {
      prisma.budget.findFirst.mockImplementation(
        (args: { where: { id: string; clientId: string } }) => {
          if (args.where.clientId === clientA && args.where.id === budgetId) {
            return Promise.resolve(mockBudget);
          }
          return Promise.resolve(null);
        },
      );
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      const resultA = await controller.getDashboard(clientA, { budgetId });
      expect(resultA.budget.id).toBe(budgetId);

      await expect(
        controller.getDashboard(clientB, { budgetId }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.budget.findFirst).toHaveBeenCalledWith({
        where: { id: budgetId, clientId: clientB },
      });
    });
  });
});
