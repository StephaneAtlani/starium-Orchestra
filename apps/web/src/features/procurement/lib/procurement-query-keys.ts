export const procurementAttachmentKeys = {
  purchaseOrder: (clientId: string, purchaseOrderId: string) =>
    ['procurement', clientId, 'attachments', 'purchase-order', purchaseOrderId] as const,
  invoice: (clientId: string, invoiceId: string) =>
    ['procurement', clientId, 'attachments', 'invoice', invoiceId] as const,
};

/** Listes / fiches commandes & factures (hors ligne budgétaire). */
export const procurementEntityKeys = {
  purchaseOrdersList: (clientId: string, paramsKey: string) =>
    ['procurement', clientId, 'purchase-orders', 'list', paramsKey] as const,
  purchaseOrderDetail: (clientId: string, id: string) =>
    ['procurement', clientId, 'purchase-orders', 'detail', id] as const,
  invoicesList: (clientId: string, paramsKey: string) =>
    ['procurement', clientId, 'invoices', 'list', paramsKey] as const,
  invoiceDetail: (clientId: string, id: string) =>
    ['procurement', clientId, 'invoices', 'detail', id] as const,
};
