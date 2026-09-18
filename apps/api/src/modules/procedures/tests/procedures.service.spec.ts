import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
  const effectivePermissions = {
    resolvePermissionCodesForRequest: jest
      .fn()
      .mockResolvedValue(new Set(['procedures.publish', 'procedures.update'])),
  };

  function buildService(prisma: Record<string, unknown>) {
    const assets = {
      assertAssetsBelongToProcedure: jest.fn().mockResolvedValue(undefined),
    };
    return new ProceduresService(
      prisma as any,
      auditLogs as any,
      assets as any,
      effectivePermissions as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create — happy path : DRAFT + version 1 + EMPTY_V2', async () => {
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
      contentJson: {
        schemaVersion: 2,
        blocks: [
          { t: 'h1', html: '' },
          { t: 'p', html: '' },
        ],
      },
      updatedAt: new Date('2026-09-18T10:00:00Z'),
    };

    const tx = {
      procedure: {
        create: jest
          .fn()
          .mockResolvedValue({ ...procedure, currentDraftVersionId: null }),
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
          category: ProcedureCategory.SECURITY,
        }),
      }),
    );
    expect(tx.procedureVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionNumber: 1,
          lifecycle: ProcedureVersionLifecycle.DRAFT,
          contentJson: expect.objectContaining({ schemaVersion: 2 }),
        }),
      }),
    );
    expect(result.id).toBe('proc-1');
    expect(auditLogs.create).toHaveBeenCalled();
  });

  it('updateDraft — 409 si expectedUpdatedAt ne matche pas', async () => {
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proc-1',
          clientId: 'c1',
          status: ProcedureStatus.DRAFT,
          currentDraftVersionId: 'ver-1',
          updatedAt: new Date('2026-09-18T10:00:00Z'),
        }),
      },
    };
    const service = buildService(prisma);
    await expect(
      service.updateDraft('c1', 'proc-1', {
        contentJson: {
          schemaVersion: 2,
          blocks: [{ t: 'p', html: 'x' }],
        },
        expectedUpdatedAt: '2026-09-18T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('getById — NotFound hors client', async () => {
    const prisma = {
      procedure: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = buildService(prisma);
    await expect(service.getById('c1', 'proc-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('transition — refuse contenu vide vers IN_REVIEW', async () => {
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proc-1',
          clientId: 'c1',
          status: ProcedureStatus.DRAFT,
          currentDraftVersionId: 'ver-1',
          updatedAt: new Date(),
        }),
      },
      procedureVersion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ver-1',
          lifecycle: ProcedureVersionLifecycle.DRAFT,
          contentJson: {
            schemaVersion: 2,
            blocks: [
              { t: 'h1', html: '' },
              { t: 'p', html: '' },
            ],
          },
        }),
      },
    };
    const service = buildService(prisma);
    await expect(
      service.transition(
        'c1',
        'proc-1',
        { to: 'IN_REVIEW' as any },
        'actor-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transition — publish exige procedures.publish', async () => {
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValueOnce(
      new Set(['procedures.update']),
    );
    const service = buildService({
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proc-1',
          status: ProcedureStatus.IN_REVIEW,
          currentDraftVersionId: 'ver-1',
          updatedAt: new Date(),
        }),
      },
    });
    await expect(
      service.transition(
        'c1',
        'proc-1',
        { to: 'PUBLISHED' as any },
        'actor-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
