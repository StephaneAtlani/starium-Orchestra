import { ConflictException } from '@nestjs/common';
import { SupplierContactsService } from './supplier-contacts.service';

describe('SupplierContactsService', () => {
  let service: SupplierContactsService;
  let prisma: Record<string, unknown>;
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      supplier: { findFirst: jest.fn() },
      supplierContact: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          supplierContact: (prisma as { supplierContact: unknown }).supplierContact,
        }),
      ),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new SupplierContactsService(prisma, auditLogs);
  });

  it('recalcule fullName depuis firstName/lastName au create', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
    prisma.supplierContact.findFirst.mockResolvedValue(null);
    prisma.supplierContact.create.mockResolvedValue({
      id: 'c-1',
      clientId: 'client-1',
      supplierId: 'sup-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      fullName: 'Ada Lovelace',
      normalizedName: 'ada lovelace',
      role: null,
      email: null,
      emailNormalized: null,
      phone: null,
      mobile: null,
      isPrimary: false,
      isActive: true,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create('client-1', 'sup-1', {
      firstName: '  Ada ',
      lastName: ' Lovelace ',
      fullName: 'Doit être ignoré',
    });

    expect(prisma.supplierContact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: 'Ada Lovelace',
          normalizedName: 'ada lovelace',
        }),
      }),
    );
  });

  it('recalcule normalizedName depuis le fullName persistant en update', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
    prisma.supplierContact.findFirst
      .mockResolvedValueOnce({
        id: 'c-1',
        clientId: 'client-1',
        supplierId: 'sup-1',
        firstName: null,
        lastName: null,
        fullName: 'Ancien Nom',
        normalizedName: 'ancien nom',
        role: null,
        email: null,
        phone: null,
        mobile: null,
        notes: null,
        isPrimary: false,
        isActive: true,
      })
      .mockResolvedValueOnce(null);
    prisma.supplierContact.update.mockResolvedValue({
      id: 'c-1',
      clientId: 'client-1',
      supplierId: 'sup-1',
      firstName: null,
      lastName: null,
      fullName: 'Nouveau Contact',
      normalizedName: 'nouveau contact',
      role: null,
      email: null,
      emailNormalized: null,
      phone: null,
      mobile: null,
      isPrimary: false,
      isActive: true,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.update('client-1', 'sup-1', 'c-1', { fullName: ' Nouveau   Contact ' });
    expect(prisma.supplierContact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: 'Nouveau Contact',
          normalizedName: 'nouveau contact',
        }),
      }),
    );
  });

  it('bloque le doublon (supplierId, normalizedName) en create', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
    prisma.supplierContact.findFirst.mockResolvedValue({ id: 'c-existing' });

    await expect(
      service.create('client-1', 'sup-1', { fullName: 'Jane Doe' }),
    ).rejects.toThrow(ConflictException);
  });

  it('désactive le principal sans réassignation auto', async () => {
    prisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
    prisma.supplierContact.findFirst.mockResolvedValue({
      id: 'c-1',
      clientId: 'client-1',
      supplierId: 'sup-1',
      firstName: null,
      lastName: null,
      fullName: 'Main Contact',
      normalizedName: 'main contact',
      role: null,
      email: null,
      emailNormalized: null,
      phone: null,
      mobile: null,
      isPrimary: true,
      isActive: true,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.supplierContact.update.mockResolvedValue({
      id: 'c-1',
      clientId: 'client-1',
      supplierId: 'sup-1',
      firstName: null,
      lastName: null,
      fullName: 'Main Contact',
      normalizedName: 'main contact',
      role: null,
      email: null,
      emailNormalized: null,
      phone: null,
      mobile: null,
      isPrimary: false,
      isActive: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.deactivate('client-1', 'sup-1', 'c-1');

    expect(result.isPrimary).toBe(false);
    expect(prisma.supplierContact.updateMany).not.toHaveBeenCalled();
  });
});
