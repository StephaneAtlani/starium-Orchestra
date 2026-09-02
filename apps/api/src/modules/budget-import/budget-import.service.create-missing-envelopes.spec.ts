import { BudgetImportService } from './budget-import.service';

describe('BudgetImportService createMissingEnvelopes', () => {
  function buildService(overrides?: {
    envelopes?: Array<{ id: string; code: string }>;
    rows?: Record<string, string>[];
  }) {
    const envelopes = overrides?.envelopes ?? [];
    const rows = overrides?.rows ?? [
      { CodeEnv: 'NEW-01', Libelle: 'Ligne A', Montant: '100' },
    ];

    const prisma = {
      budget: { findFirst: jest.fn().mockResolvedValue({ id: 'b1', status: 'DRAFT' }) },
      budgetEnvelope: {
        findMany: jest.fn().mockResolvedValue(envelopes),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      budgetImportRowLink: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    const fileStore = {
      get: jest.fn().mockReturnValue({
        buffer: Buffer.from('x'),
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
      parse: jest.fn().mockResolvedValue({ rows }),
    };
    const matching = {
      buildRowLinkMaps: jest.fn().mockReturnValue({
        byExternalId: new Map(),
        byCompositeHash: new Map(),
      }),
      normalizeRow: jest.fn((row: Record<string, string>, mapping: { fields: Record<string, string> }) => {
        const values: Record<string, string | number | null> = {};
        for (const [logical, col] of Object.entries(mapping.fields ?? {})) {
          const raw = row[col] ?? '';
          if (['amount', 'initialAmount', 'committedAmount', 'consumedAmount'].includes(logical)) {
            values[logical] = Number(String(raw).replace(',', '.'));
          } else {
            values[logical] = String(raw).trim() || null;
          }
        }
        return { values, externalId: null, compositeHash: null };
      }),
      findExistingLink: jest.fn().mockReturnValue(null),
    };
    const platformUpload = { getEffectiveMaxBytes: () => 10_000_000 };
    const landingService = { recalculateAndPersist: jest.fn() };

    const service = new BudgetImportService(
      prisma as any,
      auditLogs as any,
      fileStore as any,
      parser as any,
      matching as any,
      platformUpload as any,
      landingService as any,
    );

    return { service, prisma };
  }

  const mapping = {
    fields: {
      envelopeCode: 'CodeEnv',
      name: 'Libelle',
      amount: 'Montant',
    },
  };

  it('preview : CREATE + WILL_CREATE_ENVELOPE quand code absent et option active', async () => {
    const { service } = buildService();
    const result = await service.preview('c1', 'u1', {
      budgetId: 'b1',
      fileToken: 'tok',
      mapping,
      options: { importMode: 'UPSERT', createMissingEnvelopes: true },
    } as any);

    expect(result.stats.errorRows).toBe(0);
    expect(result.stats.createRows).toBe(1);
    expect(result.previewRows[0].reason).toBe('WILL_CREATE_ENVELOPE');
    expect(result.previewRows[0].data?._willCreateEnvelopeCode).toBe('NEW-01');
    expect(result.warnings[0]).toContain('NEW-01');
  });

  it('preview : MISSING_ENVELOPE si option désactivée et code inconnu', async () => {
    const { service } = buildService();
    const result = await service.preview('c1', 'u1', {
      budgetId: 'b1',
      fileToken: 'tok',
      mapping,
      options: { importMode: 'UPSERT', createMissingEnvelopes: false },
    } as any);

    expect(result.stats.errorRows).toBe(1);
    expect(result.previewRows[0].reason).toBe('MISSING_ENVELOPE');
  });

  it('execute : crée l’enveloppe puis la ligne', async () => {
    const { service, prisma } = buildService();
    const createdEnvelope = {
      id: 'env-new',
      code: 'NEW-01',
      name: 'Enveloppe NEW-01',
    };
    (prisma as any).generalLedgerAccount = {
      findFirst: jest.fn().mockResolvedValue({ id: 'gla-1' }),
    };
    (prisma as any).budgetImportMapping = { updateMany: jest.fn() };
    (prisma as any).budgetImportJob = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };

    const envelopeCreates: unknown[] = [];
    const lineCreates: unknown[] = [];

    (prisma as any).$transaction = jest.fn(async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        budgetImportJob: {
          create: jest.fn().mockResolvedValue({ id: 'job-1' }),
          update: jest.fn().mockResolvedValue({}),
        },
        budgetEnvelope: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((args: unknown) => {
            envelopeCreates.push(args);
            return createdEnvelope;
          }),
        },
        budgetLine: {
          create: jest.fn().mockImplementation((args: unknown) => {
            lineCreates.push(args);
            return { id: 'line-1' };
          }),
          findUnique: jest.fn().mockResolvedValue(null),
        },
        budgetImportRowLink: {
          create: jest.fn(),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };
      return fn(tx);
    });

    const result = await service.execute('c1', 'u1', {
      budgetId: 'b1',
      fileToken: 'tok',
      mapping,
      options: { importMode: 'UPSERT', createMissingEnvelopes: true },
    } as any);

    expect(result.status).toBe('COMPLETED');
    expect(result.createdRows).toBe(1);
    expect(result.errorRows).toBe(0);
    expect(envelopeCreates.length).toBe(1);
    expect((envelopeCreates[0] as any).data.code).toBe('NEW-01');
    expect((lineCreates[0] as any).data.envelopeId).toBe('env-new');
  });
});
