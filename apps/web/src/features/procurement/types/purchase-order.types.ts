import type { SupplierOption } from './supplier.types';

export interface PurchaseOrder {
  id: string;
  clientId: string;
  supplierId: string;
  supplier: SupplierOption;
  budgetLineId: string | null;
  reference: string;
  label: string;
  amountHt: number;
  taxRate: number | null;
  taxAmount: number | null;
  amountTtc: number | null;
  orderDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderPayload {
  supplierId?: string;
  supplierName?: string;
  budgetLineId?: string;
  reference: string;
  label: string;
  amountHt: string;
  taxRate?: string;
  orderDate: string;
}

