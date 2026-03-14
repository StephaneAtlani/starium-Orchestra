import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetExerciseStatus } from '@prisma/client';
import { BudgetExercisesService } from '../budget-exercises/budget-exercises.service';

describe('BudgetExercisesService', () => {
  let service: BudgetExercisesService;
  let prisma: any;
  let auditLogs: any;

  const clientId = 'client-1';

  beforeEach(() => {
    prisma = {
      budgetExercise: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetExercisesService(prisma, auditLogs);
  });

  describe('create', () => {
    it('crée un exercice valide avec code fourni', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      prisma.budgetExercise.findUnique.mockResolvedValue(null);
      prisma.budgetExercise.create.mockResolvedValue({
        id: 'ex-1',
        clientId,
        name: 'Exercice 2025',
        code: 'EX-2025',
        startDate,
        endDate,
        status: BudgetExerciseStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        clientId,
        {
          name: 'Exercice 2025',
          code: 'EX-2025',
          startDate,
          endDate,
        },
        { actorUserId: 'user-1', meta: {} },
      );

      expect(prisma.budgetExercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId,
            name: 'Exercice 2025',
            code: 'EX-2025',
            startDate,
            endDate,
            status: BudgetExerciseStatus.DRAFT,
          }),
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget_exercise.created',
          resourceType: 'budget_exercise',
          clientId,
        }),
      );
      expect(result.id).toBe('ex-1');
    });

    it('erreur si endDate < startDate', async () => {
      const startDate = new Date('2025-12-31');
      const endDate = new Date('2025-01-01');

      await expect(
        service.create(clientId, {
          name: 'Bad',
          startDate,
          endDate,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetExercise.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('refuse update si status = ARCHIVED', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue({
        id: 'ex-1',
        clientId,
        name: 'Archived',
        code: 'EX-ARCH',
        startDate: new Date(),
        endDate: new Date(),
        status: BudgetExerciseStatus.ARCHIVED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.update(
          clientId,
          'ex-1',
          { name: 'New Name' },
          { actorUserId: 'user-1', meta: {} },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetExercise.update).not.toHaveBeenCalled();
    });

    it('retourne 404 si exercice inexistant', async () => {
      prisma.budgetExercise.findFirst.mockResolvedValue(null);

      await expect(
        service.update(clientId, 'ex-unknown', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('retourne items, total, limit, offset', async () => {
      prisma.budgetExercise.findMany.mockResolvedValue([
        { id: 'ex-1', clientId, name: 'E1', code: 'EX-1', startDate: new Date(), endDate: new Date(), status: BudgetExerciseStatus.DRAFT, createdAt: new Date(), updatedAt: new Date() },
      ]);
      prisma.budgetExercise.count.mockResolvedValue(1);

      const result = await service.list(clientId, { limit: 20, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });
});
