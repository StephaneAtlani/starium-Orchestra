'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateClientDialog } from '../../../../features/admin-studio/components/create-client-dialog';
import { EditClientDialog } from '../../../../features/admin-studio/components/edit-client-dialog';
import { MigrateClientProcurementS3Dialog } from '../../../../features/admin-studio/components/migrate-client-procurement-s3-dialog';
import { useClientsQuery } from '../../../../features/admin-studio/hooks/use-clients-query';
import type { AdminClientSummary } from '../../../../features/admin-studio/types/admin-studio.types';

export default function AdminClientsPage() {
  const { data = [], isLoading, error, refetch } = useClientsQuery();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      cell: (row) => (
        <div className="flex min-w-[200px] flex-wrap items-center justify-end gap-2">
          <MigrateClientProcurementS3Dialog client={row} />
          <EditClientDialog client={row} />
        </div>
      ),
      className: 'text-right align-top',
    },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        description="Gérez les organisations de la plateforme."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/dashboard"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Tableau de bord
            </Link>
            <Link
              href="/admin/ui-badges"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Badges (plateforme)
            </Link>
            <CreateClientDialog />
          </div>
        }
      />
      <TableToolbar>
        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder="Rechercher (nom, slug, id)…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {totalItems} résultat{totalItems > 1 ? 's' : ''}
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Rows per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Page {safePage} / {totalPages}
          </span>
        </div>
      </TableToolbar>
      <Card>
        <CardContent className="pt-4">
          <DataTable<AdminClientSummary>
            columns={columns}
            data={paged}
            isLoading={isLoading}
            error={error ?? null}
            getRowId={(row) => row.id}
            emptyTitle={search.trim() ? 'Aucun résultat' : 'Aucun client'}
            emptyDescription={
              search.trim()
                ? 'Aucun client ne correspond à cette recherche.'
                : 'Aucun client pour le moment. Créez un client pour commencer.'
            }
            onRetry={() => void refetch()}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
