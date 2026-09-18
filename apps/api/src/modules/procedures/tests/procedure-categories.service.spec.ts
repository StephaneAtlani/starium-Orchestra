import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProcedureCategoriesService } from '../procedure-categories.service';

describe('ProcedureCategoriesService', () => {
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };

  function build(prisma: Record<string, unknown>) {
    return new ProcedureCategoriesService(prisma as any, auditLogs as any);
  }

  beforeEach(() => jest.clearAllMocks());

  it('list — seed défauts si vide', async () => {
    const prisma = {
      procedureCategory: {
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn().mockResolvedValue({ count: 5 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: '1',
            code: 'PILOTAGE',
            label: 'Pilotage',
            sortOrder: 0,
            isActive: true,
            updatedAt: new Date(),
          },
        ]),
      },
    };
    const svc = build(prisma);
    const rows = await svc.list('c1');
    expect(prisma.procedureCategory.createMany).toHaveBeenCalled();
    expect(rows[0]?.code).toBe('PILOTAGE');
  });

  it('update — refuse désactivation si usage', async () => {
    const prisma = {
      procedureCategory: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cat-1',
          clientId: 'c1',
          label: 'Sécurité',
          sortOrder: 4,
          isActive: true,
        }),
      },
      procedure: { count: jest.fn().mockResolvedValue(2) },
    };
    const svc = build(prisma);
    await expect(
      svc.update('c1', 'cat-1', { isActive: false }, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create — conflit code unique', async () => {
    const prisma = {
      procedureCategory: {
        count: jest.fn().mockResolvedValue(5),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 4 } }),
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    };
    const svc = build(prisma);
    await expect(
      svc.create('c1', { label: 'Pilotage', code: 'PILOTAGE' }, 'u1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('resolveActiveCategoryId — refuse hors client', async () => {
    const prisma = {
      procedureCategory: {
        count: jest.fn().mockResolvedValue(5),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const svc = build(prisma);
    await expect(
      svc.resolveActiveCategoryId('c1', 'other'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update — 404 hors client', async () => {
    const prisma = {
      procedureCategory: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const svc = build(prisma);
    await expect(
      svc.update('c1', 'x', { label: 'X' }, 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
