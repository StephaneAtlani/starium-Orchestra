'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import {
  DataTable,
  type DataTableColumn,
} from '@/components/data-table/data-table';
import { usePlatformAuditLogsQuery } from '../../../../features/admin-studio/hooks/use-platform-audit-logs-query';
import { useClientsQuery } from '../../../../features/admin-studio/hooks/use-clients-query';
import { usePlatformUsersQuery } from '../../../../features/admin-studio/hooks/use-platform-users-query';
import type { AdminPlatformAuditLogRow } from '../../../../features/admin-studio/types/admin-studio.types';

const DEFAULT_LIMIT = 50;

export default function AdminAuditPage() {
  const [filters] = useState({});
  const [offset] = useState(0);

  const { data, isLoading, error, refetch } = usePlatformAuditLogsQuery(
    filters,
    offset,
    DEFAULT_LIMIT,
  );

  const { data: clients = [] } = useClientsQuery();
  const { data: users = [] } = usePlatformUsersQuery();

  const clientNameById = new Map<string, string>(
    clients.map((c) => [c.id, c.name]),
  );

  const userLabelById = new Map<string, string>(
    users.map((u) => {
      const name =
        (u.firstName || u.lastName
          ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
          : '') || null;
      return [u.id, name ? `${name} (${u.email})` : u.email];
    }),
  );

  const rows = data?.items ?? [];

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
      cell: (row) => {
        if (!row.clientId) return '—';
        return clientNameById.get(row.clientId) ?? row.clientId;
      },
    },
    {
      key: 'userId',
      header: 'Utilisateur',
      cell: (row) => {
        if (!row.userId) return '—';
        return userLabelById.get(row.userId) ?? row.userId;
      },
    },
    { key: 'action', header: 'Action' },
    { key: 'resourceType', header: 'Ressource' },
    {
      key: 'resourceId',
      header: 'ID ressource',
      cell: (row) => row.resourceId ?? '—',
    },
  ];

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
