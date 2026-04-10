'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { CreateBudgetSnapshotDialog } from '@/features/budgets/components/create-budget-snapshot-dialog';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { listBudgetSnapshots } from '@/features/budgets/api/budget-snapshots.api';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function toDisplayDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('fr-FR');
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value);
}

export default function BudgetSnapshotsPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [createOpen, setCreateOpen] = React.useState(false);

  const snapshotsQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId),
    queryFn: () => listBudgetSnapshots(authFetch, budgetId, { limit: 100, offset: 0 }),
    enabled: !!clientId && !!budgetId,
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Versions figées"
          description="Copies lecture seule du budget à un instant donné (audit, comparaison, CODIR)."
          actions={
            <PermissionGate permission="budgets.create">
              <Button onClick={() => setCreateOpen(true)} disabled={!budgetId}>
                Enregistrer une version
              </Button>
            </PermissionGate>
          }
        />

        <CreateBudgetSnapshotDialog
          budgetId={budgetId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />

        {snapshotsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {snapshotsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Chargement impossible</AlertTitle>
            <AlertDescription>
              {(snapshotsQuery.error as Error)?.message ??
                'Erreur API lors du chargement des versions figées.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {!snapshotsQuery.isLoading &&
        !snapshotsQuery.isError &&
        (snapshotsQuery.data?.items?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune version figée pour ce budget</p>
        ) : null}

        {!snapshotsQuery.isLoading &&
        !snapshotsQuery.isError &&
        (snapshotsQuery.data?.items?.length ?? 0) > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type d’occasion</TableHead>
                <TableHead className="text-right">Total budget</TableHead>
                <TableHead>Créé par</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshotsQuery.data!.items.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell>{toDisplayDate(snapshot.snapshotDate || snapshot.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs">{snapshot.code}</TableCell>
                  <TableCell>{snapshot.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {snapshot.occasionTypeLabel ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(snapshot.totalInitialAmount, snapshot.budgetCurrency)}
                  </TableCell>
                  <TableCell>{snapshot.createdByLabel ?? 'Utilisateur inconnu'}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/budgets/${budgetId}/snapshots/${snapshot.id}`}>Ouvrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
