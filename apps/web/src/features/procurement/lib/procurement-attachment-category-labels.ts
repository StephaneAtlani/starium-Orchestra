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

/** Pièces jointes sur une commande (devis, BC, etc.) — pas « Facture » (réservé à la fiche facture). */
const SELECT_ORDER_PO: ProcurementAttachmentCategory[] = [
  'QUOTE_PDF',
  'ORDER_CONFIRMATION',
  'AMENDMENT',
  'CORRESPONDENCE',
  'OTHER',
];

/** Pièces jointes sur une facture : pas de devis / bon de commande (réservés aux commandes). */
const SELECT_ORDER_INVOICE: ProcurementAttachmentCategory[] = [
  'INVOICE',
  'CORRESPONDENCE',
  'AMENDMENT',
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
  const order = parent === 'purchase-order' ? SELECT_ORDER_PO : SELECT_ORDER_INVOICE;
  return order.map((value) => ({
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

/** Types utiles à la création d’une facture (hors fiche). */
export const invoiceCreationDocumentTypeOptions: {
  value: ProcurementAttachmentCategory;
  label: string;
}[] = SELECT_ORDER_INVOICE.map((value) => ({
  value,
  label: procurementAttachmentCategoryLabel(value, 'invoice'),
}));
