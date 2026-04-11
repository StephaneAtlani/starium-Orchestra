import type { PurchaseOrder } from '../types/purchase-order.types';

/** Libellé pour selects / listes : évite d’afficher seul une référence technique `AUTO-…`. */
export function formatPurchaseOrderOptionLabel(po: PurchaseOrder): string {
  const ref = po.reference?.trim() ?? '';
  const label = po.label?.trim() ?? '';
  const technicalRef = /^AUTO-/i.test(ref);
  const humanRef = ref && !technicalRef ? ref : '';
  if (humanRef && label) return `${humanRef} · ${label}`;
  if (label) return label;
  if (humanRef) return humanRef;
  const supplier = po.supplier?.name?.trim();
  return supplier ? `Commande · ${supplier}` : 'Commande';
}
