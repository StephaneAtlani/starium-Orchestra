import { ProcedureSettingsService } from '../procedure-settings.service';

describe('ProcedureSettingsService', () => {
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };

  function build(prisma: Record<string, unknown>) {
    return new ProcedureSettingsService(prisma as any, auditLogs as any);
  }

  beforeEach(() => jest.clearAllMocks());

  it('getOrCreate — crée défaut et renvoie updatedAt', async () => {
    const row = {
      id: 's1',
      clientId: 'c1',
      usePilotageCycle: true,
      validatorUserIds: [],
      updatedAt: new Date('2026-09-18T10:00:00Z'),
    };
    const prisma = {
      client: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
      procedureModuleSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(row),
      },
    };
    const service = build(prisma);
    const res = await service.getOrCreate('c1');
    expect(res.updatedAt).toBe(row.updatedAt.toISOString());
    expect(prisma.procedureModuleSettings.create).toHaveBeenCalled();
  });

  it('update — ignore cycle / validateurs (no-op métier)', async () => {
    const row = {
      id: 's1',
      clientId: 'c1',
      usePilotageCycle: true,
      validatorUserIds: [],
      updatedAt: new Date('2026-09-18T11:00:00Z'),
    };
    const prisma = {
      client: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
      procedureModuleSettings: {
        findUnique: jest.fn().mockResolvedValue(row),
        upsert: jest.fn().mockResolvedValue(row),
      },
    };
    const service = build(prisma);
    const res = await service.update('c1', {}, 'u1');
    expect(res.updatedAt).toBe(row.updatedAt.toISOString());
    expect(auditLogs.create).toHaveBeenCalled();
  });
});
