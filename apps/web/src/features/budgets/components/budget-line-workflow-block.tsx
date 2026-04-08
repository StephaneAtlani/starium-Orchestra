'use client';

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BudgetLine } from '../types/budget-management.types';
import { BUDGET_LINE_STATUS_EDIT_OPTIONS } from '../constants/budget-line-status-options';
import { useBudgetExercisesQuery } from '../hooks/use-budget-exercises-query';
import { useInlineUpdateBudgetLine } from '../hooks/use-inline-update-budget-line';
import { formatBudgetExerciseOptionLabel } from '../lib/budget-exercise-option-label';

export function BudgetLineWorkflowBlock({
  line,
  canEdit,
}: {
  line: BudgetLine;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState(line.status);
  const [deferredToExerciseId, setDeferredToExerciseId] = useState(
    line.deferredToExerciseId ?? '',
  );
  const [statusChangeComment, setStatusChangeComment] = useState('');

  useEffect(() => {
    setStatus(line.status);
    setDeferredToExerciseId(line.deferredToExerciseId ?? '');
    setStatusChangeComment('');
  }, [line.id, line.status, line.deferredToExerciseId]);

  const exercisesQuery = useBudgetExercisesQuery({
    limit: 200,
    page: 1,
    status: 'ALL',
  });
  const exercises = exercisesQuery.data?.items ?? [];

  const update = useInlineUpdateBudgetLine(line.id, line.budgetId, { silentSuccess: true });

  const apply = () => {
    const comment = statusChangeComment.trim() || undefined;
    if (status === 'DEFERRED') {
      if (!deferredToExerciseId.trim()) return;
      update.mutate({
        status,
        deferredToExerciseId: deferredToExerciseId.trim(),
        ...(comment ? { statusChangeComment: comment } : {}),
      });
      return;
    }
    update.mutate({
      status,
      deferredToExerciseId: null,
      ...(comment ? { statusChangeComment: comment } : {}),
    });
  };

  const dirty =
    status !== line.status ||
    (status === 'DEFERRED' &&
      deferredToExerciseId.trim() !== (line.deferredToExerciseId ?? '').trim()) ||
    (status !== 'DEFERRED' && (line.deferredToExerciseId ?? null) !== null);

  const deferredInvalid = status === 'DEFERRED' && !deferredToExerciseId.trim();

  if (!canEdit) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="space-y-1.5">
        <Label htmlFor={`line-status-${line.id}`}>Statut</Label>
        <Select value={status} onValueChange={(v) => setStatus(v ?? '')}>
          <SelectTrigger id={`line-status-${line.id}`} className="max-w-md">
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
          <Label htmlFor={`line-deferred-${line.id}`}>Report vers l’exercice</Label>
          <Select
            value={deferredToExerciseId || undefined}
            onValueChange={(v) => setDeferredToExerciseId(v ?? '')}
          >
            <SelectTrigger id={`line-deferred-${line.id}`} className="max-w-md">
              <SelectValue placeholder="Choisir un exercice budgétaire…" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((ex) => (
                <SelectItem key={ex.id} value={ex.id}>
                  {formatBudgetExerciseOptionLabel(ex)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {line.deferredToExerciseName && line.status === 'DEFERRED' && (
            <p className="text-xs text-muted-foreground">
              Enregistré : {line.deferredToExerciseName}
              {line.deferredToExerciseCode ? ` (${line.deferredToExerciseCode})` : ''}
            </p>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`line-status-comment-${line.id}`}>
          Commentaire (optionnel, historique)
        </Label>
        <textarea
          id={`line-status-comment-${line.id}`}
          rows={2}
          value={statusChangeComment}
          onChange={(e) => setStatusChangeComment(e.target.value)}
          maxLength={2000}
          disabled={!dirty}
          placeholder={
            dirty
              ? 'Sera joint au changement de statut dans l’onglet Historique du budget.'
              : 'Modifiez le statut ci-dessus pour ajouter un commentaire.'
          }
          className="flex min-h-[56px] w-full max-w-md rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={apply}
        disabled={!dirty || update.isPending || deferredInvalid}
      >
        {update.isPending ? 'Enregistrement…' : 'Appliquer le statut'}
      </Button>
    </div>
  );
}
