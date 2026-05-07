import type {
  LicenseReportingFilters,
  LicenseReportingMonthlyFilters,
} from './api/license-reporting';

export const licenseReportingKeys = {
  root: ['license-reporting'] as const,
  overview: (filters: LicenseReportingFilters) =>
    ['license-reporting', 'overview', filters] as const,
  clients: (filters: LicenseReportingFilters) =>
    ['license-reporting', 'clients', filters] as const,
  monthly: (filters: LicenseReportingMonthlyFilters) =>
    ['license-reporting', 'monthly', filters] as const,
};
