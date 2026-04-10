import type { SupplierOption } from './supplier.types';

export interface Invoice {
  id: string;
  clientId: string;
  supplierId: string;
  supplier: SupplierOption;
  budgetLineId: string | null;
  purchaseOrderId: string | null;
  invoiceNumber: string;
  label: string;
  amountHt: number;
  taxRate: number | null;
  taxAmount: number | null;
  amountTtc: number | null;
  invoiceDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoicePayload {
  supplierId?: string;
  supplierName?: string;
  budgetLineId?: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  label: string;
  amountHt: string;
  taxRate?: string;
  invoiceDate: string;
}

/** Aligné sur PATCH API — métadonnées uniquement (montants non modifiables via ce flux). */
export interface UpdateInvoicePayload {
  label?: string;
  invoiceNumber?: string;
}

