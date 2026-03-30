'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { getBudgetSnapshotById } from '@/features/budgets/api/budget-snapshots.api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value);
}

function toDisplayDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('fr-FR');
}

export default function BudgetSnapshotDetailPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';
  const snapshotId = typeof params.snapshotId === 'string' ? params.snapshotId : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const snapshotQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotDetail(clientId, snapshotId),
    queryFn: () => getBudgetSnapshotById(authFetch, snapshotId),
    enabled: !!clientId && !!snapshotId,
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Détail snapshot"
          description="Vue figée d’un snapshot budgétaire."
          actions={
            <Button asChild variant="outline">
              <Link href={`/budgets/${budgetId}/snapshots`}>Retour aux snapshots</Link>
            </Button>
          }
        />

        {snapshotQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {snapshotQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Chargement impossible</AlertTitle>
            <AlertDescription>
              {(snapshotQuery.error as Error)?.message ??
                'Erreur API lors du chargement du snapshot.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {!snapshotQuery.isLoading && !snapshotQuery.isError && !snapshotQuery.data ? (
          <p className="text-sm text-muted-foreground">Snapshot introuvable</p>
        ) : null}

        {snapshotQuery.data ? (
          <div className="space-y-6">
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Nom :</span> {snapshotQuery.data.name}
              </p>
              <p>
                <span className="font-medium text-foreground">Date :</span>{' '}
                {toDisplayDate(snapshotQuery.data.snapshotDate)}
              </p>
              <p>
                <span className="font-medium text-foreground">Créé par :</span>{' '}
                {snapshotQuery.data.createdByLabel ?? 'Utilisateur inconnu'}
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Ligne</TableHead>
                  <TableHead className="text-right">Révisé</TableHead>
                  <TableHead className="text-right">Consommé</TableHead>
                  <TableHead className="text-right">Forecast</TableHead>
                  <TableHead className="text-right">Restant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshotQuery.data.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.lineCode}</TableCell>
                    <TableCell>{line.lineName}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.revisedAmount, line.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.consumedAmount, line.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.forecastAmount, line.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.remainingAmount, line.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
