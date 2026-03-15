import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { PrismaModule } from '../../../prisma/prisma.module';
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

  beforeAll(async () => {
    prisma = {
      budget: { findFirst: jest.fn() },
      budgetExercise: { findFirst: jest.fn() },
      budgetVersionSet: { findFirst: jest.fn() },
      budgetLine: { findMany: jest.fn() },
      financialAllocation: { findMany: jest.fn() },
      financialEvent: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [BudgetDashboardController],
      providers: [
        BudgetDashboardService,
        { provide: PrismaService, useValue: prisma },
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
      expect(result.kpis).toBeDefined();
      expect(result.capexOpexDistribution).toBeDefined();
      expect(result.monthlyTrend).toEqual([]);
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
