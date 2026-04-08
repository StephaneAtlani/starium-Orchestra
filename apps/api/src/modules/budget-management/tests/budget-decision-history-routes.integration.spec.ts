import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { BudgetsController } from '../budgets/budgets.controller';
import { BudgetsService } from '../budgets/budgets.service';
import { BudgetDecisionHistoryService } from '../budget-decision-history.service';

/**
 * Test d'intégration : route GET /budgets/:id/decision-history dispatchée vers
 * BudgetDecisionHistoryService (RFC-032). Même approche que budget-lines-routes.
 */
describe('Budget decision-history route integration', () => {
  let app: INestApplication;
  let controller: BudgetsController;
  let decisionHistoryService: BudgetDecisionHistoryService;

  const clientId = 'client-1';
  const budgetId = 'budget-1';
  const passGuard = { canActivate: () => true };

  beforeAll(async () => {
    const mockBudgetsService = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      bulkUpdateStatus: jest.fn(),
    };
    const mockDecisionHistoryService = {
      list: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetsController],
      providers: [
        { provide: BudgetsService, useValue: mockBudgetsService },
        {
          provide: BudgetDecisionHistoryService,
          useValue: mockDecisionHistoryService,
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

    app = module.createNestApplication();
    await app.init();

    controller = module.get<BudgetsController>(BudgetsController);
    decisionHistoryService = module.get<BudgetDecisionHistoryService>(
      BudgetDecisionHistoryService,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /budgets/:id/decision-history appelle decisionHistoryService.list', async () => {
    const expected = {
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    };
    (decisionHistoryService.list as jest.Mock).mockResolvedValue(expected);

    const query = { limit: 20, offset: 0 } as any;
    const result = await controller.decisionHistory(clientId, budgetId, query);

    expect(decisionHistoryService.list).toHaveBeenCalledWith(
      clientId,
      budgetId,
      query,
    );
    expect(result).toEqual(expected);
  });
});
