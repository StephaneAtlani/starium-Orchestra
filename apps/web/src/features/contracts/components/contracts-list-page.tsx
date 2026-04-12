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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  getContractSupplierById,
  listContractSupplierOptions,
} from '../api/contracts.api';
import { useContractsListQuery } from '../hooks/use-contracts-queries';
import { contractKindLabel, contractStatusLabel } from '../lib/contracts-labels';
import type { SupplierContractStatus } from '../types/contract.types';
import { ContractFormDialog } from './contract-form-dialog';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

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

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/70 bg-muted/15 p-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="contracts-search" className="text-xs font-medium text-muted-foreground">
            Recherche
          </label>
          <Input
            id="contracts-search"
            placeholder="Titre, référence, fournisseur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md border-input"
          />
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-muted-foreground">Statut</span>
          <Select
            value={status || '__all'}
            onValueChange={(v) => setStatus(v === '__all' || v == null ? '' : v)}
          >
            <SelectTrigger className="w-[min(100%,220px)] min-w-[200px] border-input">
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
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-muted-foreground">Fournisseur</span>
          <Select
            value={supplierIdFromUrl ? supplierIdFromUrl : '__all'}
            onValueChange={(v) => setSupplierFilter(v === '__all' || v == null ? '' : v)}
          >
            <SelectTrigger className="w-[min(100%,280px)] min-w-[220px] border-input">
              <SelectValue placeholder="Tous les fournisseurs">{supplierSelectLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Tous les fournisseurs</SelectItem>
              {supplierFilterLabelQ.data &&
                !suppliersSorted.some((s) => s.id === supplierFilterLabelQ.data!.id) && (
                  <SelectItem value={supplierFilterLabelQ.data.id}>
                    {supplierFilterLabelQ.data.name}
                    {supplierFilterLabelQ.data.code ? ` · ${supplierFilterLabelQ.data.code}` : ''}
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
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contracts-expires-before" className="block text-xs font-medium text-muted-foreground">
            Expire au plus tard le
          </label>
          <Input
            id="contracts-expires-before"
            type="date"
            value={expiresBefore}
            onChange={(e) => setExpiresBefore(e.target.value)}
            className="w-[160px] border-input"
          />
        </div>
      </div>

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
          <div className="rounded-lg border border-border/70 bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Fin effet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Aucun contrat à afficher. Créez un contrat ou élargissez les filtres.
                    </TableCell>
                  </TableRow>
                ) : (
                  q.data.items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/contracts/${c.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {c.reference}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.title}</TableCell>
                      <TableCell>{c.supplier.name}</TableCell>
                      <TableCell>{contractKindLabel(c.kind, c.kindLabel)}</TableCell>
                      <TableCell>{contractStatusLabel(c.status)}</TableCell>
                      <TableCell>{formatDate(c.effectiveEnd)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ContractFormDialog open={formOpen} onOpenChange={setFormOpen} mode="create" />
    </PageContainer>
  );
}
