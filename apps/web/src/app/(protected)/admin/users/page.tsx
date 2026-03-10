'use client';

import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { usePlatformUsersQuery } from '../../../../features/admin-studio/hooks/use-platform-users-query';
import type { AdminPlatformUserSummary } from '../../../../features/admin-studio/types/admin-studio.types';

const columns: DataTableColumn<AdminPlatformUserSummary>[] = [
  { key: 'email', header: 'Email' },
  {
    key: 'firstName',
    header: 'Prénom',
    cell: (row) => row.firstName ?? '—',
  },
  {
    key: 'lastName',
    header: 'Nom',
    cell: (row) => row.lastName ?? '—',
  },
  {
    key: 'platformRole',
    header: 'Rôle plateforme',
    cell: (row) => row.platformRole ?? '—',
    className: 'text-muted-foreground',
  },
  {
    key: 'createdAt',
    header: 'Créé le',
    cell: (row) => new Date(row.createdAt).toLocaleDateString('fr-FR'),
    className: 'text-muted-foreground',
  },
];

export default function AdminUsersPage() {
  const { data = [], isLoading, error, refetch } = usePlatformUsersQuery();

  return (
    <PageContainer>
      <PageHeader
        title="Utilisateurs globaux"
        description="Liste des utilisateurs globaux de la plateforme."
      />
      <TableToolbar />
      <Card>
        <CardContent className="pt-4">
          <DataTable<AdminPlatformUserSummary>
            columns={columns}
            data={data}
            isLoading={isLoading}
            error={error ?? null}
            getRowId={(row) => row.id}
            emptyTitle="Aucun utilisateur"
            emptyDescription="Aucun utilisateur global pour le moment."
            onRetry={() => void refetch()}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
