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
import { contractsKeys } from '@/features/contracts/lib/contracts-query-keys';
import {
  createClientContractKindType,
  deleteClientContractKindType,
  listContractKindTypesMerged,
} from '@/features/contracts/api/contracts.api';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

export default function ContractKindTypesPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsOk } = usePermissions();
  const canManage = permsOk && has('contracts.kind_types.manage');
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const listQuery = useQuery({
    queryKey: contractsKeys.kindTypesMerged(clientId),
    queryFn: () => listContractKindTypesMerged(authFetch),
    enabled: !!clientId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createClientContractKindType(authFetch, {
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
        queryKey: contractsKeys.kindTypesMerged(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deleteClientContractKindType(authFetch, id),
    onSuccess: async () => {
      toast.success('Type désactivé');
      await queryClient.invalidateQueries({
        queryKey: contractsKeys.kindTypesMerged(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Types de contrat"
          description="Catalogue plateforme et types propres à votre organisation pour le champ « Type de contrat » du registre fournisseur."
          actions={
            <Link
              href="/contracts"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Retour au registre
            </Link>
          }
        />

        {!canManage && permsOk ? (
          <Alert className="mb-6">
            <AlertTitle>Lecture seule</AlertTitle>
            <AlertDescription>
              Vous n’avez pas la permission de gérer les types spécifiques au client. Les types
              plateforme restent disponibles à la sélection dans les formulaires.
            </AlertDescription>
          </Alert>
        ) : null}

        {canManage ? (
          <div className="mb-8 max-w-xl space-y-4 rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Ajouter un type (client)</h2>
            <p className="text-xs text-muted-foreground">
              Le code ne doit pas entrer en conflit avec un type plateforme actif. Utilisez des codes
              explicites (ex. INFRA_CLOUD, CONSULTING_MS).
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ck-code">Code (MAJUSCULES)</Label>
                <Input
                  id="ck-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ck-sort">Ordre</Label>
                <Input
                  id="ck-sort"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ck-label">Libellé</Label>
              <Input id="ck-label" value={label} onChange={(e) => setLabel(e.target.value)} />
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
                  <TableCell className="text-sm text-muted-foreground">
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
                        <span className="text-sm text-muted-foreground">—</span>
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
