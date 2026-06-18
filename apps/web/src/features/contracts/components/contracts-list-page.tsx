'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  getContractSupplierById,
  listContractSupplierOptions,
} from '../api/contracts.api';
import { useContractsListQuery } from '../hooks/use-contracts-queries';
import { contractKindLabel, contractStatusLabel } from '../lib/contracts-labels';
import type { SupplierContractStatus, Contract } from '../types/contract.types';
import { ContractFormDialog } from './contract-form-dialog';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

const contractColumns: DataTableColumn<Contract>[] = [
  {
    key: 'reference',
    header: 'Référence',
    mobilePriority: 'primary',
    cell: (c) => (
      <Link
        href={`/contracts/${c.id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {c.reference}
      </Link>
    ),
  },
  {
    key: 'title',
    header: 'Titre',
    mobilePriority: 'secondary',
    cell: (c) => <span className="whitespace-normal break-words">{c.title}</span>,
  },
  {
    key: 'supplier',
    header: 'Fournisseur',
    mobilePriority: 'secondary',
    cell: (c) => c.supplier.name,
  },
  {
    key: 'kind',
    header: 'Type',
    mobilePriority: 'secondary',
    cell: (c) => contractKindLabel(c.kind, c.kindLabel),
  },
  {
    key: 'status',
    header: 'Statut',
    mobilePriority: 'secondary',
    cell: (c) => contractStatusLabel(c.status),
  },
  {
    key: 'effectiveEnd',
    header: 'Fin effet',
    mobilePriority: 'secondary',
    cell: (c) => formatDate(c.effectiveEnd),
  },
];

export function ContractsListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const supplierIdFromUrl = (searchParams.get('supplierId') ?? '').trim();

  const { has } = usePermissions();
  const canRead = has('contracts.read');
  const canCreate = has('contracts.create');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [expiresBefore, setExpiresBefore] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const setSupplierFilter = (nextId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextId) params.set('supplierId', nextId);
    else params.delete('supplierId');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const suppliersQ = useQuery({
    queryKey: ['contracts', clientId, 'list-supplier-options'],
    queryFn: () => listContractSupplierOptions(authFetch, { limit: 500, offset: 0 }),
    enabled: canRead && !!clientId,
  });

  const supplierFilterLabelQ = useQuery({
    queryKey: ['contracts', clientId, 'supplier', supplierIdFromUrl, 'filter-label'],
    queryFn: () => getContractSupplierById(authFetch, supplierIdFromUrl),
    enabled: Boolean(clientId && canRead && supplierIdFromUrl),
  });

  const suppliersSorted = useMemo(() => {
    const items = suppliersQ.data?.items ?? [];
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [suppliersQ.data?.items]);

  const supplierSelectLabel = !supplierIdFromUrl
    ? 'Tous les fournisseurs'
    : supplierFilterLabelQ.data?.name ??
      suppliersSorted.find((s) => s.id === supplierIdFromUrl)?.name ??
      (supplierFilterLabelQ.isLoading ? 'Chargement…' : 'Fournisseur');

  const q = useContractsListQuery({
    search: search.trim() || undefined,
    status: status || undefined,
    expiresBefore: expiresBefore.trim() || undefined,
    supplierId: supplierIdFromUrl || undefined,
    limit: 50,
    offset: 0,
  });

  const filterBannerSupplierName = useMemo(() => {
    if (!supplierIdFromUrl) return null;
    const fromApi =
      supplierFilterLabelQ.data?.name ??
      suppliersSorted.find((s) => s.id === supplierIdFromUrl)?.name ??
      null;
    if (fromApi) return fromApi;
    if (q.isSuccess && q.data.items.length > 0) {
      const row = q.data.items.find((i) => i.supplierId === supplierIdFromUrl);
      return row?.supplier.name ?? null;
    }
    return null;
  }, [
    supplierIdFromUrl,
    supplierFilterLabelQ.data?.name,
    suppliersSorted,
    q.isSuccess,
    q.data?.items,
  ]);

  if (!canRead) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">contracts.read</code> requise.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Contrats"
        description="Registre contractuel par fournisseur (référence, dates, renouvellement)."
        actions={
          canCreate ? (
            <Button type="button" className="gap-2" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Nouveau contrat
            </Button>
          ) : undefined
        }
      />

      <FilterBar aria-label="Filtres contrats" asSearch desktopColumns="auto">
        <FilterBarField id="contracts-search" label="Recherche">
          {({ controlId }) => (
            <Input
              id={controlId}
              placeholder="Titre, référence, fournisseur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-input"
            />
          )}
        </FilterBarField>
        <FilterBarField id="contracts-status" label="Statut">
          {({ controlId, labelId }) => (
            <Select
              value={status || '__all'}
              onValueChange={(v) => setStatus(v === '__all' || v == null ? '' : v)}
            >
              <SelectTrigger
                id={controlId}
                aria-labelledby={labelId}
                className="w-full border-input"
              >
                <SelectValue placeholder="Tous statuts">
                  {status === ''
                    ? 'Tous statuts'
                    : contractStatusLabel(status as SupplierContractStatus)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Tous statuts</SelectItem>
                {(
                  [
                    'DRAFT',
                    'ACTIVE',
                    'SUSPENDED',
                    'NOTICE',
                    'EXPIRED',
                    'TERMINATED',
                  ] as SupplierContractStatus[]
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {contractStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="contracts-supplier" label="Fournisseur">
          {({ controlId, labelId }) => (
            <Select
              value={supplierIdFromUrl ? supplierIdFromUrl : '__all'}
              onValueChange={(v) => setSupplierFilter(v === '__all' || v == null ? '' : v)}
            >
              <SelectTrigger
                id={controlId}
                aria-labelledby={labelId}
                className="w-full border-input"
              >
                <SelectValue placeholder="Tous les fournisseurs">
                  {supplierSelectLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Tous les fournisseurs</SelectItem>
                {supplierFilterLabelQ.data &&
                  !suppliersSorted.some((s) => s.id === supplierFilterLabelQ.data!.id) && (
                    <SelectItem value={supplierFilterLabelQ.data.id}>
                      {supplierFilterLabelQ.data.name}
                      {supplierFilterLabelQ.data.code
                        ? ` · ${supplierFilterLabelQ.data.code}`
                        : ''}
                    </SelectItem>
                  )}
                {suppliersSorted.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.code ? ` · ${s.code}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
        <FilterBarField id="contracts-expires-before" label="Expire au plus tard le">
          {({ controlId }) => (
            <Input
              id={controlId}
              type="date"
              value={expiresBefore}
              onChange={(e) => setExpiresBefore(e.target.value)}
              className="w-full border-input"
            />
          )}
        </FilterBarField>
      </FilterBar>

      {supplierIdFromUrl && (
        <p className="text-sm text-muted-foreground">
          Filtre actif
          {filterBannerSupplierName ? ` : ${filterBannerSupplierName}` : ''}
          {' — '}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => setSupplierFilter('')}
          >
            tout afficher
          </button>
        </p>
      )}

      {q.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {q.isError && (
        <Alert variant="destructive">
          <AlertDescription>Impossible de charger les contrats.</AlertDescription>
        </Alert>
      )}

      {q.isSuccess && (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {q.data.total === 0
              ? 'Aucun contrat ne correspond aux filtres.'
              : `${q.data.total} contrat${q.data.total === 1 ? '' : 's'}`}
          </p>
          <div className="rounded-lg border border-border/70 bg-card p-2 shadow-sm sm:p-4">
            <DataTable
              columns={contractColumns}
              data={q.data.items}
              getRowId={(row) => row.id}
              mobileCardsAriaLabel="Liste des contrats"
              emptyTitle="Aucun contrat à afficher"
              emptyDescription="Créez un contrat ou élargissez les filtres."
            />
          </div>
        </>
      )}

      <ContractFormDialog open={formOpen} onOpenChange={setFormOpen} mode="create" />
    </PageContainer>
  );
}
