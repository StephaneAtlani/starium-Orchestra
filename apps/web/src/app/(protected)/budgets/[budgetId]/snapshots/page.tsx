'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import {
  createBudgetSnapshot,
  listBudgetSnapshots,
} from '@/features/budgets/api/budget-snapshots.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function BudgetSnapshotsPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const snapshotsQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId),
    queryFn: () => listBudgetSnapshots(authFetch, budgetId, { limit: 100, offset: 0 }),
    enabled: !!clientId && !!budgetId,
  });

  const createSnapshotMutation = useMutation({
    mutationFn: () =>
      createBudgetSnapshot(authFetch, {
        budgetId,
        label: label.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: async () => {
      setOpen(false);
      setLabel('');
      setDescription('');
      setSubmitError(null);
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId),
      });
    },
    onError: (error: Error) => {
      setSubmitError(error.message || 'Erreur lors de la création du snapshot');
    },
  });

  const isCreatePending = createSnapshotMutation.isPending;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setSubmitError(null);
    createSnapshotMutation.mutate();
  };

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Snapshots"
          description="Snapshots figés du budget pour suivi temporel et audit."
          actions={
            <Button onClick={() => setOpen(true)} disabled={!budgetId}>
              Créer un snapshot
            </Button>
          }
        />

        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (isCreatePending) return;
            setOpen(nextOpen);
          }}
        >
          <DialogContent showCloseButton={!isCreatePending}>
            <DialogHeader>
              <DialogTitle>Créer un snapshot</DialogTitle>
              <DialogDescription>
                Le snapshot est figé après création et sert de référence historique.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="snapshot-label">Libellé</Label>
                <Input
                  id="snapshot-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Ex. Avant validation DAF"
                  disabled={isCreatePending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="snapshot-description">Description (optionnel)</Label>
                <Input
                  id="snapshot-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Contexte du gel"
                  disabled={isCreatePending}
                />
              </div>

              {submitError ? (
                <Alert variant="destructive">
                  <AlertTitle>Création impossible</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isCreatePending}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isCreatePending || !label.trim()}>
                  {isCreatePending ? 'Création...' : 'Créer le snapshot'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
                'Erreur API lors du chargement des snapshots.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {!snapshotsQuery.isLoading &&
        !snapshotsQuery.isError &&
        (snapshotsQuery.data?.items?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun snapshot</p>
        ) : null}

        {!snapshotsQuery.isLoading &&
        !snapshotsQuery.isError &&
        (snapshotsQuery.data?.items?.length ?? 0) > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Créé par</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshotsQuery.data!.items.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell>{toDisplayDate(snapshot.snapshotDate || snapshot.createdAt)}</TableCell>
                  <TableCell>{snapshot.name}</TableCell>
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
