'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { bulkUpdateBudgetLineStatus } from '../api/budget-management.api';
import { BUDGET_LINE_STATUS_EDIT_OPTIONS } from '../constants/budget-line-status-options';
import { useBudgetExercisesQuery } from '../hooks/use-budget-exercises-query';
import { formatBudgetExerciseOptionLabel } from '../lib/budget-exercise-option-label';
import { toast } from '@/lib/toast';
import type { ApiFormError } from '../api/types';

export function BudgetBulkLineStatusDialog({
  open,
  onOpenChange,
  lineIds,
  budgetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineIds: string[];
  budgetId: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('ACTIVE');
  const [deferredToExerciseId, setDeferredToExerciseId] = useState('');

  useEffect(() => {
    if (open) {
      setStatus('ACTIVE');
      setDeferredToExerciseId('');
    }
  }, [open]);

  const exercisesQuery = useBudgetExercisesQuery({
    limit: 200,
    page: 1,
    status: 'ALL',
  });
  const exercises = exercisesQuery.data?.items ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      const body: { ids: string[]; status: string; deferredToExerciseId?: string | null } = {
        ids: lineIds,
        status,
      };
      if (status === 'DEFERRED') {
        body.deferredToExerciseId = deferredToExerciseId.trim();
      } else {
        body.deferredToExerciseId = null;
      }
      return bulkUpdateBudgetLineStatus(authFetch, body);
    },
    onSuccess: async (result) => {
      const nOk = result.updatedIds.length;
      const nFail = result.failed.length;
      if (nFail === 0) {
        toast.success(`${nOk} ligne(s) mise(s) à jour.`);
      } else {
        toast.message(`Partiel : ${nOk} réussite(s), ${nFail} échec(s).`, {
          description: result.failed.slice(0, 3).map((f) => `${f.id}: ${f.error}`).join('\n'),
        });
      }
      if (clientId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.budgetEnvelopeLinesAll(clientId),
          }),
          queryClient.invalidateQueries({
            queryKey: budgetQueryKeys.dashboardAll(clientId),
          }),
        ]);
      }
      onOpenChange(false);
    },
    onError: (err: ApiFormError) => {
      toast.error(err?.message ?? 'Échec du changement en masse.');
    },
  });

  const deferredInvalid = status === 'DEFERRED' && !deferredToExerciseId.trim();
  const canSubmit = lineIds.length > 0 && !deferredInvalid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Statut en masse ({lineIds.length} ligne(s))</DialogTitle>
          <DialogDescription>
            Toutes les lignes sélectionnées passent au statut choisi. En cas de transition interdite ou
            budget verrouillé, l’id est listé en échec sans annuler les autres.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nouveau statut</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? '')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_LINE_STATUS_EDIT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status === 'DEFERRED' && (
            <div className="space-y-1.5">
              <Label>Report vers l’exercice</Label>
              <Select
                value={deferredToExerciseId || undefined}
                onValueChange={(v) => setDeferredToExerciseId(v ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un exercice…" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {formatBudgetExerciseOptionLabel(ex)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? 'Application…' : 'Appliquer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
