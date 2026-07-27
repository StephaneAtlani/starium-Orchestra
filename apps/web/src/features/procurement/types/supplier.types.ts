import type { OwnerOrgUnitSummary } from '@/features/organization/types/owner-org-unit-summary';

/** Réponse GET /api/suppliers/dashboard */
export interface SuppliersDashboardStats {
  suppliersListed: number;
  suppliersArchived: number;
  purchaseOrdersCount: number;
  invoicesCount: number;
  contactsActiveCount: number;
}

export interface SupplierOption {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  siret: string | null;
  vatNumber: string | null;
  externalId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  notes: string | null;
  /** Évaluation sur 5 (1.0–5.0) ; `null` si le fournisseur n'est pas encore évalué. */
  performanceRating: number | null;
  supplierCategoryId: string | null;
  supplierCategory: SupplierCategory | null;
  ownerOrgUnitId?: string | null;
  ownerOrgUnitSummary?: OwnerOrgUnitSummary | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Synthèse portefeuille fournisseurs (`GET /api/suppliers/summary`).
 * Portée : fournisseurs lisibles du client, indépendamment des filtres de liste.
 */
export interface SuppliersSummary {
  activeCount: number;
  archivedCount: number;
  addedThisYear: number;
  /** `null` si les contrats mêlent plusieurs devises. */
  annualSpend: number | null;
  currency: string | null;
  currencyMixed: boolean;
  activeContractCount: number;
  inRenewalCount: number;
  /** Moyenne sur 5 des évaluations renseignées ; `null` si aucune. */
  averageRating: number | null;
  ratedCount: number;
}

export interface SupplierCategory {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierContact {
  id: string;
  clientId: string;
  supplierId: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  normalizedName: string;
  role: string | null;
  email: string | null;
  emailNormalized: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Présent sur la liste globale client (GET /api/supplier-contacts) */
  supplierName?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

