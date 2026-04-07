'use client';

import React, { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import { BUDGET_ENVELOPE_STATUS_EDIT_OPTIONS } from '../constants/budget-envelope-status-options';
import { useBudgetExercisesQuery } from '../hooks/use-budget-exercises-query';
import { usePatchBudgetEnvelope } from '../hooks/use-patch-budget-envelope';
import { formatBudgetExerciseOptionLabel } from '../lib/budget-exercise-option-label';

export function BudgetEnvelopeWorkflowCard({
  envelope,
}: {
  envelope: BudgetEnvelopeDetail;
}) {
  const { has, isLoading: permLoading } = usePermissions();
  const canEdit = !permLoading && has('budgets.update');

  const [status, setStatus] = useState(envelope.status);
  const [deferredToExerciseId, setDeferredToExerciseId] = useState(
    envelope.deferredToExerciseId ?? '',
  );

  useEffect(() => {
    setStatus(envelope.status);
    setDeferredToExerciseId(envelope.deferredToExerciseId ?? '');
  }, [envelope.id, envelope.status, envelope.deferredToExerciseId]);

  const exercisesQuery = useBudgetExercisesQuery({
    limit: 200,
    page: 1,
    status: 'ALL',
  });
  const exercises = exercisesQuery.data?.items ?? [];

  const patch = usePatchBudgetEnvelope(envelope.id, envelope.budgetId, { silentSuccess: true });

  const apply = () => {
    if (status === 'DEFERRED') {
      if (!deferredToExerciseId.trim()) return;
      patch.mutate({
        status,
        deferredToExerciseId: deferredToExerciseId.trim(),
      });
      return;
    }
    patch.mutate({ status, deferredToExerciseId: null });
  };

  const dirty =
    status !== envelope.status ||
    (status === 'DEFERRED' &&
      deferredToExerciseId.trim() !== (envelope.deferredToExerciseId ?? '').trim()) ||
    (status !== 'DEFERRED' && (envelope.deferredToExerciseId ?? null) !== null);

  const deferredInvalid = status === 'DEFERRED' && !deferredToExerciseId.trim();

  if (!canEdit) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1.5">
          <Label htmlFor={`env-status-${envelope.id}`}>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? '')}>
            <SelectTrigger id={`env-status-${envelope.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_ENVELOPE_STATUS_EDIT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {status === 'DEFERRED' && (
          <div className="space-y-1.5">
            <Label htmlFor={`env-deferred-${envelope.id}`}>Report vers l’exercice</Label>
            <Select
              value={deferredToExerciseId || undefined}
              onValueChange={(v) => setDeferredToExerciseId(v ?? '')}
            >
              <SelectTrigger id={`env-deferred-${envelope.id}`}>
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
        <Button
          type="button"
          size="sm"
          onClick={apply}
          disabled={!dirty || patch.isPending || deferredInvalid}
        >
          {patch.isPending ? 'Enregistrement…' : 'Appliquer'}
        </Button>
      </CardContent>
    </Card>
  );
}
