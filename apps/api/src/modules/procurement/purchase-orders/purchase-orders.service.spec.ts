import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let prisma: any;
  let events: any;
  let auditLogs: any;
  let suppliers: any;

  beforeEach(() => {
    prisma = {
      supplier: { findFirst: jest.fn() },
      budgetLine: { findFirst: jest.fn() },
      purchaseOrder: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    events = { create: jest.fn().mockResolvedValue(undefined) };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    suppliers = { quickCreate: jest.fn() };
    service = new PurchaseOrdersService(prisma, events, auditLogs, suppliers);
  });

  it('create avec budgetLineId cree event COMMITMENT_REGISTERED', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      name: 'Microsoft',
      status: 'ACTIVE',
    });
    prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
    prisma.purchaseOrder.create.mockResolvedValue({
      id: 'po-1',
      clientId: 'c1',
      supplierId: 'sup-1',
      supplier: { id: 'sup-1', name: 'Microsoft' },
      budgetLineId: 'bl-1',
      reference: 'PO-1',
      label: 'Order',
      amountHt: { toFixed: () => '100.00' },
      taxRate: { toFixed: () => '20.00' },
      taxAmount: null,
      amountTtc: null,
      orderDate: new Date(),
      status: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create('c1', {
      supplierId: 'sup-1',
      budgetLineId: 'bl-1',
      reference: 'PO-1',
      label: 'Order',
      amountHt: '100',
      taxRate: '20',
      orderDate: new Date(),
    });
    expect(events.create).toHaveBeenCalled();
  });

  it('create sans reference genere une reference AUTO- unique', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      name: 'Microsoft',
      status: 'ACTIVE',
    });
    prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
    prisma.purchaseOrder.create.mockImplementation(async ({ data }: any) => ({
      id: 'po-auto',
      clientId: 'c1',
      supplierId: 'sup-1',
      supplier: { id: 'sup-1', name: 'Microsoft' },
      budgetLineId: 'bl-1',
      reference: data.reference,
      label: data.label,
      amountHt: { toFixed: () => '50.00' },
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      orderDate: data.orderDate,
      status: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.create('c1', {
      supplierId: 'sup-1',
      budgetLineId: 'bl-1',
      label: 'Sans ref',
      amountHt: '50',
      orderDate: new Date(),
    });

    expect(prisma.purchaseOrder.create).toHaveBeenCalled();
    const call = prisma.purchaseOrder.create.mock.calls[0][0];
    expect(call.data.reference).toMatch(/^AUTO-[0-9a-f-]{36}$/i);
    expect(result.reference).toMatch(/^AUTO-/);
  });

  it('create avec supplierName passe par SuppliersService.quickCreate', async () => {
    suppliers.quickCreate.mockResolvedValue({ id: 'sup-qc', name: 'Quick Supplier' });
    prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
    prisma.purchaseOrder.create.mockResolvedValue({
      id: 'po-1',
      clientId: 'c1',
      supplierId: 'sup-qc',
      supplier: { id: 'sup-qc', name: 'Quick Supplier' },
      budgetLineId: 'bl-1',
      reference: 'PO-1',
      label: 'Order',
      amountHt: { toFixed: () => '100.00' },
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      orderDate: new Date(),
      status: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create('c1', {
      supplierName: 'Quick Supplier',
      budgetLineId: 'bl-1',
      reference: 'PO-1',
      label: 'Order',
      amountHt: '100',
      orderDate: new Date(),
    });

    expect(suppliers.quickCreate).toHaveBeenCalledWith(
      'c1',
      { name: 'Quick Supplier' },
      undefined,
    );
  });

  it('update refuse metadonnees interdites', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: 'po-1',
      clientId: 'c1',
      supplierId: 'sup-1',
      supplier: { id: 'sup-1', name: 'Microsoft' },
      budgetLineId: 'bl-1',
      reference: 'PO-1',
      label: 'Order',
      amountHt: 100,
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      orderDate: new Date(),
      status: 'APPROVED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.update('c1', 'po-1', { amountHt: '999' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('cancel idempotent sans side effects si deja CANCELLED', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: 'po-1',
      clientId: 'c1',
      supplierId: 'sup-1',
      supplier: { id: 'sup-1', name: 'Microsoft' },
      budgetLineId: 'bl-1',
      reference: 'PO-1',
      label: 'Order',
      amountHt: { neg: () => ({ toFixed: () => '-100.00' }) },
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      orderDate: new Date(),
      status: 'CANCELLED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.cancel('c1', 'po-1');
    expect(result.status).toBe('CANCELLED');
    expect(events.create).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});

