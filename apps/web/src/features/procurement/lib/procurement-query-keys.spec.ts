import { describe, expect, it } from 'vitest';
import { procurementEntityKeys, procurementAttachmentKeys } from './procurement-query-keys';

describe('procurementEntityKeys', () => {
  it('scoper les clés par clientId et paramètres', () => {
    const c1 = 'client-a';
    const c2 = 'client-b';
    expect(procurementEntityKeys.purchaseOrdersList(c1, 'k1')).toContain(c1);
    expect(procurementEntityKeys.purchaseOrdersList(c1, 'k1')).toContain('purchase-orders');
    expect(procurementEntityKeys.purchaseOrdersList(c1, 'k1')).not.toEqual(
      procurementEntityKeys.purchaseOrdersList(c2, 'k1'),
    );
    expect(procurementEntityKeys.purchaseOrderDetail(c1, 'po-1')).toContain('po-1');
    expect(procurementEntityKeys.invoicesList(c1, 'k2')).toContain('invoices');
    expect(procurementEntityKeys.invoiceDetail(c1, 'inv-1')).toContain('inv-1');
  });

  it('préfixe procurement pour invalidation ciblée', () => {
    expect(procurementEntityKeys.purchaseOrderDetail('c', 'id')[0]).toBe('procurement');
    expect(procurementEntityKeys.invoiceDetail('c', 'id')[0]).toBe('procurement');
  });
});

describe('procurementAttachmentKeys', () => {
  it('sépare PO et facture dans la clé', () => {
    const kPo = procurementAttachmentKeys.purchaseOrder('c', 'p1');
    const kInv = procurementAttachmentKeys.invoice('c', 'i1');
    expect(kPo).toContain('purchase-order');
    expect(kInv).toContain('invoice');
    expect(kPo).not.toEqual(kInv);
  });
});
