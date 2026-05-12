import { NotFoundException } from '@nestjs/common';
import { OrganizationUnitsService } from './organization-units.service';

describe('OrganizationUnitsService.removeMember', () => {
  function svc(prisma: any) {
    return new OrganizationUnitsService(prisma, { create: jest.fn() } as any);
  }

  it('404 when unit not in client', async () => {
    const prisma = {
      orgUnit: { findFirst: jest.fn().mockResolvedValue(null) },
      orgUnitMembership: { findFirst: jest.fn(), delete: jest.fn() },
    };
    await expect(svc(prisma).removeMember('c1', 'u1', 'm1', {})).rejects.toThrow(NotFoundException);
    expect(prisma.orgUnitMembership.findFirst).not.toHaveBeenCalled();
  });

  it('404 when membership orgUnitId mismatches URL unitId', async () => {
    const prisma = {
      orgUnit: { findFirst: jest.fn().mockResolvedValue({ id: 'u1' }) },
      orgUnitMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'm1',
          clientId: 'c1',
          orgUnitId: 'other',
          resourceId: 'r1',
          resource: { id: 'r1', name: 'x', type: 'HUMAN', email: null },
        }),
        delete: jest.fn(),
      },
    };
    await expect(svc(prisma).removeMember('c1', 'u1', 'm1', {})).rejects.toThrow(NotFoundException);
    expect(prisma.orgUnitMembership.delete).not.toHaveBeenCalled();
  });

  it('404 when membership clientId mismatches', async () => {
    const prisma = {
      orgUnit: { findFirst: jest.fn().mockResolvedValue({ id: 'u1' }) },
      orgUnitMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'm1',
          clientId: 'other',
          orgUnitId: 'u1',
          resourceId: 'r1',
          resource: { id: 'r1', name: 'x', type: 'HUMAN', email: null },
        }),
        delete: jest.fn(),
      },
    };
    await expect(svc(prisma).removeMember('c1', 'u1', 'm1', {})).rejects.toThrow(NotFoundException);
  });
});
