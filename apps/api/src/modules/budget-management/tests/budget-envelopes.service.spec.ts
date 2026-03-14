import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetEnvelopeType } from '@prisma/client';
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
});
