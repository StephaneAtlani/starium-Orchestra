import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetEnvelopeStatus, BudgetStatus } from '@prisma/client';
import { BudgetsService } from '../budgets/budgets.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: any;
  let auditLogs: any;

  const clientId = 'client-1';
  const exerciseId = 'ex-1';

  beforeEach(() => {
    prisma = {
      budgetExercise: { findFirst: jest.fn() },
      budget: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      budgetEnvelope: { count: jest.fn() },
      clientUser: { findFirst: jest.fn() },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetsService(prisma, auditLogs);
  });

  describe('create', () => {
    it('crée un budget si exercice appartient au client', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue({
        id: exerciseId,
        clientId,
        name: 'Ex',
        code: 'EX',
        startDate: new Date(),
        endDate: new Date(),
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.budget.create.mockResolvedValue({
        id: 'budget-1',
        clientId,
        exerciseId,
        name: 'Budget 2025',
        code: 'BUD-2025',
        currency: 'EUR',
        status: BudgetStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        exercise: { name: 'Ex', code: 'EX' },
      });

      const result = await service.create(
        clientId,
        {
          exerciseId,
          name: 'Budget 2025',
          code: 'BUD-2025',
          currency: 'EUR',
        },
        { actorUserId: 'user-1', meta: {} },
      );

      expect(prisma.budgetExercise.findFirst).toHaveBeenCalledWith({
        where: { id: exerciseId, clientId },
      });
      expect(prisma.budget.create).toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget.created',
          resourceType: 'budget',
        }),
      );
      expect(result.id).toBe('budget-1');
    });

    it('erreur si exercice autre client ou inexistant', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue(null);

      await expect(
        service.create(clientId, {
          exerciseId: 'ex-other',
          name: 'B',
          currency: 'EUR',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.budget.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const editableBudget = {
      id: 'b1',
      clientId,
      exerciseId,
      name: 'B',
      code: 'B',
      currency: 'EUR',
      status: BudgetStatus.SUBMITTED,
      isVersioned: false,
      versionStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('refuse update si budget LOCKED', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: 'b1',
        clientId,
        exerciseId,
        name: 'B',
        code: 'B',
        currency: 'EUR',
        status: BudgetStatus.LOCKED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.update(clientId, 'b1', { name: 'New' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budget.update).not.toHaveBeenCalled();
    });

    it('refuse passage à VALIDATED tant qu’une enveloppe est en DRAFT', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        ...editableBudget,
        status: BudgetStatus.REVISED,
      });
      prisma.budgetEnvelope.count.mockResolvedValue(1);

      await expect(
        service.update(clientId, 'b1', { status: BudgetStatus.VALIDATED }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetEnvelope.count).toHaveBeenCalledWith({
        where: {
          budgetId: 'b1',
          clientId,
          status: BudgetEnvelopeStatus.DRAFT,
        },
      });
      expect(prisma.budget.update).not.toHaveBeenCalled();
    });

    it('autorise passage à VALIDATED si aucune enveloppe en DRAFT', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        ...editableBudget,
        status: BudgetStatus.REVISED,
      });
      prisma.budgetEnvelope.count.mockResolvedValue(0);
      prisma.budget.update.mockResolvedValue({
        ...editableBudget,
        status: BudgetStatus.VALIDATED,
        exercise: { name: 'Ex', code: 'EX' },
        owner: null,
      });

      await service.update(clientId, 'b1', { status: BudgetStatus.VALIDATED });

      expect(prisma.budget.update).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('applique le statut id par id et regroupe les échecs', async () => {
      jest.spyOn(service, 'update').mockImplementation(async (_cid, id) => {
        if (id === 'ok') {
          return { id: 'ok' } as any;
        }
        throw new BadRequestException('locked');
      });

      const out = await service.bulkUpdateStatus(clientId, {
        ids: ['ok', 'ok', 'bad'],
        status: BudgetStatus.DRAFT,
      });

      expect(out.status).toBe(BudgetStatus.DRAFT);
      expect(out.updatedIds).toEqual(['ok']);
      expect(out.failed).toEqual([{ id: 'bad', error: 'locked' }]);

      jest.restoreAllMocks();
    });
  });
});
