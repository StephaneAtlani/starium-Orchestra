'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import * as versioningApi from '@/features/budgets/api/budget-versioning.api';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';

export function BudgetCycleVersionBlock() {
  const authFetch = useAuthenticatedFetch();
  const qc = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isLoading: permLoading } = usePermissions();
  const canManage = has('budgets.versioning_cycle.manage');

  const exercisesQuery = useBudgetExerciseOptionsQuery();
  const exercises = exercisesQuery.data ?? [];

  const [exerciseId, setExerciseId] = useState<string>('');
  const [versionSetId, setVersionSetId] = useState<string>('');
  const [closeSnapshot, setCloseSnapshot] = useState(true);
  const [confirmClose, setConfirmClose] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const versionSetsQuery = useQuery({
    queryKey: budgetQueryKeys.budgetVersionSetsList(clientId, { exerciseId }),
    queryFn: () => versioningApi.listVersionSets(authFetch, { exerciseId, limit: 50 }),
    enabled: !!clientId && !!exerciseId && canManage,
  });

  const sets = versionSetsQuery.data?.items ?? [];

  const selectedSet = useMemo(
    () => sets.find((s) => s.id === versionSetId) ?? null,
    [sets, versionSetId],
  );

  const activeBudgetId = selectedSet?.activeBudgetId ?? null;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['budgets', clientId] });
  };

  const t1Mutation = useMutation({
    mutationFn: () =>
      versioningApi.createCycleRevision(authFetch, activeBudgetId!, 'T1'),
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const t2Mutation = useMutation({
    mutationFn: () =>
      versioningApi.createCycleRevision(authFetch, activeBudgetId!, 'T2'),
    onSuccess: invalidate,
    onError: (e: Error) => setActionError(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      versioningApi.closeBudgetCycle(authFetch, activeBudgetId!, {
        createSnapshot: closeSnapshot,
        snapshotName: undefined,
      }),
    onSuccess: () => {
      setConfirmClose(false);
      invalidate();
    },
    onError: (e: Error) => setActionError(e.message),
  });

  if (permLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des permissions…
      </div>
    );
  }

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Réservé aux profils disposant de la permission « Versions de cycle » (gouvernance
        budgétaire).
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Versions de cycle (T1 / T2 / clôture)</h3>
        <p className="text-sm text-muted-foreground">
          Crée des révisions étiquetées pour les jalons semestriels ou la clôture. Le budget actif
          de l’ensemble sélectionné sert de source (RFC-033).
        </p>
      </div>

      {actionError && (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Exercice</Label>
          <Select
            value={exerciseId}
            onValueChange={(v) => {
              setExerciseId(v ?? '');
              setVersionSetId('');
              setActionError(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir un exercice" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((ex) => (
                <SelectItem key={ex.id} value={ex.id}>
                  {ex.name}
                  {ex.code ? ` (${ex.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ensemble de versions</Label>
          <Select
            value={versionSetId}
            onValueChange={(v) => {
              setVersionSetId(v ?? '');
              setActionError(null);
            }}
            disabled={!exerciseId || versionSetsQuery.isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une lignée" />
            </SelectTrigger>
            <SelectContent>
              {sets.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {exerciseId && versionSetsQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des ensembles…
        </div>
      )}

      {exerciseId && !versionSetsQuery.isLoading && sets.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun ensemble versionné pour cet exercice. Créez une baseline depuis la fiche budget
          puis revenez ici.
        </p>
      )}

      {activeBudgetId && selectedSet && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="secondary"
            disabled={t1Mutation.isPending || t2Mutation.isPending || closeMutation.isPending}
            onClick={() => {
              setActionError(null);
              t1Mutation.mutate();
            }}
          >
            {t1Mutation.isPending ? '…' : 'Révision T1'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={t1Mutation.isPending || t2Mutation.isPending || closeMutation.isPending}
            onClick={() => {
              setActionError(null);
              t2Mutation.mutate();
            }}
          >
            {t2Mutation.isPending ? '…' : 'Révision T2'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={t1Mutation.isPending || t2Mutation.isPending || closeMutation.isPending}
            onClick={() => {
              setActionError(null);
              setConfirmClose(true);
            }}
          >
            Clôture budgétaire…
          </Button>
        </div>
      )}

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer le cycle budgétaire ?</DialogTitle>
            <DialogDescription>
              Une révision de clôture sera créée, passera en statut verrouillé et deviendra la
              version active. Optionnellement, un snapshot de preuve est créé avant la révision.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="snap-close" className="text-sm font-normal">
              Créer un snapshot de preuve avant la clôture
            </Label>
            <Switch
              aria-label="Créer un snapshot de preuve avant la clôture"
              checked={closeSnapshot}
              onCheckedChange={setCloseSnapshot}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmClose(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              {closeMutation.isPending ? 'Clôture…' : 'Confirmer la clôture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
