import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpenseType, Prisma } from '@prisma/client';
import { BudgetLineStatus, BudgetStatus } from '@prisma/client';
import { BudgetLinesService } from '../budget-lines/budget-lines.service';

describe('BudgetLinesService', () => {
  let service: BudgetLinesService;
  let prisma: any;
  let auditLogs: any;

  const clientId = 'client-1';
  const budgetId = 'budget-1';
  const envelopeId = 'env-1';
  const generalLedgerAccountId = 'gla-1';

  const lineWithInclude = (overrides: Record<string, unknown> = {}) => ({
    id: 'line-1',
    clientId,
    budgetId,
    envelopeId,
    name: 'Line',
    code: 'BL-1',
    description: null,
    expenseType: ExpenseType.OPEX,
    status: BudgetLineStatus.DRAFT,
    currency: 'EUR',
    generalLedgerAccountId,
    analyticalLedgerAccountId: null,
    allocationScope: 'ENTERPRISE',
    initialAmount: 1000,
    forecastAmount: 0,
    committedAmount: 0,
    consumedAmount: 0,
    remainingAmount: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
    generalLedgerAccount: { id: generalLedgerAccountId, code: '606000', name: 'Compte' },
    analyticalLedgerAccount: null,
    costCenterSplits: [],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: clientId, budgetAccountingEnabled: false }),
      },
      budget: { findFirst: jest.fn() },
      budgetEnvelope: { findFirst: jest.fn() },
      generalLedgerAccount: { findFirst: jest.fn() },
      analyticalLedgerAccount: { findFirst: jest.fn() },
      costCenter: { findFirst: jest.fn() },
      budgetExercise: { findFirst: jest.fn() },
      budgetLine: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      budgetLineCostCenterSplit: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetLinesService(prisma, auditLogs);
  });

  describe('create', () => {
    it('enveloppe et budget cohérents + initialisation des montants quand la compta budgétaire est désactivée', async () => {
      prisma.generalLedgerAccount.findFirst.mockResolvedValue({
        id: generalLedgerAccountId,
        clientId,
      });
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        status: BudgetStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetEnvelope.findFirst.mockResolvedValue({
        id: envelopeId,
        clientId,
        budgetId,
        name: 'E',
        code: 'E',
        type: 'RUN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetLine.findUnique.mockResolvedValue(null);
      let capturedTx: any;
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        capturedTx = {
          budgetLine: {
            create: jest.fn().mockResolvedValue({ id: 'line-1' }),
            findUniqueOrThrow: jest.fn().mockResolvedValue(lineWithInclude()),
          },
          budgetLineCostCenterSplit: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(capturedTx);
      });

      const result = await service.create(
        clientId,
        {
          budgetId,
          envelopeId,
          name: 'Line',
          code: 'BL-1',
          expenseType: ExpenseType.OPEX,
          generalLedgerAccountId,
          initialAmount: 1000,
          currency: 'EUR',
        },
        { actorUserId: 'user-1', meta: {} },
      );

      const createCall = capturedTx.budgetLine.create.mock.calls[0][0];
      expect(createCall.data.initialAmount).toBeDefined();
      expect(Number(createCall.data.initialAmount)).toBe(1000);
      expect(createCall.data.generalLedgerAccountId).toBe(generalLedgerAccountId);
      expect(createCall.data.allocationScope).toBe('ENTERPRISE');
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget_line.created',
          resourceType: 'budget_line',
        }),
      );
      expect(result.initialAmount).toBe(1000);
      expect(result.remainingAmount).toBe(1000);
    });

    it('rejette la création sans generalLedgerAccountId quand la compta budgétaire est activée', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: clientId, budgetAccountingEnabled: true });
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        status: BudgetStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetEnvelope.findFirst.mockResolvedValue({
        id: envelopeId,
        clientId,
        budgetId,
        name: 'E',
        code: 'E',
        type: 'RUN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create(
          clientId,
          {
            budgetId,
            envelopeId,
            name: 'Line',
            code: 'BL-1',
            expenseType: ExpenseType.OPEX,
            initialAmount: 1000,
            currency: 'EUR',
          },
          { actorUserId: 'user-1', meta: {} },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejet si envelope.budgetId !== budgetId', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        status: BudgetStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetEnvelope.findFirst.mockResolvedValue({
        id: envelopeId,
        clientId,
        budgetId: 'other-budget',
        name: 'E',
        code: 'E',
        type: 'RUN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create(clientId, {
          budgetId,
          envelopeId,
          name: 'L',
          expenseType: ExpenseType.OPEX,
          generalLedgerAccountId,
          initialAmount: 100,
          currency: 'EUR',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejet si budget parent LOCKED', async () => {
      prisma.generalLedgerAccount.findFirst.mockResolvedValue({
        id: generalLedgerAccountId,
        clientId,
      });
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        status: BudgetStatus.LOCKED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create(clientId, {
          budgetId,
          envelopeId,
          name: 'L',
          expenseType: ExpenseType.OPEX,
          generalLedgerAccountId,
          initialAmount: 100,
          currency: 'EUR',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById (dérivés HT/TTC)', () => {
    it('expose initialTaxAmount / initialAmountTtc quand taxRate est connu', async () => {
      const taxRate = new Prisma.Decimal(20);

      const lineWithTax = lineWithInclude({
        taxRate,
        initialAmount: new Prisma.Decimal(1000),
        forecastAmount: new Prisma.Decimal(1200),
        committedAmount: new Prisma.Decimal(100),
        consumedAmount: new Prisma.Decimal(50),
        remainingAmount: new Prisma.Decimal(850),
      });

      prisma.budgetLine.findFirst.mockResolvedValue(lineWithTax);

      const result = await service.getById(clientId, 'line-1');

      expect(result.taxRate).toBe(20);
      expect(result.initialTaxAmount).toBe(200);
      expect(result.initialAmountTtc).toBe(1200);
      expect(result.forecastTaxAmount).toBe(240);
      expect(result.forecastAmountTtc).toBe(1440);
    });
  });

  describe('update', () => {
    it('recalcule remainingAmount si initialAmount (budget) change', async () => {
      const existingWithBudget = {
        ...lineWithInclude({
          initialAmount: 1000,
          committedAmount: 200,
          consumedAmount: 100,
          remainingAmount: 700,
        }),
        budget: { status: BudgetStatus.DRAFT },
        costCenterSplits: [],
      };
      prisma.budgetLine.findFirst.mockResolvedValue(existingWithBudget);
      let capturedTx: any;
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        capturedTx = {
          budgetLine: {
            update: jest.fn().mockResolvedValue({}),
            findUniqueOrThrow: jest.fn().mockResolvedValue(
              lineWithInclude({
                initialAmount: 1500,
                remainingAmount: 1200,
                committedAmount: 200,
                consumedAmount: 100,
              }),
            ),
          },
          budgetLineCostCenterSplit: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(capturedTx);
      });

      await service.update(
        clientId,
        'line-1',
        { initialAmount: 1500 },
        { actorUserId: 'user-1', meta: {} },
      );

      const updateCall = capturedTx.budgetLine.update.mock.calls[0][0];
      expect(updateCall.data.initialAmount).toBeDefined();
      expect(updateCall.data.remainingAmount).toBeDefined();
      expect(Number(updateCall.data.remainingAmount)).toBe(1200); // 1500 - 200 - 100
    });

    it('permet de laisser generalLedgerAccountId inchangé quand le champ est absent', async () => {
      const existingWithBudget = {
        ...lineWithInclude(),
        budget: { status: BudgetStatus.DRAFT },
        costCenterSplits: [],
      };
      prisma.budgetLine.findFirst.mockResolvedValue(existingWithBudget);
      let capturedTx: any;
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        capturedTx = {
          budgetLine: {
            update: jest.fn().mockResolvedValue({}),
            findUniqueOrThrow: jest.fn().mockResolvedValue(existingWithBudget),
          },
          budgetLineCostCenterSplit: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(capturedTx);
      });

      await service.update(
        clientId,
        'line-1',
        { name: 'New name' },
        { actorUserId: 'user-1', meta: {} },
      );

      const updateCall = capturedTx.budgetLine.update.mock.calls[0][0];
      expect(updateCall.data.generalLedgerAccountId).toBeUndefined();
    });

    it('interdit la suppression du compte comptable quand la compta budgétaire est activée', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: clientId, budgetAccountingEnabled: true });
      const existingWithBudget = {
        ...lineWithInclude(),
        budget: { status: BudgetStatus.DRAFT },
        costCenterSplits: [],
      };
      prisma.budgetLine.findFirst.mockResolvedValue(existingWithBudget);

      await expect(
        service.update(
          clientId,
          'line-1',
          { generalLedgerAccountId: null },
          { actorUserId: 'user-1', meta: {} },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('autorise la suppression du compte comptable quand la compta budgétaire est désactivée', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: clientId, budgetAccountingEnabled: false });
      const existingWithBudget = {
        ...lineWithInclude(),
        budget: { status: BudgetStatus.DRAFT },
        costCenterSplits: [],
      };
      prisma.budgetLine.findFirst.mockResolvedValue(existingWithBudget);
      let capturedTx: any;
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        capturedTx = {
          budgetLine: {
            update: jest.fn().mockResolvedValue({}),
            findUniqueOrThrow: jest.fn().mockResolvedValue(
              lineWithInclude({
                generalLedgerAccountId: null,
              }),
            ),
          },
          budgetLineCostCenterSplit: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(capturedTx);
      });

      await service.update(
        clientId,
        'line-1',
        { generalLedgerAccountId: null },
        { actorUserId: 'user-1', meta: {} },
      );

      const updateCall = capturedTx.budgetLine.update.mock.calls[0][0];
      expect(updateCall.data.generalLedgerAccountId).toBeNull();
    });

    it('rejet si ligne ARCHIVED', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue({
        ...lineWithInclude(),
        status: BudgetLineStatus.ARCHIVED,
        budget: { status: BudgetStatus.DRAFT },
        costCenterSplits: [],
      });

      await expect(
        service.update(clientId, 'line-1', { name: 'New' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('retourne 404 si ligne hors client', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue(null);

      await expect(
        service.getById(clientId, 'line-unknown'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejette DEFERRED avec exercice cible invalide', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue({
        ...lineWithInclude(),
        status: BudgetLineStatus.ACTIVE,
        deferredToExerciseId: null,
        budget: { status: BudgetStatus.DRAFT },
        costCenterSplits: [],
      });
      prisma.budgetExercise.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          clientId,
          'line-1',
          { status: BudgetLineStatus.DEFERRED, deferredToExerciseId: 'ex-other' },
          { actorUserId: 'user-1', meta: {} },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('sortie de DEFERRED => reset deferredToExerciseId à null', async () => {
      prisma.budgetLine.findFirst.mockResolvedValue({
        ...lineWithInclude(),
        status: BudgetLineStatus.DEFERRED,
        deferredToExerciseId: 'ex-1',
        budget: { status: BudgetStatus.DRAFT, taxMode: 'HT' },
        costCenterSplits: [],
      });

      let capturedTx: any;
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        capturedTx = {
          budgetLine: {
            update: jest.fn().mockResolvedValue({}),
            findUniqueOrThrow: jest.fn().mockResolvedValue(
              lineWithInclude({
                status: BudgetLineStatus.ACTIVE,
                deferredToExerciseId: null,
              }),
            ),
          },
          budgetLineCostCenterSplit: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(capturedTx);
      });

      await service.update(
        clientId,
        'line-1',
        { status: BudgetLineStatus.ACTIVE },
        { actorUserId: 'user-1', meta: {} },
      );

      const updateCall = capturedTx.budgetLine.update.mock.calls[0][0];
      expect(updateCall.data.deferredToExerciseId).toBeNull();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('retour partiel (succès + échec) sans rollback global', async () => {
      const spy = jest.spyOn(service, 'update');
      spy.mockImplementation(async (_client, id) => {
        if (id === 'line-ko') {
          throw new BadRequestException('invalid transition');
        }
        return lineWithInclude({ id }) as any;
      });

      const result = await service.bulkUpdateStatus(clientId, {
        ids: ['line-ok', 'line-ko'],
        status: BudgetLineStatus.ACTIVE,
      });

      expect(result.updatedIds).toEqual(['line-ok']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]?.id).toBe('line-ko');
    });
  });
});

