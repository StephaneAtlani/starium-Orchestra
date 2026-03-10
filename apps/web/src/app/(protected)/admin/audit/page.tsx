import { useState } from 'react';
import { PlatformAuditLogsTable } from '../../../../features/admin-studio/components/platform-audit-logs-table';
import {
  usePlatformAuditLogsQuery,
} from '../../../../features/admin-studio/hooks/use-platform-audit-logs-query';
import type { PlatformAuditLogsFilters } from '../../../../features/admin-studio/api/get-platform-audit-logs';

const DEFAULT_LIMIT = 50;

export default function AdminAuditPage() {
  const [filters] = useState<PlatformAuditLogsFilters>({});
  const [offset] = useState(0);
  const limit = DEFAULT_LIMIT;

  const { data, isLoading, error } = usePlatformAuditLogsQuery(
    filters,
    offset,
    limit,
  );

  return (
    <div>
      <h2 className="text-lg font-semibold">Audit logs globaux</h2>
      <p className="mt-2 text-sm text-neutral-400">
        Consultation des logs audit multi-clients (MVP, sans filtres avancés).
      </p>

      <PlatformAuditLogsTable
        rows={data?.items ?? []}
        isLoading={isLoading}
        error={error ?? null}
      />
    </div>
  );
}


