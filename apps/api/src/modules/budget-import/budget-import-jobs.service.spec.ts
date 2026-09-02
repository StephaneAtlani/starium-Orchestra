import { NotFoundException } from '@nestjs/common';
import { BudgetImportJobsService } from './budget-import-jobs.service';

describe('BudgetImportJobsService', () => {
  let service: BudgetImportJobsService;
  let prisma: {
    budgetImportJob: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
    };
  };

  const clientId = 'client-1';

  const sampleJob = {
    id: 'job-1',
    clientId,
    budgetId: 'budget-1',
    mappingId: 'map-1',
    fileName: 'export.csv',
    sourceType: 'CSV' as const,
    status: 'COMPLETED' as const,
    importMode: 'UPSERT' as const,
    totalRows: 10,
    createdRows: 5,
    updatedRows: 4,
    skippedRows: 1,
    errorRows: 0,
    summary: { warningsCount: 0, errorsByType: {} },
    createdById: 'user-1',
    createdAt: new Date('2026-09-02T08:00:00.000Z'),
    budget: {
      id: 'budget-1',
      name: 'Budget RUN',
      code: 'RUN-2026',
      exercise: { name: 'Exercice 2026', code: 'EX-2026' },
    },
    mapping: { id: 'map-1', name: 'Compta Sage' },
    createdBy: {
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@example.com',
    },
  };

  beforeEach(() => {
    prisma = {
      budgetImportJob: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new BudgetImportJobsService(prisma as any);
  });

  describe('list', () => {
    it('scopes by clientId and returns labels', async () => {
      prisma.budgetImportJob.findMany.mockResolvedValue([sampleJob]);
      prisma.budgetImportJob.count.mockResolvedValue(1);

      const result = await service.list(clientId, { limit: 20, offset: 0 });

      expect(prisma.budgetImportJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId },
        }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].budgetLabel).toBe('Budget RUN (RUN-2026)');
      expect(result.items[0].exerciseLabel).toBe('Exercice 2026 (EX-2026)');
      expect(result.items[0].mappingName).toBe('Compta Sage');
      expect(result.items[0].createdByLabel).toBe('Marie Dupont');
    });

    it('applies budgetId and status filters', async () => {
      prisma.budgetImportJob.findMany.mockResolvedValue([]);
      prisma.budgetImportJob.count.mockResolvedValue(0);

      await service.list(clientId, {
        budgetId: 'budget-1',
        status: 'FAILED' as any,
        limit: 10,
        offset: 0,
      });

      expect(prisma.budgetImportJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId,
            budgetId: 'budget-1',
            status: 'FAILED',
          },
        }),
      );
    });
  });

  describe('getById', () => {
    it('returns job for same client', async () => {
      prisma.budgetImportJob.findFirst.mockResolvedValue(sampleJob);
      const result = await service.getById(clientId, 'job-1');
      expect(result.id).toBe('job-1');
      expect(result.createdByLabel).toBe('Marie Dupont');
    });

    it('throws NotFound for missing or cross-client job', async () => {
      prisma.budgetImportJob.findFirst.mockResolvedValue(null);
      await expect(service.getById(clientId, 'other')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.budgetImportJob.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'other', clientId },
        }),
      );
    });
  });
});
