import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditLogsModule } from '../../audit-logs/audit-logs.module';
import { BudgetLinesController as BudgetManagementLinesController } from '../budget-lines/budget-lines.controller';
import { BudgetLinesService } from '../budget-lines/budget-lines.service';
import { BudgetLinesController as FinancialCoreLinesController } from '../../financial-core/budget-lines.controller';
import { FinancialAllocationsService } from '../../financial-core/allocations/financial-allocations.service';
import { FinancialEventsService } from '../../financial-core/events/financial-events.service';
import { BudgetLineCalculatorService } from '../../financial-core/budget-line-calculator.service';

/**
 * Test d'intégration : vérifier que les routes budget-lines sont bien dispatchées
 * - GET /budget-lines/:id → CRUD (BudgetManagementModule)
 * - GET /budget-lines/:id/allocations → FinancialCore
 * - GET /budget-lines/:id/events → FinancialCore
 */
describe('Budget lines routes integration', () => {
  let app: INestApplication;
  let budgetManagementController: BudgetManagementLinesController;
  let financialCoreController: FinancialCoreLinesController;
  let budgetLinesService: BudgetLinesService;
  let allocationsService: FinancialAllocationsService;
  let eventsService: FinancialEventsService;

  const clientId = 'client-1';
  const lineId = 'line-1';
  const userId = 'user-1';
  const passGuard = { canActivate: () => true };

  beforeAll(async () => {
    const mockBudgetLinesService = {
      getById: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockAllocationsService = {
      listByBudgetLine: jest.fn(),
    };
    const mockEventsService = {
      listByBudgetLine: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AuditLogsModule],
      controllers: [BudgetManagementLinesController, FinancialCoreLinesController],
      providers: [
        { provide: BudgetLinesService, useValue: mockBudgetLinesService },
        {
          provide: FinancialAllocationsService,
          useValue: mockAllocationsService,
        },
        { provide: FinancialEventsService, useValue: mockEventsService },
        {
          provide: BudgetLineCalculatorService,
          useValue: {},
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

    budgetManagementController = module.get<BudgetManagementLinesController>(
      BudgetManagementLinesController,
    );
    financialCoreController = module.get<FinancialCoreLinesController>(
      FinancialCoreLinesController,
    );
    budgetLinesService = module.get<BudgetLinesService>(BudgetLinesService);
    allocationsService = module.get<FinancialAllocationsService>(
      FinancialAllocationsService,
    );
    eventsService = module.get<FinancialEventsService>(FinancialEventsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /budget-lines/:id appelle le CRUD (budget-management) getById', async () => {
    const expected = {
      id: lineId,
      clientId,
      budgetId: 'b1',
      envelopeId: 'e1',
      code: 'BL-1',
      name: 'Line',
      initialAmount: 1000,
      remainingAmount: 1000,
    } as any;
    (budgetLinesService.getById as jest.Mock).mockResolvedValue(expected);

    const result = await budgetManagementController.getById(clientId, lineId, userId);

    expect(budgetLinesService.getById).toHaveBeenCalledWith(clientId, lineId, userId);
    expect(result).toEqual(expected);
  });

  it('GET /budget-lines/:id/allocations appelle le financial-core listByBudgetLine', async () => {
    const expected = { items: [], total: 0, limit: 20, offset: 0 };
    (allocationsService.listByBudgetLine as jest.Mock).mockResolvedValue(expected);

    const result = await financialCoreController.listAllocations(
      clientId,
      lineId,
      { limit: 20, offset: 0 },
    );

    expect(allocationsService.listByBudgetLine).toHaveBeenCalledWith(
      clientId,
      lineId,
      { limit: 20, offset: 0 },
    );
    expect(result).toEqual(expected);
  });

  it('GET /budget-lines/:id/events appelle le financial-core listByBudgetLine (events)', async () => {
    const expected = { items: [], total: 0, limit: 20, offset: 0 };
    (eventsService.listByBudgetLine as jest.Mock).mockResolvedValue(expected);

    const result = await financialCoreController.listEvents(
      clientId,
      lineId,
      { limit: 20, offset: 0 },
    );

    expect(eventsService.listByBudgetLine).toHaveBeenCalledWith(
      clientId,
      lineId,
      { limit: 20, offset: 0 },
    );
    expect(result).toEqual(expected);
  });
});
