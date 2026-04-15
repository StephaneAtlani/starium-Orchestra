import type {
  SupplierContractRenewalMode,
  SupplierContractStatus,
  ContractAttachmentCategory,
} from '../types/contract.types';
import type { ContractKindTypeDto } from '../types/contract-kind-types.types';

/** Libellés par défaut (catalogue plateforme) si l’API n’a pas encore résolu `kindLabel`. */
const DEFAULT_KIND_LABELS: Record<string, string> = {
  FRAMEWORK: 'Cadre / accord-cadre',
  LICENSE_SAAS: 'Licence / SaaS',
  SERVICES: 'Prestations / services',
  MAINTENANCE: 'Maintenance / support',
  OTHER: 'Autre',
};

const STATUS: Record<SupplierContractStatus, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  NOTICE: 'En préavis',
  EXPIRED: 'Expiré',
  TERMINATED: 'Résilié',
};

const RENEWAL: Record<SupplierContractRenewalMode, string> = {
  NONE: 'Sans renouvellement automatique',
  TACIT: 'Tacite',
  EXPLICIT: 'Reconduction expresse',
};

const ATT_CAT: Record<ContractAttachmentCategory, string> = {
  CONTRACT_PDF: 'Contrat / PDF signé',
  AMENDMENT: 'Avenant',
  SLA: 'SLA / annexe technique',
  OTHER: 'Autre',
};

export function contractKindLabel(code: string, resolvedLabel?: string | null): string {
  if (resolvedLabel != null && resolvedLabel.trim() !== '') return resolvedLabel;
  return DEFAULT_KIND_LABELS[code] ?? code;
}

const PLATFORM_KIND_CODES = [
  'FRAMEWORK',
  'LICENSE_SAAS',
  'SERVICES',
  'MAINTENANCE',
  'OTHER',
] as const;

/** Si `GET /contracts/kind-types` échoue : sélecteur dégradé (codes plateforme uniquement). */
export const fallbackPlatformContractKindSelectRows: ContractKindTypeDto[] =
  PLATFORM_KIND_CODES.map((code, i) => ({
    id: `__fallback_${code}`,
    code,
    label: DEFAULT_KIND_LABELS[code] ?? code,
    description: null,
    sortOrder: (i + 1) * 10,
    isActive: true,
    scope: 'global',
    createdAt: '',
    updatedAt: '',
  }));

export function contractStatusLabel(s: SupplierContractStatus): string {
  return STATUS[s] ?? s;
}

export function contractRenewalLabel(m: SupplierContractRenewalMode): string {
  return RENEWAL[m] ?? m;
}

export function contractAttachmentCategoryLabel(c: ContractAttachmentCategory): string {
  return ATT_CAT[c] ?? c;
}

export const contractStatusOptions: { value: SupplierContractStatus; label: string }[] = (
  Object.keys(STATUS) as SupplierContractStatus[]
).map((value) => ({ value, label: STATUS[value] }));

export const contractRenewalOptions: { value: SupplierContractRenewalMode; label: string }[] = (
  Object.keys(RENEWAL) as SupplierContractRenewalMode[]
).map((value) => ({ value, label: RENEWAL[value] }));

export const contractAttachmentCategoryOptions: {
  value: ContractAttachmentCategory;
  label: string;
}[] = (Object.keys(ATT_CAT) as ContractAttachmentCategory[]).map((value) => ({
  value,
  label: ATT_CAT[value],
}));
