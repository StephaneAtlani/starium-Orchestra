import { useQuery } from '@tanstack/react-query';
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
  return useQuery<PlatformAuditLogsResult>({
    queryKey: ['platform-audit-logs', filters, offset, limit],
    queryFn: () => getPlatformAuditLogs(filters, offset, limit),
  });
}

