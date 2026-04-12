'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { terminateContract } from '../api/contracts.api';
import { contractsKeys } from '../lib/contracts-query-keys';
import { useContractDetailQuery } from '../hooks/use-contracts-queries';
import {
  contractKindLabel,
  contractRenewalLabel,
  contractStatusLabel,
} from '../lib/contracts-labels';
import { ContractFormDialog } from './contract-form-dialog';
import { ContractAttachmentsPanel } from './contract-attachments-panel';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

export function ContractDetailPage({ contractId }: { contractId: string }) {
  const { has } = usePermissions();
  const canRead = has('contracts.read');
  const canUpdate = has('contracts.update');
  const canDelete = has('contracts.delete');
  const canProcurement = has('procurement.read');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const q = useContractDetailQuery(contractId);
  const [editOpen, setEditOpen] = useState(false);

  const terminateMut = useMutation({
    mutationFn: () => terminateContract(authFetch, contractId),
    onSuccess: () => {
      toast.success('Contrat résilié.');
      void queryClient.invalidateQueries({ queryKey: contractsKeys.root(clientId) });
      void queryClient.invalidateQueries({
        queryKey: contractsKeys.detail(clientId, contractId),
      });
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Action impossible.');
    },
  });

  if (!canRead) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">contracts.read</code> requise.
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
          <Link href="/contracts">
            <ArrowLeft className="size-4" />
            Liste
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>Contrat introuvable ou erreur de chargement.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const c = q.data;
  const terminated = c.status === 'TERMINATED';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/contracts">
            <ArrowLeft className="size-4" />
            Liste
          </Link>
        </Button>
        {canUpdate && (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Modifier
          </Button>
        )}
        {canDelete && !terminated && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={terminateMut.isPending}
            onClick={() => {
              if (confirm('Résilier ce contrat ? Le statut passera à « Résilié ».')) {
                terminateMut.mutate();
              }
            }}
          >
            Résilier
          </Button>
        )}
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{c.reference}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="mt-1 text-lg text-foreground">
          {canProcurement ? (
            <Link
              href={`/suppliers/${c.supplierId}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {c.supplier.name}
              {c.supplier.code ? ` · ${c.supplier.code}` : ''}
            </Link>
          ) : (
            <>
              {c.supplier.name}
              {c.supplier.code ? ` · ${c.supplier.code}` : ''}
            </>
          )}
        </p>
        {c.supplier.supplierCategory && (
          <p className="text-sm text-muted-foreground">
            Catégorie : {c.supplier.supplierCategory.name}
          </p>
        )}
      </div>

      <dl className="grid gap-3 rounded-lg border bg-card p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Type</dt>
          <dd className="font-medium">{contractKindLabel(c.kind, c.kindLabel)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Statut</dt>
          <dd className="font-medium">{contractStatusLabel(c.status)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Signé le</dt>
          <dd>{formatDate(c.signedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Effet</dt>
          <dd>
            {formatDate(c.effectiveStart)} → {formatDate(c.effectiveEnd)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Renouvellement</dt>
          <dd>{contractRenewalLabel(c.renewalMode)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Durée initiale (mois)</dt>
          <dd>{c.renewalTermMonths ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Préavis (jours)</dt>
          <dd>{c.noticePeriodDays ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Devise</dt>
          <dd>{c.currency}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Valeur annuelle (info)</dt>
          <dd>{c.annualValue != null ? String(c.annualValue) : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Engagement total (info)</dt>
          <dd>{c.totalCommittedValue != null ? String(c.totalCommittedValue) : '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Fréquence facturation</dt>
          <dd>{c.billingFrequency ?? '—'}</dd>
        </div>
        {c.description && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Commentaires</dt>
            <dd className="whitespace-pre-wrap">{c.description}</dd>
          </div>
        )}
        {c.internalNotes && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Notes internes</dt>
            <dd className="whitespace-pre-wrap">{c.internalNotes}</dd>
          </div>
        )}
      </dl>

      <ContractAttachmentsPanel contractId={c.id} canList={canRead} canUpload={canUpdate} />

      <ContractFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        contract={c}
        onSuccess={() => {
          void q.refetch();
        }}
      />
    </div>
  );
}
