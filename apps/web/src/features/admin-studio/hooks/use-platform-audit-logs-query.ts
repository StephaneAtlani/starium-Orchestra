import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  getPlatformAuditLogs,
  type PlatformAuditLogsFilters,
  type PlatformAuditLogsResult,
} from '../api/get-platform-audit-logs';

export function usePlatformAuditLogsQuery(
  filters: PlatformAuditLogsFilters,
  offset: number,
  limit: number,
) {
  const { accessToken } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery<PlatformAuditLogsResult>({
    queryKey: ['platform-audit-logs', filters, offset, limit],
    queryFn: () =>
      getPlatformAuditLogs(authenticatedFetch, filters, offset, limit),
    enabled: !!accessToken,
  });
}

