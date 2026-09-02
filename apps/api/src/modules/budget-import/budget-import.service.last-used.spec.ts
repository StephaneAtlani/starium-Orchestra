import { BudgetImportJobStatus } from '@prisma/client';
import { BudgetImportService } from './budget-import.service';

describe('BudgetImportService lastUsedAt', () => {
  it('updates mapping lastUsedAt after successful execute when mappingId set', async () => {
    const prisma = {
      budget: { findFirst: jest.fn().mockResolvedValue({ id: 'b1', status: 'DRAFT' }) },
      generalLedgerAccount: {
        findFirst: jest.fn().mockResolvedValue({ id: 'gla-1' }),
      },
      budgetEnvelope: { findMany: jest.fn().mockResolvedValue([]) },
      budgetImportRowLink: { findMany: jest.fn().mockResolvedValue([]) },
      budgetImportMapping: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      budgetImportJob: {
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          budgetImportJob: {
            create: jest.fn().mockResolvedValue({ id: 'job-1' }),
            update: jest.fn().mockResolvedValue({}),
          },
          budgetLine: {
            create: jest.fn(),
            updateMany: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          budgetImportRowLink: {
            create: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return fn(tx);
      }),
    };
    const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    const fileStore = {
      get: jest.fn().mockReturnValue({
        buffer: Buffer.from('a'),
        meta: {
          clientId: 'c1',
          uploadedByUserId: 'u1',
          fileName: 'f.csv',
          sourceType: 'CSV',
        },
      }),
      delete: jest.fn(),
    };
    const parser = {
      parse: jest.fn().mockResolvedValue({ rows: [] }),
    };
    const matching = {
      buildRowLinkMaps: jest.fn().mockReturnValue({
        byExternalId: new Map(),
        byCompositeHash: new Map(),
      }),
      normalizeRow: jest.fn(),
      resolveMatch: jest.fn(),
    };
    const platformUpload = { getEffectiveMaxBytes: () => 10_000_000 };
    const landingService = {
      recalculateAndPersist: jest.fn().mockResolvedValue(undefined),
    };

    const service = new BudgetImportService(
      prisma as any,
      auditLogs as any,
      fileStore as any,
      parser as any,
      matching as any,
      platformUpload as any,
      landingService as any,
    );

    // Spy resolveActions path: empty resolved rows still completes
    const result = await service.execute(
      'c1',
      'u1',
      {
        budgetId: 'b1',
        fileToken: 'tok',
        mappingId: 'map-1',
        mapping: { fields: {} },
        options: { importMode: 'UPSERT', defaultEnvelopeId: 'env-1' },
      } as any,
      {},
    );

    expect(result.status).toBe(BudgetImportJobStatus.COMPLETED);
    expect(prisma.budgetImportMapping.updateMany).toHaveBeenCalledWith({
      where: { id: 'map-1', clientId: 'c1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
