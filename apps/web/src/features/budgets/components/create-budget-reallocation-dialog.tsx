'use client';

import { useId, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { createBudgetReallocation } from '@/features/budgets/api/budget-reallocations.api';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';
import { toast } from '@/lib/toast';

function formatLineLabel(line: BudgetLine): string {
  return `${line.name}${line.code ? ` (${line.code})` : ''}`;
}

function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CreateBudgetReallocationDialog({
  budgetId,
  lines,
  open,
  onOpenChange,
}: {
  budgetId: string;
  lines: BudgetLine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const eligibleLines = useMemo(
    () =>
      lines.filter((line) =>
        ['ACTIVE', 'PENDING_VALIDATION', 'CLOSED'].includes(line.status),
      ),
    [lines],
  );

  const [sourceLineId, setSourceLineId] = useState<string>('');
  const [targetLineId, setTargetLineId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sourceLine = eligibleLines.find((line) => line.id === sourceLineId) ?? null;
  const currency = sourceLine?.currency ?? lines[0]?.currency ?? 'EUR';

  const mutation = useMutation({
    mutationFn: () =>
      createBudgetReallocation(authFetch, {
        sourceLineId,
        targetLineId,
        amount: Number(amount),
        reason: reason.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success('Réaffectation enregistrée.');
      setSourceLineId('');
      setTargetLineId('');
      setAmount('');
      setReason('');
      setSubmitError(null);
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.reallocations(clientId, budgetId),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
        }),
      ]);
    },
    onError: (error: Error) => {
      setSubmitError(error.message || 'Réaffectation impossible.');
    },
  });

  const canSubmit =
    sourceLineId &&
    targetLineId &&
    sourceLineId !== targetLineId &&
    Number(amount) > 0 &&
    (!sourceLine || Number(amount) <= sourceLine.remainingAmount);

  return (
    <StariumModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (mutation.isPending) return;
        onOpenChange(nextOpen);
      }}
      title="Réaffecter du budget"
      description="Déplacez un montant disponible d’une ligne vers une autre ligne du même budget."
      icon={ArrowRightLeft}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
          >
            Réaffecter
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        {submitError ? (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="starium-form-grid starium-form-grid--2 grid gap-4 sm:grid-cols-2">
          <div className="starium-form-field space-y-2">
            <Label htmlFor={`${id}-source`}>Ligne source</Label>
            <Select value={sourceLineId} onValueChange={(value) => setSourceLineId(value ?? '')}>
              <SelectTrigger id={`${id}-source`} className="w-full">
                <SelectValue placeholder="Choisir une ligne source" />
              </SelectTrigger>
              <SelectContent>
                {eligibleLines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    {formatLineLabel(line)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceLine ? (
              <p className="text-xs text-muted-foreground">
                Reste disponible : {formatAmount(sourceLine.remainingAmount, sourceLine.currency)}
              </p>
            ) : null}
          </div>

          <div className="starium-form-field space-y-2">
            <Label htmlFor={`${id}-target`}>Ligne cible</Label>
            <Select value={targetLineId} onValueChange={(value) => setTargetLineId(value ?? '')}>
              <SelectTrigger id={`${id}-target`} className="w-full">
                <SelectValue placeholder="Choisir une ligne cible" />
              </SelectTrigger>
              <SelectContent>
                {eligibleLines
                  .filter((line) => line.id !== sourceLineId)
                  .map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      {formatLineLabel(line)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="starium-form-field space-y-2">
          <Label htmlFor={`${id}-amount`}>Montant</Label>
          <Input
            id={`${id}-amount`}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">Devise : {currency}</p>
        </div>

        <div className="starium-form-field space-y-2">
          <Label htmlFor={`${id}-reason`}>Motif</Label>
          <Input
            id={`${id}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Justification métier de la réaffectation"
          />
        </div>
      </div>
    </StariumModal>
  );
}
