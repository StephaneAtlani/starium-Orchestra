import { BadRequestException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: any;
  let auditLogs: any;

  beforeEach(() => {
    prisma = {
      supplier: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new SuppliersService(prisma, auditLogs);
  });

  it('quickCreate crée supplier si absent', async () => {
    prisma.supplier.findFirst.mockResolvedValue(null);
    prisma.supplier.create.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Microsoft',
      code: null,
      siret: null,
      vatNumber: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.quickCreate('c1', { name: ' Microsoft ' });

    expect(prisma.supplier.create).toHaveBeenCalled();
    expect(result.name).toBe('Microsoft');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'supplier.created' }),
    );
  });

  it('quickCreate retourne existant si trouvé', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'Microsoft',
      code: null,
      siret: null,
      vatNumber: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.quickCreate('c1', { name: 'Microsoft' });
    expect(prisma.supplier.create).not.toHaveBeenCalled();
    expect(result.id).toBe('sup-1');
  });

  it('refuse patch supplier archive', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'X',
      code: null,
      siret: null,
      vatNumber: null,
      status: 'ARCHIVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.update('c1', 'sup-1', { name: 'Y' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('archive idempotent si deja ARCHIVED', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      clientId: 'c1',
      name: 'X',
      code: null,
      siret: null,
      vatNumber: null,
      status: 'ARCHIVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.archive('c1', 'sup-1');
    expect(result.status).toBe('ARCHIVED');
    expect(prisma.supplier.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});

