'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { useBudgetDetail } from '@/features/budgets/hooks/use-budgets';
import * as versioningApi from '@/features/budgets/api/budget-versioning.api';
import { budgetDetail } from '@/features/budgets/constants/budget-routes';
import type { BudgetVersionSummaryDto } from '@/features/budgets/types/budget-version-history.types';
import { CreateRevisionDialog } from './create-revision-dialog';
import {
  formatVersionKind,
  formatVersionStatus,
  formatVersionTitle,
} from './budget-versioning-labels';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

interface BudgetVersionsPageContentProps {
  budgetId: string;
}

export function BudgetVersionsPageContent({ budgetId }: BudgetVersionsPageContentProps) {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isLoading: permLoading } = usePermissions();

  const canCreate = has('budgets.create');
  const canUpdate = has('budgets.update');

  const [baselineOpen, setBaselineOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<BudgetVersionSummaryDto | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<BudgetVersionSummaryDto | null>(null);

  const budgetQuery = useBudgetDetail(budgetId);
  const budget = budgetQuery.data;
  const versionSetId = budget?.versionSetId ?? undefined;

  const versionSetQuery = useQuery({
    queryKey: budgetQueryKeys.budgetVersionSetDetail(clientId, versionSetId ?? ''),
    queryFn: () => versioningApi.getVersionSetById(authFetch, versionSetId!),
    enabled: !!clientId && !!versionSetId,
  });

  const historyQuery = useQuery({
    queryKey: budgetQueryKeys.budgetVersionHistory(clientId, budgetId),
    queryFn: () => versioningApi.getVersionHistory(authFetch, budgetId),
    enabled: !!clientId && !!budget?.isVersioned && !!versionSetId,
  });

  const invalidateBudgetQueries = () => {
    void qc.invalidateQueries({ queryKey: ['budgets', clientId] });
  };

  const baselineMutation = useMutation({
    mutationFn: () => versioningApi.createBaseline(authFetch, budgetId),
    onSuccess: (data) => {
      setActionError(null);
      setBaselineOpen(false);
      invalidateBudgetQueries();
      router.replace(`${budgetDetail(data.budgetId)}/versions`);
    },
    onError: (e: Error) => {
      setActionError(e.message);
    },
  });

  const sourceBudgetIdForRevision = versionSetQuery.data?.active?.id ?? null;

  const revisionMutation = useMutation({
    mutationFn: (input: { label?: string; description?: string }) => {
      if (!sourceBudgetIdForRevision) {
        return Promise.reject(new Error('Budget actif introuvable pour cette lignée.'));
      }
      return versioningApi.createRevision(authFetch, sourceBudgetIdForRevision, input);
    },
    onSuccess: (data) => {
      setActionError(null);
      setRevisionOpen(false);
      invalidateBudgetQueries();
      router.replace(`${budgetDetail(data.budgetId)}/versions`);
    },
    onError: (e: Error) => {
      setActionError(e.message);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => versioningApi.activateVersion(authFetch, id),
    onSuccess: (data) => {
      setActionError(null);
      setConfirmActivate(null);
      invalidateBudgetQueries();
      router.replace(`${budgetDetail(data.budgetId)}/versions`);
    },
    onError: (e: Error) => {
      setActionError(e.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => versioningApi.archiveVersion(authFetch, id),
    onSuccess: () => {
      setActionError(null);
      setConfirmArchive(null);
      invalidateBudgetQueries();
      void historyQuery.refetch();
      void versionSetQuery.refetch();
    },
    onError: (e: Error) => {
      setActionError(e.message);
    },
  });

  const loading =
    budgetQuery.isLoading ||
    (budget?.isVersioned && historyQuery.isLoading) ||
    (!!versionSetId && versionSetQuery.isLoading);

  const versions = historyQuery.data ?? [];

  return (
    <div className="space-y-6">
      {actionError && (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="max-w-3xl space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Lignée budgétaire</h2>
          {budget && (
            <p className="text-sm text-muted-foreground">
              Budget :{' '}
              <Link href={budgetDetail(budgetId)} className="font-medium text-foreground underline-offset-4 hover:underline">
                {budget.name}
              </Link>
              {budget.code ? ` (${budget.code})` : ''}
            </p>
          )}
          {versionSetQuery.data && (
            <p className="text-sm text-muted-foreground">
              Ensemble :{' '}
              <span className="font-medium text-foreground">{versionSetQuery.data.name}</span>
              {' · '}
              <span className="text-muted-foreground">{versionSetQuery.data.code}</span>
            </p>
          )}
        </div>
      </div>

      {loading || permLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : budgetQuery.isError ? (
        <p className="text-sm text-destructive">Impossible de charger le budget.</p>
      ) : !budget ? null : !budget.isVersioned ? (
        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            Ce budget n’est pas encore rattaché à une lignée de versions. La création d’une baseline
            duplique la structure actuelle vers un nouveau budget (V1) et active le versioning — le
            budget d’origine reste inchangé.
          </p>
          {canCreate ? (
            <Button type="button" onClick={() => setBaselineOpen(true)}>
              Créer une baseline…
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous n’avez pas la permission de créer une baseline.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {canCreate && sourceBudgetIdForRevision && (
              <Button type="button" variant="secondary" onClick={() => setRevisionOpen(true)}>
                Nouvelle révision
              </Button>
            )}
            {!canCreate && (
              <p className="text-sm text-muted-foreground">
                Création de révision réservée aux profils avec permission de création budget.
              </p>
            )}
          </div>

          {historyQuery.isError && (
            <p className="text-sm text-destructive">
              {(historyQuery.error as Error).message}
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">Activée</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Aucune version listée.
                    </TableCell>
                  </TableRow>
                ) : (
                  versions.map((row) => {
                    const isActiveRow = row.versionStatus === 'ACTIVE';
                    const canActivateRow =
                      canUpdate &&
                      !isActiveRow &&
                      row.versionStatus !== 'ARCHIVED';
                    const canArchiveRow =
                      canUpdate &&
                      !isActiveRow &&
                      row.versionStatus !== 'ARCHIVED';

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={budgetDetail(row.id)}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {formatVersionTitle(row)}
                          </Link>
                          <div className="text-xs text-muted-foreground">{row.name}</div>
                        </TableCell>
                        <TableCell>{formatVersionKind(row.versionKind)}</TableCell>
                        <TableCell>
                          <Badge variant={isActiveRow ? 'default' : 'secondary'}>
                            {formatVersionStatus(row.versionStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {formatDate(row.activatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            {canActivateRow && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmActivate(row)}
                              >
                                Activer
                              </Button>
                            )}
                            {canArchiveRow && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmArchive(row)}
                              >
                                Archiver
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={baselineOpen} onOpenChange={setBaselineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une baseline</DialogTitle>
            <DialogDescription>
              Un nouvel ensemble de versions sera créé et un budget V1 (baseline) sera généré par
              duplication. Vous serez redirigé vers la fiche de ce nouveau budget.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBaselineOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={baselineMutation.isPending}
              onClick={() => baselineMutation.mutate()}
            >
              {baselineMutation.isPending ? 'Création…' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateRevisionDialog
        open={revisionOpen}
        onOpenChange={setRevisionOpen}
        isPending={revisionMutation.isPending}
        onSubmit={(values) => revisionMutation.mutate(values)}
      />

      <Dialog
        open={!!confirmActivate}
        onOpenChange={(o) => !o && setConfirmActivate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activer cette version ?</DialogTitle>
            <DialogDescription>
              La version actuellement active passera en « Remplacée ». Le pilotage utilisera ce
              budget comme référence.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmActivate(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={activateMutation.isPending}
              onClick={() => confirmActivate && activateMutation.mutate(confirmActivate.id)}
            >
              {activateMutation.isPending ? 'Activation…' : 'Activer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmArchive}
        onOpenChange={(o) => !o && setConfirmArchive(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver cette version ?</DialogTitle>
            <DialogDescription>
              La version ne sera plus modifiable. Certaines contraintes (baseline seule, dernière
              version non archivée) peuvent empêcher l’opération.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmArchive(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={archiveMutation.isPending}
              onClick={() => confirmArchive && archiveMutation.mutate(confirmArchive.id)}
            >
              {archiveMutation.isPending ? 'Archivage…' : 'Archiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
