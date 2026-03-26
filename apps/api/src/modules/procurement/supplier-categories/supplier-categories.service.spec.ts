import { ConflictException } from '@nestjs/common';
import { SupplierCategoriesService } from './supplier-categories.service';

describe('SupplierCategoriesService', () => {
  let service: SupplierCategoriesService;
  let prisma: any;
  let auditLogs: any;

  beforeEach(() => {
    prisma = {
      supplierCategory: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new SupplierCategoriesService(prisma, auditLogs);
  });

  it('create crée une catégorie valide', async () => {
    prisma.supplierCategory.findFirst.mockResolvedValue(null);
    prisma.supplierCategory.create.mockResolvedValue({
      id: 'cat-1',
      clientId: 'c1',
      name: 'Cloud',
      code: null,
      color: null,
      icon: null,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create('c1', { name: ' Cloud ' });
    expect(result.name).toBe('Cloud');
    expect(prisma.supplierCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ normalizedName: 'cloud' }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'supplier_category.created' }),
    );
  });

  it('create refuse un doublon normalizedName', async () => {
    prisma.supplierCategory.findFirst.mockResolvedValue({ id: 'cat-dup' });
    await expect(service.create('c1', { name: 'cloud' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('update refuse un conflit de nom', async () => {
    prisma.supplierCategory.findFirst
      .mockResolvedValueOnce({
        id: 'cat-1',
        clientId: 'c1',
        name: 'Cloud',
        normalizedName: 'cloud',
        code: null,
        color: null,
        icon: null,
        sortOrder: 0,
        isActive: true,
      })
      .mockResolvedValueOnce({ id: 'cat-2' });

    await expect(service.update('c1', 'cat-1', { name: 'ERP' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('deactivate est idempotent si déjà inactif', async () => {
    prisma.supplierCategory.findFirst.mockResolvedValue({
      id: 'cat-1',
      clientId: 'c1',
      name: 'Cloud',
      code: null,
      color: null,
      icon: null,
      sortOrder: 0,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.deactivate('c1', 'cat-1');
    expect(result.isActive).toBe(false);
    expect(prisma.supplierCategory.update).not.toHaveBeenCalled();
  });
});
