import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BudgetVersionKind, BudgetVersionStatus } from '@prisma/client';
import { BudgetVersioningService } from './budget-versioning.service';

describe('BudgetVersioningService', () => {
  let service: BudgetVersioningService;
  let prisma: any;
  let auditLogs: any;
  let budgetSnapshotsService: { create: jest.Mock };

  const clientId = 'client-1';
  const budgetId = 'budget-1';
  const exerciseId = 'ex-1';
  const sourceBudget = {
    id: budgetId,
    clientId,
    exerciseId,
    name: 'Budget IT 2026',
    code: 'BUD-2026-IT',
    description: null,
    currency: 'EUR',
    status: 'DRAFT',
    ownerUserId: null,
    versionSetId: null,
    versionNumber: null,
    versionLabel: null,
    versionKind: null,
    versionStatus: null,
    parentBudgetId: null,
    activatedAt: null,
    archivedAt: null,
    isVersioned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    envelopes: [],
    budgetLines: [],
  };

  const versionSet = {
    id: 'vs-1',
    clientId,
    exerciseId,
    code: 'BUD-2026-IT',
    name: 'Budget IT 2026',
    description: null,
    baselineBudgetId: null,
    activeBudgetId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const newBudgetV1 = {
    id: 'bud-v1',
    clientId,
    exerciseId,
    name: 'Budget IT 2026',
    code: 'BUD-2026-IT-V1',
    versionSetId: 'vs-1',
    versionNumber: 1,
    versionLabel: 'V1',
    versionKind: BudgetVersionKind.BASELINE,
    versionStatus: BudgetVersionStatus.ACTIVE,
    isVersioned: true,
  };

  beforeEach(() => {
    prisma = {
      budget: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      budgetVersionSet: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      budgetEnvelope: { create: jest.fn(), update: jest.fn() },
      budgetLine: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    budgetSnapshotsService = {
      create: jest.fn().mockResolvedValue({ id: 'snap-1' }),
    };
    service = new BudgetVersioningService(
      prisma,
      auditLogs,
      budgetSnapshotsService as any,
    );
  });

  describe('createBaseline', () => {
    it('throws if budget not found', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);
      await expect(
        service.createBaseline(clientId, budgetId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if budget already versioned', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        ...sourceBudget,
        isVersioned: true,
      });
      await expect(
        service.createBaseline(clientId, budgetId),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates version set and baseline budget in transaction', async () => {
      prisma.budget.findFirst.mockResolvedValue(sourceBudget);
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          budgetVersionSet: {
            create: jest.fn().mockResolvedValue(versionSet),
            update: jest.fn().mockResolvedValue({ ...versionSet, baselineBudgetId: 'bud-v1', activeBudgetId: 'bud-v1' }),
          },
          budget: { create: jest.fn().mockResolvedValue(newBudgetV1) },
          budgetEnvelope: { create: jest.fn(), update: jest.fn() },
          budgetLine: { create: jest.fn() },
        };
        return cb(tx);
      });

      const result = await service.createBaseline(clientId, budgetId);

      expect(result.versionSetId).toBe('vs-1');
      expect(result.budgetId).toBe('bud-v1');
      expect(result.versionNumber).toBe(1);
      expect(result.versionKind).toBe(BudgetVersionKind.BASELINE);
      expect(result.versionStatus).toBe(BudgetVersionStatus.ACTIVE);
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'budget_version_set.created' }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'budget_version.baseline_created' }),
      );
    });
  });

  describe('createCycleRevision', () => {
    it('throws when budget is not the active version of the set', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: budgetId,
        clientId,
        versionSetId: 'vs-1',
        versionStatus: BudgetVersionStatus.DRAFT,
        versionSet: { activeBudgetId: 'other-budget', baselineBudgetId: null },
        exercise: { name: 'Ex 2026', code: '2026' },
      });
      await expect(
        service.createCycleRevision(clientId, budgetId, 'T1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('activateVersion', () => {
    it('returns success without change when already ACTIVE (idempotent)', async () => {
      const budget = {
        id: budgetId,
        clientId,
        versionSetId: 'vs-1',
        versionSet: {},
        versionStatus: BudgetVersionStatus.ACTIVE,
      };
      prisma.budget.findFirst.mockResolvedValue(budget);

      const result = await service.activateVersion(clientId, budgetId);

      expect(result.versionStatus).toBe(BudgetVersionStatus.ACTIVE);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(auditLogs.create).not.toHaveBeenCalled();
    });
  });

  describe('archiveVersion', () => {
    it('throws when archiving baseline that is the only version', async () => {
      const budget = {
        id: budgetId,
        clientId,
        versionSetId: 'vs-1',
        versionSet: { baselineBudgetId: budgetId },
        versionStatus: BudgetVersionStatus.SUPERSEDED,
      };
      prisma.budget.findFirst.mockResolvedValue(budget);
      prisma.budget.count.mockResolvedValue(1);

      await expect(
        service.archiveVersion(clientId, budgetId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getVersionHistory', () => {
    it('throws if budget not versioned', async () => {
      prisma.budget.findFirst.mockResolvedValue({ ...sourceBudget, versionSetId: null });
      await expect(
        service.getVersionHistory(clientId, budgetId),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns versions sorted by versionNumber', async () => {
      prisma.budget.findFirst.mockResolvedValue({ ...sourceBudget, versionSetId: 'vs-1' });
      const versions = [
        { id: 'b1', versionNumber: 1, versionLabel: 'V1', versionKind: BudgetVersionKind.BASELINE, versionStatus: BudgetVersionStatus.ACTIVE, code: 'BUD-V1', name: 'B', status: 'DRAFT', parentBudgetId: null, activatedAt: null, archivedAt: null },
        { id: 'b2', versionNumber: 2, versionLabel: 'V2', versionKind: BudgetVersionKind.REVISION, versionStatus: BudgetVersionStatus.DRAFT, code: 'BUD-V2', name: 'B', status: 'DRAFT', parentBudgetId: 'b1', activatedAt: null, archivedAt: null },
      ];
      prisma.budget.findMany.mockResolvedValue(versions);

      const result = await service.getVersionHistory(clientId, budgetId);

      expect(result).toHaveLength(2);
      expect(result[0].versionNumber).toBe(1);
      expect(result[1].versionNumber).toBe(2);
    });
  });

  describe('compareVersions', () => {
    it('throws when budgets from different version sets', async () => {
      prisma.budget.findFirst
        .mockResolvedValueOnce({ id: 'b1', clientId, versionSetId: 'vs-1', budgetLines: [] })
        .mockResolvedValueOnce({ id: 'b2', clientId, versionSetId: 'vs-2', budgetLines: [] });

      await expect(
        service.compareVersions(clientId, 'b1', 'b2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listVersionSets', () => {
    it('returns items and total', async () => {
      prisma.budgetVersionSet.findMany.mockResolvedValue([versionSet]);
      prisma.budgetVersionSet.count.mockResolvedValue(1);

      const result = await service.listVersionSets(clientId, { limit: 20, offset: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].code).toBe('BUD-2026-IT');
    });
  });

  describe('getVersionSetById', () => {
    it('throws if not found', async () => {
      prisma.budgetVersionSet.findFirst.mockResolvedValue(null);
      await expect(
        service.getVersionSetById(clientId, 'vs-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
