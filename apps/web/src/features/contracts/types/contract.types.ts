import type { OwnerOrgUnitSummary } from '@/features/organization/types/owner-org-unit-summary';

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
  ownerOrgUnitId?: string | null;
  ownerOrgUnitSummary?: OwnerOrgUnitSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ContractListResult {
  items: Contract[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Synthèse portefeuille contrats (`GET /api/contracts/summary`).
 * Portée : tous les contrats lisibles du client, indépendamment des filtres de liste.
 */
export interface ContractsSummary {
  totalCount: number;
  /** Contrats en vigueur (actifs ou en préavis). */
  activeCount: number;
  activeSupplierCount: number;
  /** `null` si le portefeuille mêle plusieurs devises. */
  committedValue: number | null;
  /** `null` si le portefeuille mêle plusieurs devises. */
  annualValue: number | null;
  currency: string | null;
  currencyMixed: boolean;
  expiringSoonCount: number;
  expiringSoonHorizonDays: number;
  inRenewalCount: number;
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
