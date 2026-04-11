import type { ProcurementAttachmentCategory } from '../types/procurement-attachment.types';

export type ProcurementAttachmentParentKind = 'purchase-order' | 'invoice';

const PO: Record<ProcurementAttachmentCategory, string> = {
  QUOTE_PDF: 'Devis',
  ORDER_CONFIRMATION: 'Bon de commande',
  INVOICE: 'Facture',
  AMENDMENT: 'Avenant',
  CORRESPONDENCE: 'Correspondance',
  OTHER: 'Autre',
};

const INV: Record<ProcurementAttachmentCategory, string> = {
  QUOTE_PDF: 'Devis',
  ORDER_CONFIRMATION: 'Confirmation de commande',
  INVOICE: 'Facture',
  AMENDMENT: 'Avenant',
  CORRESPONDENCE: 'Correspondance',
  OTHER: 'Autre',
};

const SELECT_ORDER: ProcurementAttachmentCategory[] = [
  'QUOTE_PDF',
  'ORDER_CONFIRMATION',
  'INVOICE',
  'AMENDMENT',
  'CORRESPONDENCE',
  'OTHER',
];

export function procurementAttachmentCategoryLabel(
  category: ProcurementAttachmentCategory,
  parent: ProcurementAttachmentParentKind,
): string {
  const map = parent === 'purchase-order' ? PO : INV;
  return map[category] ?? category;
}

export function procurementAttachmentCategorySelectOptions(
  parent: ProcurementAttachmentParentKind,
): { value: ProcurementAttachmentCategory; label: string }[] {
  return SELECT_ORDER.map((value) => ({
    value,
    label: procurementAttachmentCategoryLabel(value, parent),
  }));
}

/** Types les plus utiles à la création d’une commande (hors fiche). */
export const purchaseOrderCreationDocumentTypeOptions: {
  value: ProcurementAttachmentCategory;
  label: string;
}[] = [
  { value: 'QUOTE_PDF', label: 'Devis' },
  { value: 'ORDER_CONFIRMATION', label: 'Bon de commande' },
  { value: 'OTHER', label: 'Autre' },
];
