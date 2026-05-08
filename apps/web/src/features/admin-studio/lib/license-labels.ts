import type { AdminPlatformUserLicense } from '../types/admin-studio.types';

export const LICENSE_TYPE_LABEL: Record<
  AdminPlatformUserLicense['licenseType'],
  string
> = {
  READ_ONLY: 'Lecture seule',
  READ_WRITE: 'Lecture / Écriture',
};

export const LICENSE_TYPE_SHORT: Record<
  AdminPlatformUserLicense['licenseType'],
  string
> = {
  READ_ONLY: 'RO',
  READ_WRITE: 'RW',
};

export const LICENSE_MODE_LABEL: Record<
  AdminPlatformUserLicense['licenseBillingMode'],
  string
> = {
  CLIENT_BILLABLE: 'Facturable client',
  NON_BILLABLE: 'Non facturable',
  EXTERNAL_BILLABLE: 'Facturable externe',
  PLATFORM_INTERNAL: 'Support plateforme',
  EVALUATION: 'Évaluation',
};

export const LICENSE_MODE_BADGE_VARIANT: Record<
  AdminPlatformUserLicense['licenseBillingMode'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  CLIENT_BILLABLE: 'default',
  NON_BILLABLE: 'secondary',
  EXTERNAL_BILLABLE: 'secondary',
  PLATFORM_INTERNAL: 'outline',
  EVALUATION: 'outline',
};
