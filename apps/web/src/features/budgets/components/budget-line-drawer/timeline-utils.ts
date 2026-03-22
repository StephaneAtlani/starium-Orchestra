/**
 * RFC-FE-026 — normalisation timeline (frontend only, pas de KPI métier).
 */

import type { FinancialAllocationForLine, FinancialEventForLine } from '../../api/budget-line-financial.api';
import type { Invoice } from '../../../procurement/types/invoice.types';
import type { PurchaseOrder } from '../../../procurement/types/purchase-order.types';

export type TimelineEventType = 'event' | 'allocation' | 'purchase_order' | 'invoice';

export type TimelineEventSourceType =
  | 'financial_event'
  | 'allocation'
  | 'purchase_order'
  | 'invoice';

export type TimelineEvent = {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  direction: 'increase' | 'decrease' | 'neutral';
  status?: string;
  referenceId?: string;
  sourceType: TimelineEventSourceType;
  sourceId: string;
};

export type TimelineFilterType = 'all' | TimelineEventType;

export type TimelineFilterPeriod = 'all' | '30d' | '90d' | '365d';

export type TimelineFiltersState = {
  type: TimelineFilterType;
  period: TimelineFilterPeriod;
};

const MS_DAY = 24 * 60 * 60 * 1000;

export function directionFromSignedAmount(amount: number): 'increase' | 'decrease' | 'neutral' {
  if (amount > 0) return 'increase';
  if (amount < 0) return 'decrease';
  return 'neutral';
}

export function getTimelineSortDate(e: TimelineEvent): number {
  const t = Date.parse(e.date);
  return Number.isFinite(t) ? t : 0;
}

export function buildDedupeKey(e: TimelineEvent): string {
  return `${e.sourceType}|${e.sourceId}|${e.date}|${e.amount}|${e.type}`;
}

export function mapFinancialEventToTimelineEvent(e: FinancialEventForLine): TimelineEvent {
  const signed = Number(e.amountHt ?? e.amount);
  const direction = directionFromSignedAmount(signed);
  const date = e.eventDate;
  const ref = e.sourceId ?? undefined;
  return {
    id: `financial_event-${e.id}`,
    date,
    type: 'event',
    title: e.label || 'Événement financier',
    description: e.description ?? undefined,
    amount: signed,
    currency: e.currency,
    direction,
    status: e.eventType,
    referenceId: ref,
    sourceType: 'financial_event',
    sourceId: e.id,
  };
}

export function mapAllocationToTimelineEvent(a: FinancialAllocationForLine): TimelineEvent {
  const signed = Number(a.allocatedAmount);
  const direction = directionFromSignedAmount(signed);
  return {
    id: `allocation-${a.id}`,
    date: a.effectiveDate,
    type: 'allocation',
    title: `Allocation · ${a.allocationType}`,
    description: a.notes ?? undefined,
    amount: signed,
    currency: a.currency,
    direction,
    status: a.allocationType,
    referenceId: a.sourceId ?? undefined,
    sourceType: 'allocation',
    sourceId: a.id,
  };
}

/** Réf. AUTO-xxxxxxxx trop longue → AUTO-…abc123 */
export function shortenReference(ref: string): string {
  const t = ref.trim();
  if (t.startsWith('AUTO-') && t.length > 18) {
    return `AUTO-…${t.slice(-6)}`;
  }
  return t;
}

function isWeakLabel(label: string | undefined): boolean {
  if (!label?.trim()) return true;
  const s = label.trim();
  if (s.length < 2) return true;
  if (/^(.)\1{2,}$/i.test(s)) return true;
  return false;
}

function purchaseOrderTitle(po: PurchaseOrder): string {
  const ref = shortenReference(po.reference);
  const label = po.label?.trim();
  if (label && !isWeakLabel(label)) return label;
  return ref || 'Commande';
}

function purchaseOrderSubtitle(po: PurchaseOrder): string | undefined {
  const parts: string[] = [];
  if (po.supplier?.name) parts.push(po.supplier.name);
  const ref = shortenReference(po.reference);
  const label = po.label?.trim();
  if (ref && label && !isWeakLabel(label)) {
    parts.push(`Réf. ${ref}`);
  } else if (ref && !label) {
    parts.push(`Réf. ${ref}`);
  }
  return parts.length ? parts.join(' · ') : undefined;
}

export function mapPurchaseOrderToTimelineEvent(
  po: PurchaseOrder,
  lineCurrency = '',
): TimelineEvent {
  const signed = -Math.abs(Number(po.amountHt));
  return {
    id: `purchase_order-${po.id}`,
    date: po.orderDate,
    type: 'purchase_order',
    title: purchaseOrderTitle(po),
    description: purchaseOrderSubtitle(po),
    amount: signed,
    currency: lineCurrency,
    direction: 'decrease',
    status: po.status,
    referenceId: po.id,
    sourceType: 'purchase_order',
    sourceId: po.id,
  };
}

function invoiceTitle(inv: Invoice): string {
  const label = inv.label?.trim();
  const num = inv.invoiceNumber?.trim();
  if (label && !isWeakLabel(label)) return label;
  if (num) return `Facture ${num}`;
  return 'Facture';
}

function invoiceSubtitle(inv: Invoice): string | undefined {
  const parts: string[] = [];
  if (inv.supplier?.name) parts.push(inv.supplier.name);
  if (inv.invoiceNumber?.trim()) parts.push(`N° ${inv.invoiceNumber.trim()}`);
  return parts.length ? parts.join(' · ') : undefined;
}

export function mapInvoiceToTimelineEvent(inv: Invoice, lineCurrency = ''): TimelineEvent {
  const signed = -Math.abs(Number(inv.amountHt));
  return {
    id: `invoice-${inv.id}`,
    date: inv.invoiceDate,
    type: 'invoice',
    title: invoiceTitle(inv),
    description: invoiceSubtitle(inv),
    amount: signed,
    currency: lineCurrency,
    direction: 'decrease',
    status: inv.status,
    referenceId: inv.id,
    sourceType: 'invoice',
    sourceId: inv.id,
  };
}

export function dedupeTimelineEvents(
  events: TimelineEvent[],
  ctx?: { purchaseOrderIds?: Set<string>; invoiceIds?: Set<string> },
): TimelineEvent[] {
  let list = events;

  if (ctx?.purchaseOrderIds?.size) {
    const ids = ctx.purchaseOrderIds;
    list = list.filter(
      (e) => !(e.type === 'event' && e.referenceId && ids.has(e.referenceId)),
    );
  }
  if (ctx?.invoiceIds?.size) {
    const ids = ctx.invoiceIds;
    list = list.filter(
      (e) => !(e.type === 'event' && e.referenceId && ids.has(e.referenceId)),
    );
  }

  const seen = new Set<string>();
  const out: TimelineEvent[] = [];
  for (const e of list) {
    const k = buildDedupeKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

export function sortTimelineEventsDesc(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => getTimelineSortDate(b) - getTimelineSortDate(a));
}

function periodStartMs(period: TimelineFilterPeriod): number | null {
  if (period === 'all') return null;
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  return Date.now() - days * MS_DAY;
}

export function filterTimelineEvents(
  events: TimelineEvent[],
  filters: TimelineFiltersState,
): TimelineEvent[] {
  let list = events;

  if (filters.type !== 'all') {
    list = list.filter((e) => e.type === filters.type);
  }

  const start = periodStartMs(filters.period);
  if (start !== null) {
    list = list.filter((e) => getTimelineSortDate(e) >= start);
  }

  return list;
}
