import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    budgetDashboardWidget: { findMany: jest.Mock };
    budgetDashboardWidgetOverride: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
    };
    client: { findUnique: jest.Mock };
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
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
      budgetDashboardWidget: { findMany: jest.fn() },
      budgetDashboardWidgetOverride: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      client: { findUnique: jest.fn().mockResolvedValue({ defaultTaxRate: null }) },
      $transaction: async (fn) => fn(prisma as unknown),
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
      prisma.budgetDashboardWidgetOverride.findMany.mockResolvedValue([]);

      const result = await controller.getDashboard(clientA, undefined, {});

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

    it("applique overrides user (isActive/position) et ignore un override orphelin", async () => {
      const actorUserId = 'user-1';

      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      prisma.budgetDashboardWidgetOverride.findMany.mockResolvedValue([
        { widgetId: 'w1', isActive: false, position: 99 }, // doit être appliqué
        { widgetId: 'w-orphan', isActive: false, position: 0 }, // doit être ignoré
      ]);

      const result = await controller.getDashboard(clientA, actorUserId, {});

      const alertW = result.widgets.find((w) => w.type === 'ALERT_LIST');
      expect(alertW?.isActive).toBe(false);
      expect(alertW?.data).toBeNull();
    });

    it('mode global : ignore les overrides utilisateur', async () => {
      const actorUserId = 'user-1';

      prisma.budget.findFirst.mockResolvedValue(mockBudget);
      prisma.budgetExercise.findFirst.mockResolvedValue(mockExercise);
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.financialAllocation.findMany.mockResolvedValue([]);
      prisma.financialEvent.findMany.mockResolvedValue([]);

      prisma.budgetDashboardWidgetOverride.findMany.mockResolvedValue([
        { widgetId: 'w1', isActive: false, position: 99 },
      ]);

      const result = await controller.getDashboard(
        clientA,
        actorUserId,
        { useUserOverrides: false },
      );

      const alertW = result.widgets.find((w) => w.type === 'ALERT_LIST');
      // valeur config client : w1 estActive=true dans le mockDashboardConfig
      expect(alertW?.isActive).toBe(true);
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
      prisma.budgetDashboardWidgetOverride.findMany.mockResolvedValue([]);

      const resultA = await controller.getDashboard(clientA, undefined, { budgetId });
      expect(resultA.budget.id).toBe(budgetId);

      await expect(
        controller.getDashboard(clientB, undefined, { budgetId }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.budget.findFirst).toHaveBeenCalledWith({
        where: { id: budgetId, clientId: clientB },
      });
    });
  });

  describe('PATCH /budget-dashboard/user-overrides', () => {
    it("PATCH sparse n’efface pas les overrides absents du payload", async () => {
      const actorUserId = 'user-1';

      // Valide que w1 existe bien pour le client
      prisma.budgetDashboardWidget.findMany.mockResolvedValue([{ id: 'w1' }]);

      // 1) lookup des overrides existants uniquement pour [w1] => aucun
      prisma.budgetDashboardWidgetOverride.findMany.mockImplementation(
        (args: any) => {
          const inList = args?.where?.widgetId?.in ?? [];
          if (inList.includes('w1') && inList.length === 1) {
            return Promise.resolve([]);
          }
          // 2) listUserWidgetOverrides (final) sur tous les widgets de la config
          return Promise.resolve([
            { widgetId: 'w1', isActive: false, position: 10 },
            { widgetId: 'w2', isActive: true, position: 77 },
          ]);
        },
      );

      prisma.budgetDashboardWidgetOverride.upsert.mockResolvedValue({} as any);
      prisma.budgetDashboardWidgetOverride.delete.mockResolvedValue({} as any);

      const result = await controller.patchUserOverrides(clientA, actorUserId, {
        overrides: [{ widgetId: 'w1', isActive: false, position: 10 }],
      });

      expect(prisma.budgetDashboardWidgetOverride.upsert).toHaveBeenCalledTimes(1);
      // Le résultat doit contenir w2 inchangé
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ widgetId: 'w2', isActive: true, position: 77 }),
        ]),
      );
    });

    it("reset via null supprime l’effet override", async () => {
      const actorUserId = 'user-1';

      prisma.budgetDashboardWidget.findMany.mockResolvedValue([{ id: 'w1' }]);

      prisma.budgetDashboardWidgetOverride.findMany.mockImplementation(
        (args: any) => {
          const inList = args?.where?.widgetId?.in ?? [];
          if (inList.includes('w1') && inList.length === 1) {
            return Promise.resolve([
              { widgetId: 'w1', isActive: false, position: 10 },
            ]);
          }
          return Promise.resolve([
            { widgetId: 'w2', isActive: true, position: 77 },
          ]);
        },
      );

      prisma.budgetDashboardWidgetOverride.upsert.mockResolvedValue({} as any);
      prisma.budgetDashboardWidgetOverride.delete.mockResolvedValue({} as any);

      const result = await controller.patchUserOverrides(clientA, actorUserId, {
        overrides: [{ widgetId: 'w1', isActive: null, position: null }],
      });

      expect(prisma.budgetDashboardWidgetOverride.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ widgetId: 'w1' }),
        ]),
      );
    });

    it('rejet 400 si settings non vide est envoyé', async () => {
      const actorUserId = 'user-1';

      // Pour la validation des widgetIds : accepter w1
      prisma.budgetDashboardWidget.findMany.mockResolvedValue([{ id: 'w1' }]);

      await expect(
        controller.patchUserOverrides(clientA, actorUserId, {
          overrides: [{ widgetId: 'w1', isActive: false, settings: { limit: 10 } }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
