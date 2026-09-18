import { BadRequestException } from '@nestjs/common';
import { ProcedureSettingsService } from '../procedure-settings.service';

describe('ProcedureSettingsService', () => {
  const prisma = {
    client: { findUnique: jest.fn() },
    procedureModuleSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    clientUser: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const auditLogs = { create: jest.fn() };

  const service = new ProcedureSettingsService(
    prisma as never,
    auditLogs as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
  });

  it('getOrCreate — crée défaut usePilotageCycle true', async () => {
    prisma.procedureModuleSettings.findUnique.mockResolvedValue(null);
    prisma.procedureModuleSettings.create.mockResolvedValue({
      usePilotageCycle: true,
      validatorUserIds: [],
      updatedAt: new Date('2026-09-18T00:00:00.000Z'),
    });
    prisma.user.findMany.mockResolvedValue([]);

    const res = await service.getOrCreate('c1');
    expect(res.usePilotageCycle).toBe(true);
    expect(res.validators).toEqual([]);
    expect(prisma.procedureModuleSettings.create).toHaveBeenCalled();
  });

  it('update — refuse cycle off sans validateur', async () => {
    prisma.procedureModuleSettings.findUnique.mockResolvedValue({
      usePilotageCycle: true,
      validatorUserIds: [],
      updatedAt: new Date(),
    });
    prisma.user.findMany.mockResolvedValue([]);

    await expect(
      service.update('c1', { usePilotageCycle: false }, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update — refuse validateur hors client', async () => {
    prisma.procedureModuleSettings.findUnique.mockResolvedValue({
      usePilotageCycle: true,
      validatorUserIds: [],
      updatedAt: new Date(),
    });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.clientUser.findMany.mockResolvedValue([]);

    await expect(
      service.update(
        'c1',
        { usePilotageCycle: false, validatorUserIds: ['u-x'] },
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update — OK cycle off avec validateur membre', async () => {
    prisma.procedureModuleSettings.findUnique.mockResolvedValue({
      usePilotageCycle: true,
      validatorUserIds: [],
      updatedAt: new Date(),
    });
    prisma.clientUser.findMany.mockResolvedValue([{ userId: 'u2' }]);
    prisma.procedureModuleSettings.upsert.mockResolvedValue({
      id: 's1',
      usePilotageCycle: false,
      validatorUserIds: ['u2'],
      updatedAt: new Date('2026-09-18T12:00:00.000Z'),
    });
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u2',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      },
    ]);

    const res = await service.update(
      'c1',
      { usePilotageCycle: false, validatorUserIds: ['u2'] },
      'u1',
    );
    expect(res.usePilotageCycle).toBe(false);
    expect(res.validators).toEqual([
      { userId: 'u2', label: 'Ada Lovelace' },
    ]);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'procedure.settings.updated' }),
    );
  });
});
