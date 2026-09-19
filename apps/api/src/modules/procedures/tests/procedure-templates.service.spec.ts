import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcedureTemplateStatus } from '@prisma/client';
import { ProcedureTemplatesService } from '../procedure-templates.service';

describe('ProcedureTemplatesService', () => {
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };

  function build(prisma: Record<string, unknown>) {
    return new ProcedureTemplatesService(prisma as any, auditLogs as any);
  }

  beforeEach(() => jest.clearAllMocks());

  it('create — brouillon avec outline et warning imbrication', async () => {
    const created = {
      id: 'tpl-1',
      name: 'Charte sécu',
      status: ProcedureTemplateStatus.DRAFT,
      categoryId: null,
      outlineJson: [
        { level: 1, title: 'Intro' },
        { level: 3, title: 'Détail' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
    };
    const prisma = {
      procedureCategory: { findFirst: jest.fn() },
      procedureTemplate: {
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const svc = build(prisma);
    const res = await svc.create(
      'c1',
      {
        name: 'Charte sécu',
        outline: [
          { level: 1, title: 'Intro' },
          { level: 3, title: 'Détail' },
        ],
      },
      'u1',
    );
    expect(res.status).toBe('DRAFT');
    expect(res.outline).toHaveLength(2);
    expect(res.hierarchyWarnings.length).toBeGreaterThan(0);
    expect(auditLogs.create).toHaveBeenCalled();
  });

  it('create — refuse catégorie hors client', async () => {
    const prisma = {
      procedureCategory: { findFirst: jest.fn().mockResolvedValue(null) },
      procedureTemplate: { create: jest.fn() },
    };
    const svc = build(prisma);
    await expect(
      svc.create('c1', { name: 'X', categoryId: 'cat-x' }, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.procedureTemplate.create).not.toHaveBeenCalled();
  });

  it('update — autorise édition ACTIVE', async () => {
    const existing = {
      id: 'tpl-1',
      clientId: 'c1',
      name: 'Actif',
      status: ProcedureTemplateStatus.ACTIVE,
      categoryId: null,
      outlineJson: [{ level: 1, title: 'A' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
    };
    const prisma = {
      procedureTemplate: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({
          ...existing,
          name: 'Nouveau',
        }),
      },
    };
    const svc = build(prisma);
    const res = await svc.update('c1', 'tpl-1', { name: 'Nouveau' }, 'u1');
    expect(res.name).toBe('Nouveau');
  });

  it('update — refuse ARCHIVED', async () => {
    const prisma = {
      procedureTemplate: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tpl-1',
          status: ProcedureTemplateStatus.ARCHIVED,
          name: 'X',
          outlineJson: [],
          categoryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: null,
        }),
        update: jest.fn(),
      },
    };
    const svc = build(prisma);
    await expect(
      svc.update('c1', 'tpl-1', { name: 'Nouveau' }, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transition ACTIVE — refuse sans H1', async () => {
    const prisma = {
      procedureTemplate: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tpl-1',
          name: 'Sans H1',
          status: ProcedureTemplateStatus.DRAFT,
          outlineJson: [{ level: 2, title: 'Sous' }],
          categoryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: null,
        }),
        update: jest.fn(),
      },
    };
    const svc = build(prisma);
    await expect(
      svc.transition('c1', 'tpl-1', { status: 'ACTIVE' }, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transition ACTIVE — OK avec H1', async () => {
    const existing = {
      id: 'tpl-1',
      name: 'OK',
      status: ProcedureTemplateStatus.DRAFT,
      outlineJson: [{ level: 1, title: 'Intro' }],
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
    };
    const prisma = {
      procedureTemplate: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({
          ...existing,
          status: ProcedureTemplateStatus.ACTIVE,
        }),
      },
    };
    const svc = build(prisma);
    const res = await svc.transition('c1', 'tpl-1', { status: 'ACTIVE' }, 'u1');
    expect(res.status).toBe('ACTIVE');
  });

  it('remove — archive forcée si références', async () => {
    const existing = {
      id: 'tpl-1',
      name: 'Used',
      status: ProcedureTemplateStatus.ACTIVE,
      outlineJson: [{ level: 1, title: 'A' }],
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
    };
    const prisma = {
      procedureTemplate: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({
          ...existing,
          status: ProcedureTemplateStatus.ARCHIVED,
        }),
        delete: jest.fn(),
      },
      procedure: { count: jest.fn().mockResolvedValue(2) },
    };
    const svc = build(prisma);
    const res = await svc.remove('c1', 'tpl-1', 'u1');
    expect(res.deleted).toBe(false);
    expect(res.archived).toBe(true);
    expect(prisma.procedureTemplate.delete).not.toHaveBeenCalled();
  });

  it('remove — hard delete si zéro ref', async () => {
    const existing = {
      id: 'tpl-1',
      name: 'Unused',
      status: ProcedureTemplateStatus.DRAFT,
      outlineJson: [],
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: null,
    };
    const prisma = {
      procedureTemplate: {
        findFirst: jest.fn().mockResolvedValue(existing),
        delete: jest.fn().mockResolvedValue(existing),
      },
      procedure: { count: jest.fn().mockResolvedValue(0) },
    };
    const svc = build(prisma);
    const res = await svc.remove('c1', 'tpl-1', 'u1');
    expect(res.deleted).toBe(true);
    expect(prisma.procedureTemplate.delete).toHaveBeenCalled();
  });

  it('get — 404 hors client', async () => {
    const prisma = {
      procedureTemplate: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const svc = build(prisma);
    await expect(svc.get('c1', 'tpl-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('list — scopé client', async () => {
    const prisma = {
      procedureTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const svc = build(prisma);
    await svc.list('c1');
    expect(prisma.procedureTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'c1' } }),
    );
  });
});
