import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: any;
  let events: any;
  let auditLogs: any;
  let suppliers: any;

  beforeEach(() => {
    prisma = {
      supplier: { findFirst: jest.fn() },
      budgetLine: { findFirst: jest.fn() },
      purchaseOrder: { findFirst: jest.fn() },
      invoice: {
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
    service = new InvoicesService(prisma, events, auditLogs, suppliers);
  });

  it('create derive budgetLine depuis purchaseOrder', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      name: 'Microsoft',
      status: 'ACTIVE',
    });
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: 'po-1',
      supplierId: 'sup-1',
      budgetLineId: 'bl-1',
    });
    prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
    prisma.invoice.create.mockResolvedValue({
      id: 'inv-1',
      clientId: 'c1',
      supplierId: 'sup-1',
      supplier: { id: 'sup-1', name: 'Microsoft' },
      budgetLineId: 'bl-1',
      purchaseOrderId: 'po-1',
      invoiceNumber: 'INV-1',
      label: 'Invoice',
      amountHt: { toFixed: () => '100.00' },
      taxRate: { toFixed: () => '20.00' },
      taxAmount: null,
      amountTtc: null,
      invoiceDate: new Date(),
      status: 'VALIDATED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create('c1', {
      supplierId: 'sup-1',
      purchaseOrderId: 'po-1',
      invoiceNumber: 'INV-1',
      label: 'Invoice',
      amountHt: '100',
      taxRate: '20',
      invoiceDate: new Date(),
    });

    expect(events.create).toHaveBeenCalled();
  });

  it('refuse si purchaseOrder supplier mismatch', async () => {
    prisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1',
      name: 'Microsoft',
      status: 'ACTIVE',
    });
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: 'po-1',
      supplierId: 'sup-2',
      budgetLineId: 'bl-1',
    });

    await expect(
      service.create('c1', {
        supplierId: 'sup-1',
        purchaseOrderId: 'po-1',
        invoiceNumber: 'INV-1',
        label: 'Invoice',
        amountHt: '100',
        taxRate: '20',
        invoiceDate: new Date(),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('create avec supplierName passe par SuppliersService.quickCreate', async () => {
    suppliers.quickCreate.mockResolvedValue({
      id: 'sup-qc',
      name: 'Quick Supplier',
    });
    prisma.purchaseOrder.findFirst.mockResolvedValue(null);
    prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
    prisma.invoice.create.mockResolvedValue({
      id: 'inv-1',
      clientId: 'c1',
      supplierId: 'sup-qc',
      supplier: { id: 'sup-qc', name: 'Quick Supplier' },
      budgetLineId: 'bl-1',
      purchaseOrderId: null,
      invoiceNumber: 'INV-1',
      label: 'Invoice',
      amountHt: { toFixed: () => '100.00' },
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      invoiceDate: new Date(),
      status: 'VALIDATED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create('c1', {
      supplierName: 'Quick Supplier',
      invoiceNumber: 'INV-1',
      label: 'Invoice',
      amountHt: '100',
      invoiceDate: new Date(),
    });

    expect(suppliers.quickCreate).toHaveBeenCalledWith(
      'c1',
      { name: 'Quick Supplier' },
      undefined,
    );
  });

  it('cancel idempotent sans side effects si deja CANCELLED', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-1',
      clientId: 'c1',
      supplierId: 'sup-1',
      supplier: { id: 'sup-1', name: 'Microsoft' },
      budgetLineId: 'bl-1',
      purchaseOrderId: null,
      invoiceNumber: 'INV-1',
      label: 'Invoice',
      amountHt: { neg: () => ({ toFixed: () => '-100.00' }) },
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      invoiceDate: new Date(),
      status: 'CANCELLED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.cancel('c1', 'inv-1');
    expect(result.status).toBe('CANCELLED');
    expect(events.create).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});

