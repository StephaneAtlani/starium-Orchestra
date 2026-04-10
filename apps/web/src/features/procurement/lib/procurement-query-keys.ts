export const procurementAttachmentKeys = {
  purchaseOrder: (clientId: string, purchaseOrderId: string) =>
    ['procurement', clientId, 'attachments', 'purchase-order', purchaseOrderId] as const,
  invoice: (clientId: string, invoiceId: string) =>
    ['procurement', clientId, 'attachments', 'invoice', invoiceId] as const,
};
