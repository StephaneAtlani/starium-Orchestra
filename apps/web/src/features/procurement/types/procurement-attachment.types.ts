export type ProcurementAttachmentCategory =
  | 'QUOTE_PDF'
  | 'ORDER_CONFIRMATION'
  | 'INVOICE'
  | 'AMENDMENT'
  | 'CORRESPONDENCE'
  | 'OTHER';

export type ProcurementAttachmentStatus = 'ACTIVE' | 'ARCHIVED';

export interface ProcurementAttachmentUploadedBy {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

/** Réponse API métier — pas d’objectKey / bucket / checksum. */
export interface ProcurementAttachment {
  id: string;
  name: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  category: ProcurementAttachmentCategory;
  status: ProcurementAttachmentStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  uploadedBy: ProcurementAttachmentUploadedBy | null;
}
