'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  getLicenseReportingClients,
  getLicenseReportingMonthly,
  getLicenseReportingOverview,
  type LicenseReportingFilters,
  type LicenseReportingMonthlyFilters,
} from '../api/license-reporting';
import { licenseReportingKeys } from '../query-keys';

export function useLicenseReportingOverview(filters: LicenseReportingFilters) {
  const { user, accessToken } = useAuth();
  const authFetch = useAuthenticatedFetch();
  const enabled = !!accessToken && user?.platformRole === 'PLATFORM_ADMIN';
  return useQuery({
    queryKey: licenseReportingKeys.overview(filters),
    queryFn: () => getLicenseReportingOverview(authFetch, filters),
    enabled,
    staleTime: 60_000,
  });
}

export function useLicenseReportingClients(filters: LicenseReportingFilters) {
  const { user, accessToken } = useAuth();
  const authFetch = useAuthenticatedFetch();
  const enabled = !!accessToken && user?.platformRole === 'PLATFORM_ADMIN';
  return useQuery({
    queryKey: licenseReportingKeys.clients(filters),
    queryFn: () => getLicenseReportingClients(authFetch, filters),
    enabled,
    staleTime: 60_000,
  });
}

export function useLicenseReportingMonthly(filters: LicenseReportingMonthlyFilters) {
  const { user, accessToken } = useAuth();
  const authFetch = useAuthenticatedFetch();
  const enabled = !!accessToken && user?.platformRole === 'PLATFORM_ADMIN';
  return useQuery({
    queryKey: licenseReportingKeys.monthly(filters),
    queryFn: () => getLicenseReportingMonthly(authFetch, filters),
    enabled,
    staleTime: 60_000,
  });
}
