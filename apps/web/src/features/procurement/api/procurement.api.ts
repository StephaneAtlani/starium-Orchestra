import type { AuthFetch } from '../../budgets/api/budget-management.api';
import { parseApiFormError } from '../../budgets/api/budget-management.api';
import type {
  PaginatedResponse,
  Supplier,
  SupplierCategory,
  SupplierOption,
} from '../types/supplier.types';
import type { CreatePurchaseOrderPayload, PurchaseOrder } from '../types/purchase-order.types';
import type { CreateInvoicePayload, Invoice } from '../types/invoice.types';

const BASE_SUPPLIERS = '/api/suppliers';
const BASE_SUPPLIER_CATEGORIES = '/api/supplier-categories';
const BASE_ORDERS = '/api/purchase-orders';
const BASE_INVOICES = '/api/invoices';
const BASE_BUDGET_LINES = '/api/budget-lines';

function buildQueryString(
  params?: Record<string, string | number | boolean | undefined>,
) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function listSuppliers(
  authFetch: AuthFetch,
  params?: {
    search?: string;
    offset?: number;
    limit?: number;
    includeArchived?: boolean;
    supplierCategoryId?: string;
  },
): Promise<PaginatedResponse<Supplier>> {
  const qs = buildQueryString(params);
  const res = await authFetch(`${BASE_SUPPLIERS}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<Supplier>>;
}

export async function listSupplierCategories(
  authFetch: AuthFetch,
  params?: {
    search?: string;
    offset?: number;
    limit?: number;
    includeInactive?: boolean;
  },
): Promise<PaginatedResponse<SupplierCategory>> {
  const qs = buildQueryString(params);
  const res = await authFetch(`${BASE_SUPPLIER_CATEGORIES}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<SupplierCategory>>;
}

export async function createSupplierCategory(
  authFetch: AuthFetch,
  payload: { name: string },
): Promise<SupplierCategory> {
  const res = await authFetch(BASE_SUPPLIER_CATEGORIES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SupplierCategory>;
}

export async function updateSupplierCategory(
  authFetch: AuthFetch,
  supplierId: string,
  supplierCategoryId: string | null,
): Promise<Supplier> {
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierCategoryId }),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Supplier>;
}

export async function quickCreateSupplier(
  authFetch: AuthFetch,
  payload: { name: string },
): Promise<SupplierOption> {
  const res = await authFetch(`${BASE_SUPPLIERS}/quick-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  const supplier = (await res.json()) as Supplier;
  return { id: supplier.id, name: supplier.name };
}

export interface CreateSupplierPayload {
  name: string;
  code?: string;
  siret?: string;
  vatNumber?: string;
  externalId?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
}

export async function createSupplier(
  authFetch: AuthFetch,
  payload: CreateSupplierPayload,
): Promise<Supplier> {
  const res = await authFetch(BASE_SUPPLIERS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Supplier>;
}

export interface UpdateSupplierPayload {
  name?: string;
  code?: string;
  siret?: string;
  vatNumber?: string;
  externalId?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  supplierCategoryId?: string | null;
}

export async function updateSupplier(
  authFetch: AuthFetch,
  supplierId: string,
  payload: UpdateSupplierPayload,
): Promise<Supplier> {
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Supplier>;
}

export async function createPurchaseOrder(
  authFetch: AuthFetch,
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  const res = await authFetch(BASE_ORDERS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PurchaseOrder>;
}

export async function createInvoice(
  authFetch: AuthFetch,
  payload: CreateInvoicePayload,
): Promise<Invoice> {
  const res = await authFetch(BASE_INVOICES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Invoice>;
}

export async function listPurchaseOrdersByBudgetLine(
  authFetch: AuthFetch,
  budgetLineId: string,
  params?: {
    offset?: number;
    limit?: number;
    includeCancelled?: boolean;
  },
): Promise<PaginatedResponse<PurchaseOrder>> {
  const qs = buildQueryString(params);
  const res = await authFetch(
    `${BASE_BUDGET_LINES}/${budgetLineId}/purchase-orders${qs}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<PurchaseOrder>>;
}

export async function listInvoicesByBudgetLine(
  authFetch: AuthFetch,
  budgetLineId: string,
  params?: {
    offset?: number;
    limit?: number;
    includeCancelled?: boolean;
  },
): Promise<PaginatedResponse<Invoice>> {
  const qs = buildQueryString(params);
  const res = await authFetch(
    `${BASE_BUDGET_LINES}/${budgetLineId}/invoices${qs}`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<Invoice>>;
}

