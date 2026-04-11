import type { AuthFetch } from '../../budgets/api/budget-management.api';
import { parseApiFormError } from '../../budgets/api/budget-management.api';
import type {
  PaginatedResponse,
  Supplier,
  SupplierCategory,
  SupplierContact,
  SupplierOption,
  SuppliersDashboardStats,
} from '../types/supplier.types';
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrder,
  UpdatePurchaseOrderPayload,
} from '../types/purchase-order.types';
import type { CreateInvoicePayload, Invoice, UpdateInvoicePayload } from '../types/invoice.types';
import type {
  ProcurementAttachment,
  ProcurementAttachmentCategory,
} from '../types/procurement-attachment.types';

const BASE_SUPPLIERS = '/api/suppliers';
const BASE_SUPPLIER_CATEGORIES = '/api/supplier-categories';
const BASE_ORDERS = '/api/purchase-orders';
const BASE_INVOICES = '/api/invoices';
const BASE_BUDGET_LINES = '/api/budget-lines';
const BASE_SUPPLIER_CONTACTS = '/api/supplier-contacts';

export interface CreateSupplierContactPayload {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface UpdateSupplierContactPayload {
  /** Nouveau fournisseur (même client) — le PATCH reste sur l’ancien fournisseur dans l’URL. */
  supplierId?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
  notes?: string | null;
}

function filenameFromContentDisposition(cd: string | null): string | undefined {
  if (!cd) return undefined;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].replace(/"/g, '').trim());
    } catch {
      return utf8[1];
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(cd);
  if (plain?.[1]) return plain[1].replace(/"/g, '');
  return undefined;
}

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

export async function getSuppliersDashboard(
  authFetch: AuthFetch,
): Promise<SuppliersDashboardStats> {
  const res = await authFetch(`${BASE_SUPPLIERS}/dashboard`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SuppliersDashboardStats>;
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

export async function getSupplierById(
  authFetch: AuthFetch,
  supplierId: string,
): Promise<Supplier> {
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Supplier>;
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

export async function uploadSupplierLogo(
  authFetch: AuthFetch,
  supplierId: string,
  file: File,
): Promise<{ success: true; logoUrl: string }> {
  const body = new FormData();
  body.append('file', file);
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}/logo`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ success: true; logoUrl: string }>;
}

export async function deleteSupplierLogo(
  authFetch: AuthFetch,
  supplierId: string,
): Promise<{ success: true }> {
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}/logo`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ success: true }>;
}

export async function listSupplierContacts(
  authFetch: AuthFetch,
  supplierId: string,
  params?: {
    search?: string;
    offset?: number;
    limit?: number;
    includeInactive?: boolean;
  },
): Promise<PaginatedResponse<SupplierContact>> {
  const qs = buildQueryString(params);
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}/contacts${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<SupplierContact>>;
}

/** Tous les contacts fournisseurs du client actif (avec nom fournisseur). */
export async function listAllSupplierContacts(
  authFetch: AuthFetch,
  params?: {
    search?: string;
    offset?: number;
    limit?: number;
    includeInactive?: boolean;
  },
): Promise<PaginatedResponse<SupplierContact>> {
  const qs = buildQueryString(params);
  const res = await authFetch(`${BASE_SUPPLIER_CONTACTS}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<SupplierContact>>;
}

export async function createSupplierContact(
  authFetch: AuthFetch,
  supplierId: string,
  payload: CreateSupplierContactPayload,
): Promise<SupplierContact> {
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SupplierContact>;
}

export async function updateSupplierContact(
  authFetch: AuthFetch,
  supplierId: string,
  contactId: string,
  payload: UpdateSupplierContactPayload,
): Promise<SupplierContact> {
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}/contacts/${contactId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SupplierContact>;
}

export async function deactivateSupplierContact(
  authFetch: AuthFetch,
  supplierId: string,
  contactId: string,
): Promise<SupplierContact> {
  const res = await authFetch(
    `${BASE_SUPPLIERS}/${supplierId}/contacts/${contactId}/deactivate`,
    {
      method: 'POST',
    },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<SupplierContact>;
}

export async function uploadSupplierContactPhoto(
  authFetch: AuthFetch,
  supplierId: string,
  contactId: string,
  file: File,
): Promise<{ success: true; photoUrl: string }> {
  const body = new FormData();
  body.append('file', file);
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}/contacts/${contactId}/photo`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ success: true; photoUrl: string }>;
}

export async function deleteSupplierContactPhoto(
  authFetch: AuthFetch,
  supplierId: string,
  contactId: string,
): Promise<{ success: true }> {
  const res = await authFetch(`${BASE_SUPPLIERS}/${supplierId}/contacts/${contactId}/photo`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{ success: true }>;
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

export async function updateInvoice(
  authFetch: AuthFetch,
  invoiceId: string,
  payload: UpdateInvoicePayload,
): Promise<Invoice> {
  const res = await authFetch(`${BASE_INVOICES}/${invoiceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Invoice>;
}

export async function updatePurchaseOrder(
  authFetch: AuthFetch,
  purchaseOrderId: string,
  payload: UpdatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  const res = await authFetch(`${BASE_ORDERS}/${purchaseOrderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PurchaseOrder>;
}

export async function getPurchaseOrder(
  authFetch: AuthFetch,
  purchaseOrderId: string,
): Promise<PurchaseOrder> {
  const res = await authFetch(`${BASE_ORDERS}/${purchaseOrderId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PurchaseOrder>;
}

export async function listPurchaseOrders(
  authFetch: AuthFetch,
  params?: {
    offset?: number;
    limit?: number;
    search?: string;
    supplierId?: string;
    budgetLineId?: string;
    status?: string;
    includeCancelled?: boolean;
  },
): Promise<PaginatedResponse<PurchaseOrder>> {
  const qs = buildQueryString(params);
  const res = await authFetch(`${BASE_ORDERS}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<PurchaseOrder>>;
}

export async function cancelPurchaseOrder(
  authFetch: AuthFetch,
  purchaseOrderId: string,
): Promise<void> {
  const res = await authFetch(`${BASE_ORDERS}/${purchaseOrderId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
}

export async function getInvoice(authFetch: AuthFetch, invoiceId: string): Promise<Invoice> {
  const res = await authFetch(`${BASE_INVOICES}/${invoiceId}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<Invoice>;
}

export async function listInvoices(
  authFetch: AuthFetch,
  params?: {
    offset?: number;
    limit?: number;
    search?: string;
    supplierId?: string;
    budgetLineId?: string;
    purchaseOrderId?: string;
    status?: string;
    includeCancelled?: boolean;
  },
): Promise<PaginatedResponse<Invoice>> {
  const qs = buildQueryString(params);
  const res = await authFetch(`${BASE_INVOICES}${qs}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<PaginatedResponse<Invoice>>;
}

export async function cancelInvoice(authFetch: AuthFetch, invoiceId: string): Promise<void> {
  const res = await authFetch(`${BASE_INVOICES}/${invoiceId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await parseApiFormError(res);
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

export async function listPurchaseOrderAttachments(
  authFetch: AuthFetch,
  purchaseOrderId: string,
): Promise<ProcurementAttachment[]> {
  const res = await authFetch(`${BASE_ORDERS}/${purchaseOrderId}/attachments`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProcurementAttachment[]>;
}

export async function uploadPurchaseOrderAttachment(
  authFetch: AuthFetch,
  purchaseOrderId: string,
  file: File,
  fields: { name?: string; category?: ProcurementAttachmentCategory },
): Promise<ProcurementAttachment> {
  const body = new FormData();
  body.append('file', file);
  if (fields.name?.trim()) body.append('name', fields.name.trim());
  if (fields.category) body.append('category', fields.category);
  const res = await authFetch(`${BASE_ORDERS}/${purchaseOrderId}/attachments`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProcurementAttachment>;
}

export async function downloadPurchaseOrderAttachment(
  authFetch: AuthFetch,
  purchaseOrderId: string,
  attachmentId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await authFetch(
    `${BASE_ORDERS}/${purchaseOrderId}/attachments/${attachmentId}/download`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  const blob = await res.blob();
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
    'document';
  return { blob, filename };
}

export async function archivePurchaseOrderAttachment(
  authFetch: AuthFetch,
  purchaseOrderId: string,
  attachmentId: string,
): Promise<ProcurementAttachment> {
  const res = await authFetch(
    `${BASE_ORDERS}/${purchaseOrderId}/attachments/${attachmentId}/archive`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProcurementAttachment>;
}

export async function listInvoiceAttachments(
  authFetch: AuthFetch,
  invoiceId: string,
): Promise<ProcurementAttachment[]> {
  const res = await authFetch(`${BASE_INVOICES}/${invoiceId}/attachments`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProcurementAttachment[]>;
}

export async function uploadInvoiceAttachment(
  authFetch: AuthFetch,
  invoiceId: string,
  file: File,
  fields: { name?: string; category?: ProcurementAttachmentCategory },
): Promise<ProcurementAttachment> {
  const body = new FormData();
  body.append('file', file);
  if (fields.name?.trim()) body.append('name', fields.name.trim());
  if (fields.category) body.append('category', fields.category);
  const res = await authFetch(`${BASE_INVOICES}/${invoiceId}/attachments`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProcurementAttachment>;
}

export async function downloadInvoiceAttachment(
  authFetch: AuthFetch,
  invoiceId: string,
  attachmentId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await authFetch(
    `${BASE_INVOICES}/${invoiceId}/attachments/${attachmentId}/download`,
  );
  if (!res.ok) throw await parseApiFormError(res);
  const blob = await res.blob();
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
    'document';
  return { blob, filename };
}

export async function archiveInvoiceAttachment(
  authFetch: AuthFetch,
  invoiceId: string,
  attachmentId: string,
): Promise<ProcurementAttachment> {
  const res = await authFetch(
    `${BASE_INVOICES}/${invoiceId}/attachments/${attachmentId}/archive`,
    { method: 'POST' },
  );
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ProcurementAttachment>;
}

