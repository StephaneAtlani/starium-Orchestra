'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { formatNumberFr } from '@/lib/currency-format';
import { usePermissions } from '@/hooks/use-permissions';
import { usePurchaseOrdersListQuery } from '../hooks/use-procurement-purchase-orders';
import { CreateStandalonePurchaseOrderDialog } from './create-standalone-purchase-order-dialog';
import type { PurchaseOrder } from '../types/purchase-order.types';

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export function PurchaseOrdersListPage() {
  const searchParams = useSearchParams();
  const supplierIdFromUrl = searchParams.get('supplierId')?.trim() || undefined;

  const { has } = usePermissions();
  const canRead = has('procurement.read');
  const canCreate = has('procurement.create');
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setOffset(0);
  }, [supplierIdFromUrl]);

  const q = usePurchaseOrdersListQuery({
    offset,
    limit: PAGE_SIZE,
    search,
    supplierId: supplierIdFromUrl,
    includeCancelled,
  });

  const total = q.data?.total ?? 0;
  const items = q.data?.items ?? [];
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const rangeLabel = useMemo(() => {
    if (total === 0) return 'Aucun résultat';
    const from = offset + 1;
    const to = Math.min(offset + items.length, total);
    return `${from}–${to} sur ${total}`;
  }, [offset, items.length, total]);

  const columns = useMemo<DataTableColumn<PurchaseOrder>[]>(
    () => [
      {
        key: 'reference',
        header: 'Référence',
        mobilePriority: 'primary',
        cell: (row) => (
          <Link
            href={`/suppliers/purchase-orders/${row.id}`}
            className="font-mono text-sm text-primary underline-offset-4 hover:underline"
          >
            {row.reference}
          </Link>
        ),
      },
      {
        key: 'label',
        header: 'Libellé',
        mobilePriority: 'secondary',
        cell: (row) => <span className="whitespace-normal break-words">{row.label}</span>,
      },
      {
        key: 'supplier',
        header: 'Fournisseur',
        mobilePriority: 'secondary',
        cell: (row) => (
          <Link
            href={`/suppliers/${row.supplierId}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {row.supplier.name}
          </Link>
        ),
      },
      {
        key: 'amountHt',
        header: 'Montant HT',
        className: 'text-right',
        mobilePriority: 'secondary',
        cell: (row) => (
          <span className="tabular-nums">
            {formatNumberFr(row.amountHt, { minFraction: 2, maxFraction: 2 })} €
          </span>
        ),
      },
      {
        key: 'orderDate',
        header: 'Date',
        mobilePriority: 'secondary',
        cell: (row) => formatDate(row.orderDate),
      },
      {
        key: 'status',
        header: 'Statut',
        mobilePriority: 'secondary',
        cell: (row) => (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{row.status}</span>
        ),
      },
    ],
    [],
  );

  if (!canRead) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">procurement.read</code> requise.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Commandes</h1>
          <p className="text-sm text-muted-foreground">
            Bons de commande fournisseurs — montants et références métier.
            {supplierIdFromUrl ? (
              <span className="mt-1 block text-xs">
                Filtre actif : ce fournisseur uniquement —{' '}
                <Link
                  href="/suppliers/purchase-orders"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  tout afficher
                </Link>
              </span>
            ) : null}
          </p>
        </div>
        {canCreate && (
          <Button
            type="button"
            className="w-full shrink-0 gap-2 sm:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            Nouvelle commande
          </Button>
        )}
      </div>

      <CreateStandalonePurchaseOrderDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchDraft);
            setOffset(0);
          }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <FilterBar
              aria-label="Filtres commandes"
              asSearch
              className="flex-1 border-0 bg-transparent p-0"
              desktopColumns={2}
            >
              <FilterBarField id="po-search" label="Recherche">
                {({ controlId }) => (
                  <div className="relative w-full">
                    <Search
                      className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id={controlId}
                      className="w-full pl-9"
                      placeholder="Rechercher référence, libellé, fournisseur…"
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                    />
                  </div>
                )}
              </FilterBarField>
              <FilterBarField id="po-include-cancelled" label="Annulées">
                {({ controlId, labelId }) => (
                  <div className="flex min-h-11 items-center gap-2">
                    <Switch
                      aria-labelledby={labelId}
                      aria-label="Inclure les commandes annulées"
                      checked={includeCancelled}
                      onCheckedChange={(next) => {
                        setIncludeCancelled(next);
                        setOffset(0);
                      }}
                    />
                    <span className="text-sm font-normal">Inclure annulées</span>
                  </div>
                )}
              </FilterBarField>
            </FilterBar>
            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              Rechercher
            </Button>
          </div>
        </form>

        {q.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {q.isError && (
          <Alert variant="destructive">
            <AlertDescription>Impossible de charger les commandes.</AlertDescription>
          </Alert>
        )}

        {q.isSuccess && (
          <>
            <DataTable
              columns={columns}
              data={items}
              getRowId={(row) => row.id}
              mobileCardsAriaLabel="Liste des commandes"
              emptyTitle="Aucune commande"
              emptyDescription="Aucune commande ne correspond aux filtres."
            />

            {total > 0 && (
              <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{rangeLabel}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={!canPrev}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  >
                    Précédent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={!canNext}
                    onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
