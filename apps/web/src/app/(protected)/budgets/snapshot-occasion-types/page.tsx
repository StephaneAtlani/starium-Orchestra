'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import {
  createClientBudgetSnapshotOccasionType,
  deleteClientBudgetSnapshotOccasionType,
  listBudgetSnapshotOccasionTypesMerged,
} from '@/features/budgets/api/budget-snapshot-occasion-types.api';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

export default function BudgetSnapshotOccasionTypesClientPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsOk } = usePermissions();
  const canManage = permsOk && has('budgets.snapshot_occasion_types.manage');
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const listQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotOccasionTypesMerged(clientId),
    queryFn: () => listBudgetSnapshotOccasionTypesMerged(authFetch),
    enabled: !!clientId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createClientBudgetSnapshotOccasionType(authFetch, {
        code: code.trim().toUpperCase(),
        label: label.trim(),
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      }),
    onSuccess: async () => {
      setCode('');
      setLabel('');
      setSortOrder('0');
      toast.success('Type client créé');
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetSnapshotOccasionTypesMerged(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deleteClientBudgetSnapshotOccasionType(authFetch, id),
    onSuccess: async () => {
      toast.success('Type désactivé');
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetSnapshotOccasionTypesMerged(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Types de version figée"
          description="Libellés proposés à l’enregistrement d’une version figée : catalogue plateforme et types propres à votre organisation."
          actions={
            <Link
              href="/budgets/configuration"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Retour configuration
            </Link>
          }
        />

        {!canManage && permsOk ? (
          <Alert className="mb-6">
            <AlertTitle>Lecture seule</AlertTitle>
            <AlertDescription>
              Vous n’avez pas la permission de gérer les types spécifiques au client. Les types
              plateforme restent disponibles à la sélection.
            </AlertDescription>
          </Alert>
        ) : null}

        {canManage ? (
          <div className="mb-8 max-w-xl space-y-4 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Ajouter un type de version figée (client)</h2>
            <p className="text-xs text-muted-foreground">
              Le code ne doit pas entrer en conflit avec un type plateforme actif.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cl-code">Code (MAJUSCULES)</Label>
                <Input
                  id="cl-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cl-sort">Ordre</Label>
                <Input
                  id="cl-sort"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-label">Libellé</Label>
              <Input id="cl-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <Button
              type="button"
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !code.trim() || !label.trim()}
            >
              Créer
            </Button>
          </div>
        ) : null}

        {listQuery.isError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{(listQuery.error as Error).message}</AlertDescription>
          </Alert>
        ) : null}

        {listQuery.isLoading ? <LoadingState rows={4} /> : null}

        {!listQuery.isLoading && listQuery.data ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portée</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Ordre</TableHead>
                <TableHead>Actif</TableHead>
                {canManage ? <TableHead className="text-right">Action</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.scope === 'global' ? 'Plateforme' : 'Client'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right">{row.sortOrder}</TableCell>
                  <TableCell>{row.isActive ? 'oui' : 'non'}</TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      {row.scope === 'client' && row.isActive ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deactivateMut.isPending}
                          onClick={() => deactivateMut.mutate(row.id)}
                        >
                          Désactiver
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
