'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatNumberFr } from '@/lib/currency-format';
import { toast } from '@/lib/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { updateInvoice } from '../api/procurement.api';
import { procurementEntityKeys } from '../lib/procurement-query-keys';
import { useInvoiceDetailQuery } from '../hooks/use-procurement-invoices';
import { useCancelInvoiceMutation } from '../hooks/use-procurement-entity-mutations';
import { ProcurementAttachmentsPanel } from './procurement-attachments-panel';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

export function InvoiceDetailPage({ invoiceId }: { invoiceId: string }) {
  const searchParams = useSearchParams();
  const highlightDocs = searchParams.get('documents') === '1';
  const docsRef = useRef<HTMLDivElement>(null);
  const { has } = usePermissions();
  const canRead = has('procurement.read');
  const canUpdate = has('procurement.update');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const q = useInvoiceDetailQuery(invoiceId);
  const cancelMut = useCancelInvoiceMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    if (highlightDocs && q.isSuccess && docsRef.current) {
      docsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightDocs, q.isSuccess]);

  useEffect(() => {
    if (q.data) {
      setLabel(q.data.label);
      setInvoiceNumber(q.data.invoiceNumber);
    }
  }, [q.data]);

  const patchMut = useMutation({
    mutationFn: () =>
      updateInvoice(authFetch, invoiceId, {
        label: label.trim(),
        invoiceNumber: invoiceNumber.trim(),
      }),
    onSuccess: (data) => {
      toast.success('Facture mise à jour.');
      setEditOpen(false);
      void queryClient.invalidateQueries({
        queryKey: procurementEntityKeys.invoiceDetail(clientId, invoiceId),
      });
      void queryClient.invalidateQueries({
        predicate: (qu) =>
          Array.isArray(qu.queryKey) &&
          qu.queryKey[0] === 'procurement' &&
          qu.queryKey[1] === clientId &&
          qu.queryKey[2] === 'invoices',
      });
      if (data) {
        setLabel(data.label);
        setInvoiceNumber(data.invoiceNumber);
      }
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Mise à jour impossible.');
    },
  });

  if (!canRead) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">procurement.read</code> requise.
        </AlertDescription>
      </Alert>
    );
  }

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <Button type="button" variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/suppliers/invoices">
            <ArrowLeft className="size-4" />
            Retour aux factures
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>Facture introuvable ou erreur de chargement.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const inv = q.data;
  const isCancelled = inv.status === 'CANCELLED';
  const ttc =
    inv.amountTtc != null
      ? formatNumberFr(inv.amountTtc, { minFraction: 2, maxFraction: 2 })
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/suppliers/invoices">
            <ArrowLeft className="size-4" />
            Liste
          </Link>
        </Button>
        {canUpdate && !isCancelled && (
          <>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Modifier libellé / numéro
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={cancelMut.isPending}
              onClick={() => {
                if (
                  confirm(
                    'Annuler cette facture ? Les impacts budgétaires seront inversés si la facture était liée à une ligne.',
                  )
                ) {
                  void cancelMut.mutateAsync(invoiceId).then(() => {
                    toast.success('Facture annulée.');
                    void q.refetch();
                  });
                }
              }}
            >
              Annuler la facture
            </Button>
          </>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight font-mono">{inv.invoiceNumber}</h1>
        <p className="text-muted-foreground mt-1">{inv.label}</p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-3 text-sm">
        <div className="grid gap-1 sm:grid-cols-2">
          <span className="text-muted-foreground">Fournisseur</span>
          <Link href={`/suppliers/${inv.supplierId}`} className="text-primary font-medium hover:underline">
            {inv.supplier.name}
          </Link>
        </div>
        {inv.purchaseOrderId && (
          <div className="grid gap-1 sm:grid-cols-2">
            <span className="text-muted-foreground">Commande</span>
            <Link
              href={`/suppliers/purchase-orders/${inv.purchaseOrderId}`}
              className="text-primary font-medium hover:underline"
            >
              Ouvrir la commande
            </Link>
          </div>
        )}
        {inv.budgetLineId && (
          <div className="grid gap-1 sm:grid-cols-2">
            <span className="text-muted-foreground">Ligne budgétaire</span>
            <Link
              href={`/budget-lines/${inv.budgetLineId}/edit`}
              className="text-primary font-medium hover:underline"
            >
              Ouvrir la ligne (édition)
            </Link>
          </div>
        )}
        <div className="grid gap-1 sm:grid-cols-2">
          <span className="text-muted-foreground">Date</span>
          <span>{formatDate(inv.invoiceDate)}</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-2">
          <span className="text-muted-foreground">Montant HT</span>
          <span className="tabular-nums font-medium">
            {formatNumberFr(inv.amountHt, { minFraction: 2, maxFraction: 2 })} €
          </span>
        </div>
        {inv.taxRate != null && (
          <div className="grid gap-1 sm:grid-cols-2">
            <span className="text-muted-foreground">TVA</span>
            <span className="tabular-nums">
              {formatNumberFr(inv.taxRate, { minFraction: 2, maxFraction: 2 })} % — TVA{' '}
              {inv.taxAmount != null
                ? `${formatNumberFr(inv.taxAmount, { minFraction: 2, maxFraction: 2 })} €`
                : '—'}
            </span>
          </div>
        )}
        {ttc && (
          <div className="grid gap-1 sm:grid-cols-2">
            <span className="text-muted-foreground">Montant TTC</span>
            <span className="tabular-nums font-medium">{ttc} €</span>
          </div>
        )}
        <div className="grid gap-1 sm:grid-cols-2">
          <span className="text-muted-foreground">Statut</span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs w-fit">{inv.status}</span>
        </div>
      </div>

      <div ref={docsRef}>
        <ProcurementAttachmentsPanel
          parent={{ kind: 'invoice', id: inv.id }}
          canList={canRead}
          canUpload={canUpdate}
        />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inv-edit-label">Libellé</Label>
              <Input id="inv-edit-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-edit-num">Numéro de facture</Label>
              <Input
                id="inv-edit-num"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Fermer
            </Button>
            <Button type="button" onClick={() => patchMut.mutate()} disabled={patchMut.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
