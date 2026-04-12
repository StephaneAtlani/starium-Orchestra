'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { usePermissions } from '@/hooks/use-permissions';
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
  const { has } = usePermissions();
  const canRead = has('contracts.read');
  const canCreate = has('contracts.create');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [expiresBefore, setExpiresBefore] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const q = useContractsListQuery({
    search: search.trim() || undefined,
    status: status || undefined,
    expiresBefore: expiresBefore.trim() || undefined,
    limit: 50,
    offset: 0,
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contrats</h1>
          <p className="text-sm text-muted-foreground">
            Registre contractuel par fournisseur (référence, dates, renouvellement).
          </p>
        </div>
        {canCreate && (
          <Button type="button" className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Nouveau contrat
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Recherche (titre, réf., fournisseur)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={status || '__all'} onValueChange={(v) => setStatus(v === '__all' ? '' : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Statut" />
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Expire avant</span>
          <Input
            type="date"
            value={expiresBefore}
            onChange={(e) => setExpiresBefore(e.target.value)}
            className="w-[160px]"
          />
        </div>
      </div>

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
          <p className="text-sm text-muted-foreground">
            {q.data.total} contrat{q.data.total === 1 ? '' : 's'}
          </p>
          <div className="rounded-md border">
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Aucun contrat.
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
                      <TableCell>{contractKindLabel(c.kind)}</TableCell>
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
    </div>
  );
}
