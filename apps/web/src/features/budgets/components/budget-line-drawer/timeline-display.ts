'use client';

/**
 * Présentation timeline (libellés FR, statuts procurement, montants signés).
 */

import { formatAmount } from '../../lib/budget-formatters';
import { formatFinancialEventType } from '../../lib/financial-event-labels';

const PROCUREMENT_STATUS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  ACTIVE: 'Active',
  APPROVED: 'Approuvée',
  SENT: 'Envoyée',
  RECEIVED: 'Réceptionnée',
  PAID: 'Payée',
  CANCELLED: 'Annulée',
  CLOSED: 'Clôturée',
};

export function formatProcurementStatus(status: string | null | undefined): string {
  if (!status) return '';
  return PROCUREMENT_STATUS[status] ?? status;
}

export function formatTimelineSignedAmount(amount: number, currency: string): string {
  const cur = currency?.trim() || undefined;
  const abs = Math.abs(amount);
  const formatted = formatAmount(abs, cur);
  if (amount > 0) return `+ ${formatted}`;
  if (amount < 0) return `− ${formatted}`;
  return formatted;
}

export function formatTimelineEventStatus(
  type: 'event' | 'allocation' | 'purchase_order' | 'invoice',
  rawStatus: string | undefined,
): string {
  if (!rawStatus) return '';
  if (type === 'event') return formatFinancialEventType(rawStatus);
  if (type === 'allocation') return rawStatus;
  return formatProcurementStatus(rawStatus);
}
