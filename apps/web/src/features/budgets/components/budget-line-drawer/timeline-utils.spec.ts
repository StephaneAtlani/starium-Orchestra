import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinancialAllocationForLine, FinancialEventForLine } from '../../api/budget-line-financial.api';
import type { Invoice } from '../../../procurement/types/invoice.types';
import type { PurchaseOrder } from '../../../procurement/types/purchase-order.types';
import {
  dedupeTimelineEvents,
  filterTimelineEvents,
  mapAllocationToTimelineEvent,
  mapFinancialEventToTimelineEvent,
  mapInvoiceToTimelineEvent,
  mapPurchaseOrderToTimelineEvent,
  sortTimelineEventsDesc,
} from './timeline-utils';

const baseFe = (): FinancialEventForLine => ({
  id: 'fe1',
  eventType: 'COMMITMENT_REGISTERED',
  amount: 1000,
  amountHt: 1000,
  taxRate: null,
  taxAmount: null,
  amountTtc: null,
  currency: 'EUR',
  eventDate: '2026-01-15T00:00:00.000Z',
  label: 'Engagement',
  description: null,
  sourceType: 'MANUAL',
  sourceId: null,
});

describe('timeline-utils', () => {
  it('mapFinancialEventToTimelineEvent — signe et direction', () => {
    const e = mapFinancialEventToTimelineEvent({
      ...baseFe(),
      amountHt: -500,
    });
    expect(e.type).toBe('event');
    expect(e.amount).toBe(-500);
    expect(e.direction).toBe('decrease');
    expect(e.sourceType).toBe('financial_event');
    expect(e.sourceId).toBe('fe1');
  });

  it('mapAllocationToTimelineEvent — montant signé', () => {
    const a: FinancialAllocationForLine = {
      id: 'al1',
      allocationType: 'REALLOCATED',
      allocatedAmount: 2500,
      currency: 'EUR',
      effectiveDate: '2026-02-01T00:00:00.000Z',
      sourceType: 'MANUAL',
      sourceId: null,
      notes: 'note',
    };
    const e = mapAllocationToTimelineEvent(a);
    expect(e.type).toBe('allocation');
    expect(e.amount).toBe(2500);
    expect(e.direction).toBe('increase');
  });

  it('mapPurchaseOrderToTimelineEvent — sortie', () => {
    const po: PurchaseOrder = {
      id: 'po1',
      clientId: 'c1',
      supplierId: 's1',
      supplier: { id: 's1', name: 'Sup' },
      budgetLineId: 'bl1',
      reference: 'PO-1',
      label: 'Commande',
      amountHt: 3000,
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      orderDate: '2026-03-01T00:00:00.000Z',
      status: 'ACTIVE',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };
    const e = mapPurchaseOrderToTimelineEvent(po, 'EUR');
    expect(e.type).toBe('purchase_order');
    expect(e.amount).toBe(-3000);
    expect(e.direction).toBe('decrease');
  });

  it('mapInvoiceToTimelineEvent — sortie', () => {
    const inv: Invoice = {
      id: 'inv1',
      clientId: 'c1',
      supplierId: 's1',
      supplier: { id: 's1', name: 'Sup' },
      budgetLineId: 'bl1',
      purchaseOrderId: null,
      invoiceNumber: 'F-1',
      label: 'Facture',
      amountHt: 1200,
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      invoiceDate: '2026-03-10T00:00:00.000Z',
      status: 'PAID',
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:00.000Z',
    };
    const e = mapInvoiceToTimelineEvent(inv, 'EUR');
    expect(e.type).toBe('invoice');
    expect(e.amount).toBe(-1200);
    expect(e.direction).toBe('decrease');
  });

  it('sortTimelineEventsDesc — tri chrono descendant', () => {
    const a = mapFinancialEventToTimelineEvent({
      ...baseFe(),
      id: 'a',
      eventDate: '2026-01-01T00:00:00.000Z',
      label: 'A',
    });
    const b = mapFinancialEventToTimelineEvent({
      ...baseFe(),
      id: 'b',
      eventDate: '2026-03-01T00:00:00.000Z',
      label: 'B',
    });
    const sorted = sortTimelineEventsDesc([a, b]);
    expect(sorted[0].sourceId).toBe('b');
    expect(sorted[1].sourceId).toBe('a');
  });

  it('dedupeTimelineEvents — clé composite + filtre event / PO', () => {
    const fe: FinancialEventForLine = {
      ...baseFe(),
      id: 'ev-po',
      sourceType: 'PURCHASE_ORDER',
      sourceId: 'po-dup',
    };
    const po: PurchaseOrder = {
      id: 'po-dup',
      clientId: 'c',
      supplierId: 's',
      supplier: { id: 's', name: 'S' },
      budgetLineId: 'bl',
      reference: 'R',
      label: 'L',
      amountHt: 100,
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      orderDate: '2026-01-15T00:00:00.000Z',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
    };
    const merged = dedupeTimelineEvents(
      [mapFinancialEventToTimelineEvent(fe), mapPurchaseOrderToTimelineEvent(po, 'EUR')],
      { purchaseOrderIds: new Set(['po-dup']) },
    );
    expect(merged.some((x) => x.type === 'event' && x.referenceId === 'po-dup')).toBe(false);
    expect(merged.some((x) => x.type === 'purchase_order')).toBe(true);
  });

  it('dedupeTimelineEvents — doublon exact', () => {
    const e = mapFinancialEventToTimelineEvent(baseFe());
    const merged = dedupeTimelineEvents([e, { ...e }]);
    expect(merged).toHaveLength(1);
  });

  it('filterTimelineEvents — type', () => {
    const ev = mapFinancialEventToTimelineEvent(baseFe());
    const po: PurchaseOrder = {
      id: 'p1',
      clientId: 'c',
      supplierId: 's',
      supplier: { id: 's', name: 'S' },
      budgetLineId: 'bl',
      reference: 'R',
      label: 'L',
      amountHt: 1,
      taxRate: null,
      taxAmount: null,
      amountTtc: null,
      orderDate: '2026-01-01T00:00:00.000Z',
      status: 'A',
      createdAt: '',
      updatedAt: '',
    };
    const poEv = mapPurchaseOrderToTimelineEvent(po, 'EUR');
    const list = filterTimelineEvents([ev, poEv], { type: 'invoice', period: 'all' });
    expect(list).toHaveLength(0);
  });

  describe('filterTimelineEvents — période', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('30d exclut les événements trop anciens', () => {
      const recent = mapFinancialEventToTimelineEvent({
        ...baseFe(),
        id: 'r',
        eventDate: '2026-06-01T00:00:00.000Z',
      });
      const old = mapFinancialEventToTimelineEvent({
        ...baseFe(),
        id: 'o',
        eventDate: '2025-01-01T00:00:00.000Z',
      });
      const list = filterTimelineEvents([recent, old], { type: 'all', period: '30d' });
      expect(list.map((x) => x.sourceId)).toEqual(['r']);
    });
  });
});
