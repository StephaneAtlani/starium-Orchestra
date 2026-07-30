import { BadRequestException } from '@nestjs/common';
import { FinancialEventType, FinancialSourceType, Prisma } from '@prisma/client';
import { InvoicesService } from './invoices.service';

function decimal(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: any;
  let events: any;
  let auditLogs: any;
  let suppliers: any;

  function invoiceRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'inv-1',
      clientId: 'c1',
      supplierId: 'sup-1',
      supplier: { id: 'sup-1', name: 'Microsoft' },
      budgetLineId: 'bl-1',
      purchaseOrderId: 'po-1',
      invoiceNumber: 'INV-1',
      label: 'Invoice',
      amountHt: decimal('100'),
      taxRate: decimal('20'),
      taxAmount: null,
      amountTtc: null,
      invoiceDate: new Date('2026-03-01T00:00:00.000Z'),
      status: 'VALIDATED',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /** Engagement ouvert de la commande et montant déjà facturé hors facture courante. */
  function mockCommitmentState(options: {
    poCommitment?: string | null;
    alreadyInvoiced?: string | null;
    unwoundByInvoice?: string | null;
  }) {
    prisma.financialEvent.aggregate.mockImplementation(async (args: any) => {
      if (args.where.sourceType === FinancialSourceType.PURCHASE_ORDER) {
        return {
          _sum: {
            amountHt:
              options.poCommitment == null ? null : decimal(options.poCommitment),
          },
        };
      }
      return {
        _sum: {
          amountHt:
            options.unwoundByInvoice == null
              ? null
              : decimal(options.unwoundByInvoice),
        },
      };
    });
    prisma.invoice.aggregate.mockResolvedValue({
      _sum: {
        amountHt:
          options.alreadyInvoiced == null ? null : decimal(options.alreadyInvoiced),
      },
    });
  }

  function unwindCalls() {
    return events.create.mock.calls.filter(
      ([, payload]: any[]) =>
        payload.eventType === FinancialEventType.COMMITMENT_REGISTERED,
    );
  }

  beforeEach(() => {
    prisma = {
      supplier: { findFirst: jest.fn() },
      budgetLine: { findFirst: jest.fn() },
      purchaseOrder: { findFirst: jest.fn() },
      financialEvent: { aggregate: jest.fn() },
      invoice: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
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
      reference: 'PO-2026-001',
    });
    prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
    prisma.invoice.create.mockResolvedValue(invoiceRow());
    mockCommitmentState({ poCommitment: '100', alreadyInvoiced: null });

    await service.create('c1', {
      supplierId: 'sup-1',
      purchaseOrderId: 'po-1',
      invoiceNumber: 'INV-1',
      label: 'Invoice',
      amountHt: '100',
      taxRate: '20',
      invoiceDate: new Date(),
    });

    expect(events.create).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        eventType: FinancialEventType.CONSUMPTION_REGISTERED,
        amountHt: '100.00',
      }),
      undefined,
    );
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
      reference: 'PO-2026-001',
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
    prisma.invoice.create.mockResolvedValue(
      invoiceRow({
        supplierId: 'sup-qc',
        supplier: { id: 'sup-qc', name: 'Quick Supplier' },
        purchaseOrderId: null,
        taxRate: null,
      }),
    );

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
    prisma.invoice.findFirst.mockResolvedValue(
      invoiceRow({ purchaseOrderId: null, taxRate: null, status: 'CANCELLED' }),
    );

    const result = await service.cancel('c1', 'inv-1');
    expect(result.status).toBe('CANCELLED');
    expect(events.create).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  describe('dénouement de l’engagement de commande', () => {
    beforeEach(() => {
      prisma.supplier.findFirst.mockResolvedValue({
        id: 'sup-1',
        name: 'Microsoft',
        status: 'ACTIVE',
      });
      prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
    });

    async function createInvoice(amountHt: string) {
      prisma.invoice.create.mockResolvedValue(invoiceRow({ amountHt: decimal(amountHt) }));
      return service.create('c1', {
        supplierId: 'sup-1',
        purchaseOrderId: 'po-1',
        invoiceNumber: 'INV-1',
        label: 'Invoice',
        amountHt,
        taxRate: '20',
        invoiceDate: new Date(),
      });
    }

    it('ne dénoue rien sur une facture sans commande', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(null);
      prisma.invoice.create.mockResolvedValue(
        invoiceRow({ purchaseOrderId: null }),
      );

      await service.create('c1', {
        supplierId: 'sup-1',
        invoiceNumber: 'INV-1',
        label: 'Invoice',
        amountHt: '100',
        taxRate: '20',
        invoiceDate: new Date(),
      });

      expect(unwindCalls()).toHaveLength(0);
      expect(prisma.financialEvent.aggregate).not.toHaveBeenCalled();
    });

    it('dénoue le montant facturé sur une facture partielle', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        supplierId: 'sup-1',
        budgetLineId: 'bl-1',
        reference: 'PO-2026-001',
      });
      mockCommitmentState({ poCommitment: '100', alreadyInvoiced: null });

      await createInvoice('40');

      expect(unwindCalls()).toHaveLength(1);
      expect(unwindCalls()[0][1]).toEqual(
        expect.objectContaining({
          eventType: FinancialEventType.COMMITMENT_REGISTERED,
          sourceType: FinancialSourceType.INVOICE,
          sourceId: 'inv-1',
          amountHt: '-40.00',
          label: 'Dénouement engagement commande PO-2026-001',
        }),
      );
    });

    it('plafonne le dénouement à l’engagement encore ouvert', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        supplierId: 'sup-1',
        budgetLineId: 'bl-1',
        reference: 'PO-2026-001',
      });
      mockCommitmentState({ poCommitment: '100', alreadyInvoiced: '80' });

      await createInvoice('50');

      expect(unwindCalls()[0][1]).toEqual(
        expect.objectContaining({ amountHt: '-20.00' }),
      );
    });

    it('ne dénoue rien quand l’engagement est déjà entièrement facturé', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        supplierId: 'sup-1',
        budgetLineId: 'bl-1',
        reference: 'PO-2026-001',
      });
      mockCommitmentState({ poCommitment: '100', alreadyInvoiced: '100' });

      await createInvoice('30');

      expect(unwindCalls()).toHaveLength(0);
    });

    it('ne dénoue rien quand la commande a été annulée (engagement net nul)', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        supplierId: 'sup-1',
        budgetLineId: 'bl-1',
        reference: 'PO-2026-001',
      });
      mockCommitmentState({ poCommitment: '0', alreadyInvoiced: null });

      await createInvoice('40');

      expect(unwindCalls()).toHaveLength(0);
    });

    it('scope les agrégats sur le client actif et la ligne budgétaire', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        supplierId: 'sup-1',
        budgetLineId: 'bl-1',
        reference: 'PO-2026-001',
      });
      mockCommitmentState({ poCommitment: '100', alreadyInvoiced: null });

      await createInvoice('40');

      expect(prisma.financialEvent.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'c1',
            budgetLineId: 'bl-1',
            sourceId: 'po-1',
          }),
        }),
      );
      expect(prisma.invoice.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'c1',
            purchaseOrderId: 'po-1',
            status: { not: 'CANCELLED' },
            id: { not: 'inv-1' },
          }),
        }),
      );
    });

    it('rétablit l’engagement à l’annulation de la facture', async () => {
      prisma.invoice.findFirst.mockResolvedValue(invoiceRow());
      prisma.invoice.update.mockResolvedValue(invoiceRow({ status: 'CANCELLED' }));
      prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
      mockCommitmentState({ unwoundByInvoice: '-40' });

      await service.cancel('c1', 'inv-1');

      expect(events.create).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          eventType: FinancialEventType.CONSUMPTION_REGISTERED,
          amountHt: '-100.00',
        }),
        undefined,
      );
      expect(unwindCalls()).toHaveLength(1);
      expect(unwindCalls()[0][1]).toEqual(
        expect.objectContaining({
          eventType: FinancialEventType.COMMITMENT_REGISTERED,
          amountHt: '40.00',
          label: 'Rétablissement engagement — annulation INV-1',
        }),
      );
    });

    it('ne rétablit aucun engagement si la facture n’en avait dénoué aucun', async () => {
      prisma.invoice.findFirst.mockResolvedValue(invoiceRow({ purchaseOrderId: null }));
      prisma.invoice.update.mockResolvedValue(
        invoiceRow({ purchaseOrderId: null, status: 'CANCELLED' }),
      );
      prisma.budgetLine.findFirst.mockResolvedValue({ id: 'bl-1', currency: 'EUR' });
      mockCommitmentState({ unwoundByInvoice: null });

      await service.cancel('c1', 'inv-1');

      expect(unwindCalls()).toHaveLength(0);
    });
  });
});
