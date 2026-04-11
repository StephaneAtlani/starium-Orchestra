'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { formatNumberFr } from '@/lib/currency-format';
import { usePermissions } from '@/hooks/use-permissions';
import { useInvoicesListQuery } from '../hooks/use-procurement-invoices';
import { CreateStandaloneInvoiceDialog } from './create-standalone-invoice-dialog';

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export function InvoicesListPage() {
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

  const q = useInvoicesListQuery({
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
          <h1 className="text-2xl font-semibold tracking-tight">Factures</h1>
          <p className="text-sm text-muted-foreground">
            Factures fournisseurs — suivi et pièces jointes.
            {supplierIdFromUrl ? (
              <span className="mt-1 block text-xs">
                Filtre actif : ce fournisseur uniquement —{' '}
                <Link href="/suppliers/invoices" className="text-primary underline-offset-2 hover:underline">
                  tout afficher
                </Link>
              </span>
            ) : null}
          </p>
        </div>
        {canCreate && (
          <Button type="button" className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Nouvelle facture
          </Button>
        )}
      </div>

      <CreateStandaloneInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />

      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchDraft);
            setOffset(0);
          }}
        >
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Rechercher numéro, libellé, fournisseur…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              aria-label="Recherche factures"
            />
          </div>
          <Button type="submit" variant="secondary">
            Rechercher
          </Button>
          <label className="flex cursor-pointer items-center gap-2">
            <Switch
              aria-label="Inclure les factures annulées"
              checked={includeCancelled}
              onCheckedChange={(next) => {
                setIncludeCancelled(next);
                setOffset(0);
              }}
            />
            <span className="text-sm font-normal">Inclure annulées</span>
          </label>
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
            <AlertDescription>Impossible de charger les factures.</AlertDescription>
          </Alert>
        )}

        {q.isSuccess && items.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucune facture.</p>
        )}

        {q.isSuccess && items.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Montant HT</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">
                      <Link
                        href={`/suppliers/invoices/${row.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {row.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{row.label}</TableCell>
                    <TableCell>
                      <Link
                        href={`/suppliers/${row.supplierId}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {row.supplier.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumberFr(row.amountHt, { minFraction: 2, maxFraction: 2 })} €
                    </TableCell>
                    <TableCell>{formatDate(row.invoiceDate)}</TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{row.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {q.isSuccess && total > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
            <span>{rangeLabel}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canPrev}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canNext}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
