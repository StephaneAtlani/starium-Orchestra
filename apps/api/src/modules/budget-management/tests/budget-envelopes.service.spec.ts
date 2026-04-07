import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetEnvelopeStatus, BudgetEnvelopeType } from '@prisma/client';
import { BudgetStatus } from '@prisma/client';
import { BudgetEnvelopesService } from '../budget-envelopes/budget-envelopes.service';

describe('BudgetEnvelopesService', () => {
  let service: BudgetEnvelopesService;
  let prisma: any;
  let auditLogs: any;

  const clientId = 'client-1';
  const budgetId = 'budget-1';

  beforeEach(() => {
    prisma = {
      budget: { findFirst: jest.fn() },
      budgetEnvelope: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      budgetExercise: { findFirst: jest.fn() },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new BudgetEnvelopesService(prisma, auditLogs);
  });

  describe('create', () => {
    it('crée une enveloppe si budget appartient au client', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        exerciseId: 'ex-1',
        name: 'B',
        code: 'B',
        currency: 'EUR',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetEnvelope.findUnique.mockResolvedValue(null);
      prisma.budgetEnvelope.create.mockResolvedValue({
        id: 'env-1',
        clientId,
        budgetId,
        name: 'Envelope',
        code: 'ENV-1',
        type: BudgetEnvelopeType.RUN,
        status: BudgetStatus.DRAFT,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        clientId,
        {
          budgetId,
          name: 'Envelope',
          code: 'ENV-1',
          type: BudgetEnvelopeType.RUN,
        },
        { actorUserId: 'user-1', meta: {} },
      );

      expect(prisma.budget.findFirst).toHaveBeenCalledWith({
        where: { id: budgetId, clientId },
      });
      expect(prisma.budgetEnvelope.create).toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'budget_envelope.created',
          resourceType: 'budget_envelope',
        }),
      );
      expect(result.id).toBe('env-1');
    });

    it('rejet si budget LOCKED', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        exerciseId: 'ex-1',
        name: 'B',
        code: 'B',
        currency: 'EUR',
        status: BudgetStatus.LOCKED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create(clientId, {
          budgetId,
          name: 'E',
          type: BudgetEnvelopeType.RUN,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetEnvelope.create).not.toHaveBeenCalled();
    });

    it('rejet si parentId fourni et parent absent ou autre budget', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.budgetEnvelope.findFirst.mockResolvedValue(null);

      await expect(
        service.create(clientId, {
          budgetId,
          name: 'E',
          type: BudgetEnvelopeType.RUN,
          parentId: 'parent-other',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.budgetEnvelope.create).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('retourne 404 si enveloppe hors client', async () => {
      prisma.budgetEnvelope.findFirst.mockResolvedValue(null);

      await expect(service.getById(clientId, 'env-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejette DEFERRED avec exercice cible invalide', async () => {
      prisma.budgetEnvelope.findFirst.mockResolvedValue({
        id: 'env-1',
        clientId,
        budgetId,
        name: 'Env',
        code: 'ENV-1',
        type: BudgetEnvelopeType.RUN,
        status: BudgetEnvelopeStatus.ACTIVE,
        deferredToExerciseId: null,
        budget: { status: BudgetStatus.DRAFT, isVersioned: false, versionStatus: null },
        deferredToExercise: null,
      });
      prisma.budgetExercise.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          clientId,
          'env-1',
          {
            status: BudgetEnvelopeStatus.DEFERRED,
            deferredToExerciseId: 'ex-other',
          },
          { actorUserId: 'user-1', meta: {} },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('sortie de DEFERRED => reset deferredToExerciseId à null', async () => {
      prisma.budgetEnvelope.findFirst.mockResolvedValue({
        id: 'env-1',
        clientId,
        budgetId,
        name: 'Env',
        code: 'ENV-1',
        type: BudgetEnvelopeType.RUN,
        status: BudgetEnvelopeStatus.DEFERRED,
        deferredToExerciseId: 'ex-1',
        budget: { status: BudgetStatus.DRAFT, isVersioned: false, versionStatus: null },
        deferredToExercise: { id: 'ex-1', name: 'Ex', code: '2026' },
      });
      prisma.budgetEnvelope.update.mockResolvedValue({
        id: 'env-1',
        clientId,
        budgetId,
        name: 'Env',
        code: 'ENV-1',
        type: BudgetEnvelopeType.RUN,
        status: BudgetEnvelopeStatus.ACTIVE,
        deferredToExerciseId: null,
      });

      await service.update(
        clientId,
        'env-1',
        { status: BudgetEnvelopeStatus.ACTIVE },
        { actorUserId: 'user-1', meta: {} },
      );

      const updateCall = prisma.budgetEnvelope.update.mock.calls[0][0];
      expect(updateCall.data.deferredToExerciseId).toBeNull();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('retour partiel (succès + échec) sans rollback global', async () => {
      const spy = jest.spyOn(service, 'update');
      spy.mockImplementation(async (_client, id) => {
        if (id === 'env-ko') {
          throw new BadRequestException('invalid transition');
        }
        return { id } as any;
      });

      const result = await service.bulkUpdateStatus(clientId, {
        ids: ['env-ok', 'env-ko'],
        status: BudgetEnvelopeStatus.ACTIVE,
      });

      expect(result.updatedIds).toEqual(['env-ok']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]?.id).toBe('env-ko');
    });
  });
});
