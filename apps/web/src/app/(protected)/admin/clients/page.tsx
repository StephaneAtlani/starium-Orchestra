'use client';

import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { CreateClientDialog } from '../../../../features/admin-studio/components/create-client-dialog';
import { EditClientDialog } from '../../../../features/admin-studio/components/edit-client-dialog';
import { useClientsQuery } from '../../../../features/admin-studio/hooks/use-clients-query';
import type { AdminClientSummary } from '../../../../features/admin-studio/types/admin-studio.types';

export default function AdminClientsPage() {
  const { data = [], isLoading, error, refetch } = useClientsQuery();

  const columns: DataTableColumn<AdminClientSummary>[] = [
    { key: 'name', header: 'Nom' },
    { key: 'slug', header: 'Slug', className: 'text-muted-foreground' },
    {
      key: 'createdAt',
      header: 'Créé le',
      cell: (row) => new Date(row.createdAt).toLocaleDateString('fr-FR'),
      className: 'text-muted-foreground',
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => <EditClientDialog client={row} />,
      className: 'text-right',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        description="Gérez les organisations de la plateforme."
        actions={<CreateClientDialog />}
      />
      <TableToolbar />
      <Card>
        <CardContent className="pt-4">
          <DataTable<AdminClientSummary>
            columns={columns}
            data={data}
            isLoading={isLoading}
            error={error ?? null}
            getRowId={(row) => row.id}
            emptyTitle="Aucun client"
            emptyDescription="Aucun client pour le moment. Créez un client pour commencer."
            onRetry={() => void refetch()}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
