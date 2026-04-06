import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BudgetReportingController } from '../budget-reporting.controller';
import { BudgetReportingService } from '../budget-reporting.service';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Intégration : isolation client (client A ressource, requête avec client B → 404)
 * et pagination sur un endpoint de liste.
 */
describe('Budget reporting integration', () => {
  let service: BudgetReportingService;
  let controller: BudgetReportingController;
  let prisma: {
    budgetExercise: { findFirst: jest.Mock };
    budget: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    budgetEnvelope: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    budgetLine: { findMany: jest.Mock; count: jest.Mock };
    client: { findUnique: jest.Mock };
  };

  const clientA = 'client-A';
  const clientB = 'client-B';
  const exerciseId = 'ex-1';
  const passGuard = { canActivate: () => true };

  beforeAll(async () => {
    prisma = {
      budgetExercise: { findFirst: jest.fn() },
      budget: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      budgetEnvelope: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      budgetLine: { findMany: jest.fn(), count: jest.fn() },
      client: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [BudgetReportingController],
      providers: [
        BudgetReportingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
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

    service = module.get<BudgetReportingService>(BudgetReportingService);
    controller = module.get<BudgetReportingController>(
      BudgetReportingController,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findUnique.mockResolvedValue({ defaultTaxRate: null });
  });

  describe('isolation client (obligatoire)', () => {
    it('requête avec client B sur une ressource de client A → 404', async () => {
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.budgetEnvelope.count.mockResolvedValue(0);
      // Ressource (exercice) appartient à client A : findFirst avec clientId A retourne l’exercice
      prisma.budgetExercise.findFirst.mockImplementation(
        (args: { where: { id: string; clientId: string } }) => {
          if (args.where.clientId === clientA && args.where.id === exerciseId) {
            return Promise.resolve({
              id: exerciseId,
              clientId: clientA,
              name: 'Ex A',
              code: 'EX-A',
              budgets: [{ id: 'b1' }],
            });
          }
          return Promise.resolve(null);
        },
      );

      const resultA = await controller.getExerciseSummary(clientA, exerciseId);
      expect(resultA).toBeDefined();
      expect(prisma.budgetExercise.findFirst).toHaveBeenCalledWith({
        where: { id: exerciseId, clientId: clientA },
        include: { budgets: { select: { id: true } } },
      });

      await expect(
        controller.getExerciseSummary(clientB, exerciseId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.budgetExercise.findFirst).toHaveBeenCalledWith({
        where: { id: exerciseId, clientId: clientB },
        include: { budgets: { select: { id: true } } },
      });
    });
  });

  describe('pagination', () => {
    it('listBudgetsForExercise retourne items, total, limit, offset', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue({
        id: exerciseId,
        clientId: clientA,
        budgets: [{ id: 'b1' }, { id: 'b2' }],
      });
      prisma.budget.findMany.mockResolvedValue([
        {
          id: 'b1',
          clientId: clientA,
          exerciseId,
          name: 'B1',
          code: 'B1',
          description: null,
          currency: 'EUR',
          status: 'VALIDATED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.budget.count.mockResolvedValue(1);
      prisma.budgetLine.findMany.mockResolvedValue([]);
      prisma.budgetEnvelope.findMany.mockResolvedValue([
        { budgetId: 'b1' },
        { budgetId: 'b1' },
      ]);

      const result = await controller.listBudgetsForExercise(clientA, exerciseId, {
        offset: 0,
        limit: 10,
      });

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });
});
