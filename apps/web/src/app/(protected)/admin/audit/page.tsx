'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import {
  usePlatformAuditLogsQuery,
} from '../../../../features/admin-studio/hooks/use-platform-audit-logs-query';
import type { AdminPlatformAuditLogRow } from '../../../../features/admin-studio/types/admin-studio.types';

const DEFAULT_LIMIT = 50;

const columns: DataTableColumn<AdminPlatformAuditLogRow>[] = [
  {
    key: 'createdAt',
    header: 'Date',
    cell: (row) => new Date(row.createdAt).toLocaleString('fr-FR'),
    className: 'text-muted-foreground',
  },
  {
    key: 'clientId',
    header: 'Client',
    cell: (row) => row.clientId ?? '—',
  },
  {
    key: 'userId',
    header: 'Utilisateur',
    cell: (row) => row.userId ?? '—',
  },
  { key: 'action', header: 'Action' },
  { key: 'resourceType', header: 'Ressource' },
  {
    key: 'resourceId',
    header: 'ID ressource',
    cell: (row) => row.resourceId ?? '—',
  },
];

export default function AdminAuditPage() {
  const [filters] = useState({});
  const [offset] = useState(0);

  const { data, isLoading, error, refetch } = usePlatformAuditLogsQuery(
    filters,
    offset,
    DEFAULT_LIMIT,
  );

  const rows = data?.items ?? [];

  return (
    <PageContainer>
      <PageHeader
        title="Audit logs globaux"
        description="Consultation des logs audit multi-clients (MVP, sans filtres avancés)."
      />
      <TableToolbar />
      <Card>
        <CardContent className="pt-4">
          <DataTable<AdminPlatformAuditLogRow>
            columns={columns}
            data={rows}
            isLoading={isLoading}
            error={error ?? null}
            getRowId={(row) => row.id}
            emptyTitle="Aucun audit log"
            emptyDescription="Aucun audit log pour le moment."
            onRetry={() => void refetch()}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
