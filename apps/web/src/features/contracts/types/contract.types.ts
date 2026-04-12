export type SupplierContractStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'NOTICE'
  | 'EXPIRED'
  | 'TERMINATED';

export type SupplierContractRenewalMode = 'NONE' | 'TACIT' | 'EXPLICIT';

export type ContractAttachmentCategory = 'CONTRACT_PDF' | 'AMENDMENT' | 'SLA' | 'OTHER';

export interface ContractSupplierSummary {
  id: string;
  name: string;
  code: string | null;
  supplierCategory: { id: string; name: string } | null;
}

export interface Contract {
  id: string;
  clientId: string;
  supplierId: string;
  supplier: ContractSupplierSummary;
  reference: string;
  title: string;
  /** Code catalogue (`SupplierContractKindType.code`). */
  kind: string;
  /** Libellé résolu côté API (affichage). */
  kindLabel: string;
  status: SupplierContractStatus;
  signedAt: string | null;
  effectiveStart: string;
  effectiveEnd: string | null;
  terminatedAt: string | null;
  renewalMode: SupplierContractRenewalMode;
  noticePeriodDays: number | null;
  renewalTermMonths: number | null;
  currency: string;
  annualValue: number | null;
  totalCommittedValue: number | null;
  billingFrequency: string | null;
  description: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractListResult {
  items: Contract[];
  total: number;
  limit: number;
  offset: number;
}

export interface ContractAttachment {
  id: string;
  name: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  category: ContractAttachmentCategory;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  uploadedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}
