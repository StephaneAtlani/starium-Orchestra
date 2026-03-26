import { ConflictException } from '@nestjs/common';
import { SupplierContactsService } from './supplier-contacts.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

describe('SupplierContactsService', () => {
  let service: SupplierContactsService;
  let prisma: PrismaService;
  let auditLogs: AuditLogsService;

  type SupplierMock = {
    findFirst: jest.Mock;
  };

  type SupplierContactMock = {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };

  let supplierMock: SupplierMock;
  let supplierContactMock: SupplierContactMock;

  beforeEach(() => {
    supplierMock = {
      findFirst: jest.fn(),
    };

    supplierContactMock = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };

    const transactionMock = jest.fn(
      async (callback: (tx: { supplierContact: SupplierContactMock }) => Promise<unknown>) =>
        callback({
          supplierContact: supplierContactMock,
        }),
    );

    prisma = {
      supplier: supplierMock,
      supplierContact: supplierContactMock,
      $transaction: transactionMock,
    } as unknown as PrismaService;

    auditLogs = {
      create: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditLogsService;

    service = new SupplierContactsService(prisma, auditLogs);
  });

  it('recalcule fullName depuis firstName/lastName au create', async () => {
    supplierMock.findFirst.mockResolvedValue({ id: 'sup-1' });
    supplierContactMock.findFirst.mockResolvedValue(null);
    supplierContactMock.create.mockResolvedValue({
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

    expect(supplierContactMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: 'Ada Lovelace',
          normalizedName: 'ada lovelace',
        }),
      }),
    );
  });

  it('recalcule normalizedName depuis le fullName persistant en update', async () => {
    supplierMock.findFirst.mockResolvedValue({ id: 'sup-1' });
    supplierContactMock.findFirst
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
    supplierContactMock.update.mockResolvedValue({
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
    expect(supplierContactMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: 'Nouveau Contact',
          normalizedName: 'nouveau contact',
        }),
      }),
    );
  });

  it('bloque le doublon (supplierId, normalizedName) en create', async () => {
    supplierMock.findFirst.mockResolvedValue({ id: 'sup-1' });
    supplierContactMock.findFirst.mockResolvedValue({ id: 'c-existing' });

    await expect(
      service.create('client-1', 'sup-1', { fullName: 'Jane Doe' }),
    ).rejects.toThrow(ConflictException);
  });

  it('désactive le principal sans réassignation auto', async () => {
    supplierMock.findFirst.mockResolvedValue({ id: 'sup-1' });
    supplierContactMock.findFirst.mockResolvedValue({
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
    supplierContactMock.update.mockResolvedValue({
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
    expect(supplierContactMock.updateMany).not.toHaveBeenCalled();
  });

  it('listAllForClient filtre par clientId et retourne supplierName', async () => {
    supplierContactMock.findMany.mockResolvedValue([
      {
        id: 'c-1',
        clientId: 'client-1',
        supplierId: 'sup-1',
        firstName: null,
        lastName: null,
        fullName: 'Jane Doe',
        normalizedName: 'jane doe',
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
        supplier: { name: 'Acme SAS' },
      },
    ]);
    supplierContactMock.count.mockResolvedValue(1);

    const result = await service.listAllForClient('client-1', {});

    expect(supplierContactMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-1', isActive: true }),
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].supplierName).toBe('Acme SAS');
    expect(result.items[0].fullName).toBe('Jane Doe');
  });

  it('update avec supplierId différent rattache le contact au nouveau fournisseur', async () => {
    supplierMock.findFirst
      .mockResolvedValueOnce({ id: 'sup-old' })
      .mockResolvedValueOnce({ id: 'sup-new' });
    supplierContactMock.findFirst
      .mockResolvedValueOnce({
        id: 'c-1',
        clientId: 'client-1',
        supplierId: 'sup-old',
        firstName: null,
        lastName: null,
        fullName: 'Jane Doe',
        normalizedName: 'jane doe',
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
      })
      .mockResolvedValueOnce(null); // ensureNoNameConflict sur nouveau fournisseur
    supplierContactMock.update.mockResolvedValue({
      id: 'c-1',
      clientId: 'client-1',
      supplierId: 'sup-new',
      firstName: null,
      lastName: null,
      fullName: 'Jane Doe',
      normalizedName: 'jane doe',
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

    await service.update('client-1', 'sup-old', 'c-1', { supplierId: 'sup-new' });

    expect(supplierContactMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ supplierId: 'sup-new' }),
      }),
    );
  });
});
