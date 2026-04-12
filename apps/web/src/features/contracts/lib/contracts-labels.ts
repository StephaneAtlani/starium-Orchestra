import type {
  SupplierContractKind,
  SupplierContractRenewalMode,
  SupplierContractStatus,
  ContractAttachmentCategory,
} from '../types/contract.types';

const KIND: Record<SupplierContractKind, string> = {
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

export function contractKindLabel(k: SupplierContractKind): string {
  return KIND[k] ?? k;
}

export function contractStatusLabel(s: SupplierContractStatus): string {
  return STATUS[s] ?? s;
}

export function contractRenewalLabel(m: SupplierContractRenewalMode): string {
  return RENEWAL[m] ?? m;
}

export function contractAttachmentCategoryLabel(c: ContractAttachmentCategory): string {
  return ATT_CAT[c] ?? c;
}

export const contractKindOptions: { value: SupplierContractKind; label: string }[] = (
  Object.keys(KIND) as SupplierContractKind[]
).map((value) => ({ value, label: KIND[value] }));

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
