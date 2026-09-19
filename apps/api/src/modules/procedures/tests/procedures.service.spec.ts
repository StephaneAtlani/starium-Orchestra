import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ProcedureStatus,
  ProcedureVersionLifecycle,
} from '@prisma/client';
import { ProceduresService } from '../procedures.service';

describe('ProceduresService', () => {
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const categories = {
    resolveActiveCategoryId: jest.fn().mockResolvedValue('cat-sec'),
    ensureDefaults: jest.fn().mockResolvedValue(undefined),
  };
  const stakeholders = {
    ensureCreatorAsEditor: jest.fn().mockResolvedValue(undefined),
    countByRole: jest.fn().mockResolvedValue({
      EDITOR: 1,
      REVIEWER: 1,
      VALIDATOR: 1,
    }),
    hasRole: jest.fn().mockResolvedValue(true),
    isAdminForcer: jest.fn().mockResolvedValue(false),
    listUserIdsByRole: jest.fn().mockResolvedValue([]),
  };
  const notifications = {
    createForUser: jest.fn().mockResolvedValue(undefined),
  };
  const emailService = {
    queueEmail: jest.fn().mockResolvedValue(undefined),
  };

  function buildService(prisma: Record<string, unknown>) {
    const assets = {
      assertAssetsBelongToProcedure: jest.fn().mockResolvedValue(undefined),
    };
    return new ProceduresService(
      prisma as any,
      auditLogs as any,
      assets as any,
      categories as any,
      stakeholders as any,
      notifications as any,
      emailService as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    categories.resolveActiveCategoryId.mockResolvedValue('cat-sec');
    stakeholders.countByRole.mockResolvedValue({
      EDITOR: 1,
      REVIEWER: 1,
      VALIDATOR: 1,
    });
    stakeholders.hasRole.mockResolvedValue(true);
    stakeholders.isAdminForcer.mockResolvedValue(false);
    stakeholders.listUserIdsByRole.mockResolvedValue([]);
  });

  it('create — happy path : DRAFT + version 1 + EMPTY_V2 + éditeur auto', async () => {
    const category = { id: 'cat-sec', code: 'SECURITY', label: 'Sécurité' };
    const procedure = {
      id: 'proc-1',
      clientId: 'c1',
      code: 'PSSI',
      title: 'PSSI',
      description: null,
      categoryId: 'cat-sec',
      category,
      status: ProcedureStatus.DRAFT,
      ownerUserId: null,
      currentDraftVersionId: 'ver-1',
      currentPublishedVersionId: null,
      sourceTemplateId: null,
      sourceTemplateName: null,
      createdAt: new Date('2026-09-18T10:00:00Z'),
      updatedAt: new Date('2026-09-18T10:00:00Z'),
    };
    const version = {
      id: 'ver-1',
      clientId: 'c1',
      procedureId: 'proc-1',
      versionMajor: null,
      versionMinor: null,
      lifecycle: ProcedureVersionLifecycle.DRAFT,
      title: 'PSSI',
      contentJson: { schemaVersion: 2, blocks: [] },
      updatedAt: new Date('2026-09-18T10:00:00Z'),
    };

    const tx = {
      procedure: {
        create: jest.fn().mockResolvedValue({
          ...procedure,
          currentDraftVersionId: null,
        }),
        update: jest.fn().mockResolvedValue(procedure),
      },
      procedureVersion: {
        create: jest.fn().mockResolvedValue(version),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (fn: any) => fn(tx)),
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          ...procedure,
          category,
          sourceTemplateId: null,
          sourceTemplateName: null,
          sourceTemplate: null,
        }),
      },
      procedureVersion: {
        findFirst: jest.fn().mockResolvedValue(version),
      },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const service = buildService(prisma);
    const result = await service.create(
      'c1',
      { code: 'pssi', title: 'PSSI' },
      'actor-1',
    );

    expect(result.id).toBe('proc-1');
    expect(stakeholders.ensureCreatorAsEditor).toHaveBeenCalledWith(
      'c1',
      'proc-1',
      'actor-1',
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
          updatedAt: new Date('2026-09-18T10:00:00Z'),
          title: 'PSSI',
          ownerUserId: null,
        }),
      },
      procedureVersion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ver-1',
          contentJson: { schemaVersion: 2, blocks: [{ t: 'p', html: '' }] },
          lifecycle: ProcedureVersionLifecycle.DRAFT,
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

  it('transition — refuse listes incomplètes vers IN_REVIEW', async () => {
    stakeholders.countByRole.mockResolvedValue({
      EDITOR: 1,
      REVIEWER: 0,
      VALIDATOR: 1,
    });
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proc-1',
          clientId: 'c1',
          status: ProcedureStatus.DRAFT,
          currentDraftVersionId: 'ver-1',
          updatedAt: new Date('2026-09-18T10:00:00Z'),
          title: 'PSSI',
          ownerUserId: null,
        }),
      },
      procedureVersion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ver-1',
          contentJson: {
            schemaVersion: 2,
            blocks: [{ t: 'p', html: 'Contenu' }],
          },
          lifecycle: ProcedureVersionLifecycle.DRAFT,
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
    ).rejects.toThrow(/relecteur/);
  });

  it('transition — hors liste → Forbidden', async () => {
    stakeholders.hasRole.mockResolvedValue(false);
    stakeholders.isAdminForcer.mockResolvedValue(false);
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proc-1',
          clientId: 'c1',
          status: ProcedureStatus.IN_REVIEW,
          currentDraftVersionId: 'ver-1',
          updatedAt: new Date('2026-09-18T10:00:00Z'),
          title: 'PSSI',
          ownerUserId: null,
        }),
      },
    };
    const service = buildService(prisma);
    await expect(
      service.transition(
        'c1',
        'proc-1',
        { to: 'PENDING_VALIDATION' as any },
        'stranger',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('transition — relecteur → PENDING_VALIDATION', async () => {
    const prisma = {
      procedure: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'proc-1',
            clientId: 'c1',
            status: ProcedureStatus.IN_REVIEW,
            currentDraftVersionId: 'ver-1',
            updatedAt: new Date('2026-09-18T10:00:00Z'),
            title: 'PSSI',
            ownerUserId: null,
          })
          .mockResolvedValue({
            id: 'proc-1',
            clientId: 'c1',
            code: 'PSSI',
            title: 'PSSI',
            description: null,
            categoryId: 'cat-sec',
            category: { id: 'cat-sec', code: 'SECURITY', label: 'Sécurité' },
            status: ProcedureStatus.PENDING_VALIDATION,
            ownerUserId: null,
            currentDraftVersionId: 'ver-1',
            currentPublishedVersionId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        update: jest.fn().mockResolvedValue({}),
      },
      procedureVersion: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ver-1',
          contentJson: {
            schemaVersion: 2,
            blocks: [{ t: 'p', html: 'OK' }],
          },
          lifecycle: ProcedureVersionLifecycle.DRAFT,
          title: 'PSSI',
          updatedAt: new Date(),
        }),
      },
      user: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = buildService(prisma);
    const result = await service.transition(
      'c1',
      'proc-1',
      { to: 'PENDING_VALIDATION' as any },
      'reviewer-1',
    );
    expect(result.status).toBe(ProcedureStatus.PENDING_VALIDATION);
    expect(prisma.procedure.update).toHaveBeenCalled();
  });

  it('transition — validateur publie depuis PENDING_VALIDATION', async () => {
    const draft = {
      id: 'ver-1',
      title: 'PSSI',
      contentJson: {
        schemaVersion: 2,
        blocks: [{ t: 'p', html: 'OK' }],
      },
      lifecycle: ProcedureVersionLifecycle.DRAFT,
    };
    const tx = {
      procedureVersion: {
        update: jest.fn().mockResolvedValue({
          ...draft,
          versionMajor: 1,
          versionMinor: 0,
          bumpType: 'MINOR',
          lifecycle: ProcedureVersionLifecycle.PUBLISHED,
          publishedAt: new Date(),
          publishedByUserId: 'val-1',
        }),
        create: jest.fn().mockResolvedValue({
          id: 'ver-2',
          lifecycle: ProcedureVersionLifecycle.DRAFT,
        }),
      },
      procedure: {
        update: jest.fn().mockResolvedValue({
          id: 'proc-1',
          status: ProcedureStatus.PUBLISHED,
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (fn: any) => fn(tx)),
      procedure: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'proc-1',
            clientId: 'c1',
            status: ProcedureStatus.PENDING_VALIDATION,
            currentDraftVersionId: 'ver-1',
            currentPublishedVersionId: null,
            updatedAt: new Date('2026-09-18T10:00:00Z'),
            title: 'PSSI',
            ownerUserId: null,
          })
          .mockResolvedValue({
            id: 'proc-1',
            clientId: 'c1',
            code: 'PSSI',
            title: 'PSSI',
            description: null,
            categoryId: 'cat-sec',
            category: { id: 'cat-sec', code: 'SECURITY', label: 'Sécurité' },
            status: ProcedureStatus.PUBLISHED,
            ownerUserId: null,
            currentDraftVersionId: 'ver-2',
            currentPublishedVersionId: 'ver-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
      },
      procedureVersion: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(draft)
          .mockResolvedValue({
            id: 'ver-1',
            versionMajor: 1,
            versionMinor: 0,
            bumpType: 'MINOR',
            publishedAt: new Date(),
            title: 'PSSI',
            lifecycle: ProcedureVersionLifecycle.PUBLISHED,
            contentJson: draft.contentJson,
            updatedAt: new Date(),
          }),
      },
      user: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = buildService(prisma);
    const result = await service.transition(
      'c1',
      'proc-1',
      { to: 'PUBLISHED' as any },
      'val-1',
    );
    expect(result.status).toBe(ProcedureStatus.PUBLISHED);
  });

  it('transition — conflit expectedUpdatedAt', async () => {
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proc-1',
          status: ProcedureStatus.DRAFT,
          updatedAt: new Date('2026-09-18T10:00:00Z'),
        }),
      },
    };
    const service = buildService(prisma);
    await expect(
      service.transition(
        'c1',
        'proc-1',
        {
          to: 'IN_REVIEW' as any,
          expectedUpdatedAt: '2026-09-18T09:00:00.000Z',
        },
        'actor-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('getById — 404', async () => {
    const prisma = {
      procedure: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = buildService(prisma);
    await expect(service.getById('c1', 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
