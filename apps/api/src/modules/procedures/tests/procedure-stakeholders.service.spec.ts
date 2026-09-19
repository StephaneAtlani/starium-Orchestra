import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProcedureStakeholderRole } from '@prisma/client';
import { ProcedureStakeholdersService } from '../procedure-stakeholders.service';

describe('ProcedureStakeholdersService', () => {
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };

  function build(prisma: Record<string, unknown>) {
    return new ProcedureStakeholdersService(prisma as any, auditLogs as any);
  }

  beforeEach(() => jest.clearAllMocks());

  it('list — 404 si procédure absente', async () => {
    const prisma = {
      procedure: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await expect(build(prisma).list('c1', 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('replace — refuse hors client', async () => {
    const prisma = {
      procedure: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'p1', createdByUserId: 'creator' }),
      },
      clientUser: {
        findFirst: jest.fn().mockResolvedValue({ role: 'CLIENT_USER' }),
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ platformRole: null }),
      },
      procedureStakeholder: {
        findFirst: jest.fn().mockResolvedValue({ id: 's1' }),
      },
    };
    const service = build(prisma);
    await expect(
      service.replace(
        'c1',
        'p1',
        { editors: ['u1', 'u2'], reviewers: [], validators: [] },
        'creator',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replace — happy path créateur', async () => {
    const prisma = {
      procedure: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'p1', createdByUserId: 'creator' }),
      },
      clientUser: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }]),
      },
      $transaction: jest.fn(async (fn: any) =>
        fn({
          procedureStakeholder: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        }),
      ),
      procedureStakeholder: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'u1', role: ProcedureStakeholderRole.EDITOR },
        ]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u1',
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
          },
        ]),
      },
    };
    const service = build(prisma);
    const res = await service.replace(
      'c1',
      'p1',
      { editors: ['u1'], reviewers: [], validators: [] },
      'creator',
    );
    expect(res.editors).toEqual([
      { userId: 'u1', label: 'Ada Lovelace' },
    ]);
    expect(auditLogs.create).toHaveBeenCalled();
  });

  it('replace — hors créateur / éditeur / admin → Forbidden', async () => {
    const prisma = {
      procedure: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'p1', createdByUserId: 'creator' }),
      },
      clientUser: {
        findFirst: jest.fn().mockResolvedValue({ role: 'CLIENT_USER' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ platformRole: null }),
      },
      procedureStakeholder: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    await expect(
      build(prisma).replace(
        'c1',
        'p1',
        { editors: [], reviewers: [], validators: [] },
        'stranger',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
