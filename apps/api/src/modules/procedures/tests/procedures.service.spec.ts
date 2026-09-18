import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ProcedureCategory,
  ProcedureStatus,
  ProcedureVersionLifecycle,
} from '@prisma/client';
import { ProceduresService } from '../procedures.service';

describe('ProceduresService', () => {
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };

  function buildService(prisma: Record<string, unknown>) {
    return new ProceduresService(prisma as any, auditLogs as any);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create — happy path : DRAFT + version 1 + audit', async () => {
    const procedure = {
      id: 'proc-1',
      clientId: 'c1',
      code: 'PSSI',
      title: 'PSSI',
      description: null,
      category: ProcedureCategory.SECURITY,
      status: ProcedureStatus.DRAFT,
      ownerUserId: null,
      currentDraftVersionId: 'ver-1',
      currentPublishedVersionId: null,
      createdAt: new Date('2026-09-18T10:00:00Z'),
      updatedAt: new Date('2026-09-18T10:00:00Z'),
    };
    const version = {
      id: 'ver-1',
      clientId: 'c1',
      procedureId: 'proc-1',
      versionNumber: 1,
      lifecycle: ProcedureVersionLifecycle.DRAFT,
      title: 'PSSI',
      updatedAt: new Date('2026-09-18T10:00:00Z'),
    };

    const tx = {
      procedure: {
        create: jest.fn().mockResolvedValue({ ...procedure, currentDraftVersionId: null }),
        update: jest.fn().mockResolvedValue(procedure),
      },
      procedureVersion: {
        create: jest.fn().mockResolvedValue(version),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
      procedure: {
        findFirst: jest.fn().mockResolvedValue(procedure),
      },
      procedureVersion: {
        findFirst: jest.fn().mockResolvedValue(version),
      },
      user: { findFirst: jest.fn() },
      clientUser: { findFirst: jest.fn() },
    };

    const service = buildService(prisma);
    const result = await service.create(
      'c1',
      { code: 'pssi', title: 'PSSI', category: ProcedureCategory.SECURITY },
      'actor-1',
      { requestId: 'req-1' },
    );

    expect(tx.procedure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'c1',
          code: 'PSSI',
          status: ProcedureStatus.DRAFT,
        }),
      }),
    );
    expect(tx.procedureVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionNumber: 1,
          lifecycle: ProcedureVersionLifecycle.DRAFT,
        }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procedure.created',
        resourceType: 'procedure',
        resourceId: 'proc-1',
        clientId: 'c1',
      }),
    );
    expect(result.code).toBe('PSSI');
    expect(result.currentDraft?.versionNumber).toBe(1);
  });

  it('create — conflit code → 409', async () => {
    const prisma = {
      $transaction: jest.fn().mockRejectedValue({ code: 'P2002' }),
      clientUser: { findFirst: jest.fn() },
    };
    const service = buildService(prisma);
    await expect(
      service.create('c1', { code: 'PSSI', title: 'Dup' }, 'actor-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('getById — isolation : introuvable hors client', async () => {
    const prisma = {
      procedure: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = buildService(prisma);
    await expect(service.getById('c1', 'proc-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.procedure.findFirst).toHaveBeenCalledWith({
      where: { id: 'proc-x', clientId: 'c1' },
    });
  });

  it('list — filtre clientId systématique', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      procedure: { count, findMany },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
      user: { findMany: jest.fn().mockResolvedValue([]) },
      procedureVersion: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = buildService(prisma);
    await service.list('c1', { limit: 10, offset: 0 });
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        clientId: 'c1',
        status: { not: ProcedureStatus.ARCHIVED },
      }),
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'c1' }),
      }),
    );
  });
});
