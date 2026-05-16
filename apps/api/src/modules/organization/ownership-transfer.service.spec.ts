import { BadRequestException } from '@nestjs/common';
import { BudgetLineStatus, BudgetStatus, ProjectStatus } from '@prisma/client';
import { OwnershipTransferService } from './ownership-transfer.service';

describe('OwnershipTransferService', () => {
  const auditLogs = { create: jest.fn() };
  const prisma = {
    orgUnit: { findFirst: jest.fn() },
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    budget: { count: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    budgetLine: { count: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    supplier: { count: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    supplierContract: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    strategicObjective: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: OwnershipTransferService;

  const activeUnit = {
    id: 'ou-active',
    name: 'Dir A',
    type: 'DIRECTION',
    code: 'A',
    status: 'ACTIVE',
    clientId: 'c1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OwnershipTransferService(prisma as never, auditLogs as never);
    prisma.orgUnit.findFirst.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'from') {
        return Promise.resolve({ ...activeUnit, id: 'from' });
      }
      if (where.id === 'to') {
        return Promise.resolve({ ...activeUnit, id: 'to' });
      }
      return Promise.resolve(null);
    });
    prisma.project.count.mockResolvedValue(2);
    prisma.project.findMany.mockResolvedValue([
      { id: 'p1', name: 'Proj', code: 'P1' },
    ]);
    prisma.project.updateMany.mockResolvedValue({ count: 2 });
  });

  it('dry-run does not update or audit', async () => {
    const result = await service.transfer(
      'c1',
      {
        fromOrgUnitId: 'from',
        toOrgUnitId: 'to',
        resourceTypes: ['PROJECT'],
        dryRun: true,
      },
      { actorUserId: 'u1' },
    );
    expect(result.applied).toBe(false);
    expect(prisma.project.updateMany).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('apply without confirmApply throws 400', async () => {
    await expect(
      service.transfer(
        'c1',
        {
          fromOrgUnitId: 'from',
          toOrgUnitId: 'to',
          resourceTypes: ['PROJECT'],
          dryRun: false,
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('apply with confirmApply updates and audits', async () => {
    const result = await service.transfer(
      'c1',
      {
        fromOrgUnitId: 'from',
        toOrgUnitId: 'to',
        resourceTypes: ['PROJECT'],
        dryRun: false,
        confirmApply: true,
      },
      { actorUserId: 'u1' },
    );
    expect(result.applied).toBe(true);
    expect(prisma.project.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 'c1',
        ownerOrgUnitId: 'from',
        status: { notIn: [ProjectStatus.ARCHIVED, ProjectStatus.CANCELLED] },
      },
      data: { ownerOrgUnitId: 'to' },
    });
    expect(auditLogs.create).toHaveBeenCalled();
  });

  it('BudgetLine updateMany only matches stored ownerOrgUnitId', async () => {
    prisma.budgetLine.count.mockResolvedValue(1);
    prisma.budgetLine.findMany.mockResolvedValue([
      { id: 'bl1', name: 'L1', code: 'L1' },
    ]);
    prisma.budgetLine.updateMany.mockResolvedValue({ count: 1 });

    await service.transfer(
      'c1',
      {
        fromOrgUnitId: 'from',
        toOrgUnitId: 'to',
        resourceTypes: ['BUDGET_LINE'],
        dryRun: false,
        confirmApply: true,
      },
      {},
    );

    expect(prisma.budgetLine.updateMany).toHaveBeenCalledWith({
      where: {
        clientId: 'c1',
        ownerOrgUnitId: 'from',
        status: { notIn: [BudgetLineStatus.ARCHIVED, BudgetLineStatus.CLOSED] },
      },
      data: { ownerOrgUnitId: 'to' },
    });
  });
});
