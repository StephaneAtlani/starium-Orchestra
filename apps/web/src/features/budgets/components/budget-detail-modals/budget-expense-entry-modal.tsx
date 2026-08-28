'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ClipboardCheck, FileText, Receipt } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { createFinancialEvent } from '@/features/budgets/api/budget-line-financial.api';
import type { ApiFormError } from '@/features/budgets/api/types';
import { formatCurrency } from '@/features/budgets/lib/budget-formatters';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import type {
  BudgetEnvelope,
  BudgetLine,
} from '@/features/budgets/types/budget-management.types';

export type BudgetExpenseNature = 'engagement' | 'facture';

type BudgetExpenseEntryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName: string;
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
};

const NATURE_OPTIONS: Array<{
  value: BudgetExpenseNature;
  label: string;
  hint: string;
  icon: typeof ClipboardCheck;
  eventType: 'COMMITMENT_REGISTERED' | 'CONSUMPTION_REGISTERED';
}> = [
  {
    value: 'engagement',
    label: 'Engagement / commande',
    hint: 'Promesse non encore facturée',
    icon: ClipboardCheck,
    eventType: 'COMMITMENT_REGISTERED',
  },
  {
    value: 'facture',
    label: 'Consommé / Facture',
    hint: 'Facturé ou imputé sur la ligne',
    icon: FileText,
    eventType: 'CONSUMPTION_REGISTERED',
  },
];

function formatEnvelopeLabel(envelope: BudgetEnvelope): string {
  return envelope.code ? `${envelope.name} (${envelope.code})` : envelope.name;
}

function formatLineLabel(line: BudgetLine): string {
  return line.code ? `${line.name} (${line.code})` : line.name;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Modale unique « Saisir une dépense » — formulaire simple mockup :
 * nature (2 choix) · libellé · enveloppe · ligne · montant · date · aperçu impact.
 */
export function BudgetExpenseEntryModal({
  open,
  onOpenChange,
  budgetId,
  budgetName,
  envelopes,
  lines,
}: BudgetExpenseEntryModalProps) {
  const labelFieldId = useId();
  const envelopeFieldId = useId();
  const lineFieldId = useId();
  const amountFieldId = useId();
  const dateFieldId = useId();

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const [nature, setNature] = useState<BudgetExpenseNature>('engagement');
  const [label, setLabel] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');
  const [lineId, setLineId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [eventDate, setEventDate] = useState(todayInputValue);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNature('engagement');
    setLabel('');
    setEnvelopeId('');
    setLineId('');
    setAmountInput('');
    setEventDate(todayInputValue());
    setSubmitError(null);
  }, [open]);

  const sortedEnvelopes = useMemo(
    () =>
      [...envelopes].sort((a, b) =>
        formatEnvelopeLabel(a).localeCompare(formatEnvelopeLabel(b), 'fr-FR'),
      ),
    [envelopes],
  );

  const availableLines = useMemo(() => {
    const filtered = envelopeId
      ? lines.filter((line) => line.envelopeId === envelopeId)
      : lines;
    return [...filtered].sort((a, b) =>
      formatLineLabel(a).localeCompare(formatLineLabel(b), 'fr-FR'),
    );
  }, [lines, envelopeId]);

  const selectedLine = useMemo(
    () => availableLines.find((line) => line.id === lineId) ?? null,
    [availableLines, lineId],
  );

  const amount = useMemo(() => {
    const normalized = amountInput.replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [amountInput]);

  const impact = useMemo(() => {
    if (!selectedLine || amount == null) return null;
    const nextCommitted =
      nature === 'engagement'
        ? selectedLine.committedAmount + amount
        : selectedLine.committedAmount;
    const nextConsumed =
      nature === 'facture'
        ? selectedLine.consumedAmount + amount
        : selectedLine.consumedAmount;
    const nextRemaining = selectedLine.initialAmount - nextCommitted - nextConsumed;
    return {
      nextCommitted,
      nextConsumed,
      nextRemaining,
      withinBudget: nextRemaining >= 0,
    };
  }, [selectedLine, amount, nature]);

  const canSubmit =
    label.trim().length > 0 &&
    !!selectedLine &&
    amount != null &&
    !!eventDate;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedLine || amount == null) {
        throw new Error('Formulaire incomplet');
      }
      const option = NATURE_OPTIONS.find((item) => item.value === nature)!;
      return createFinancialEvent(authFetch, {
        budgetLineId: selectedLine.id,
        sourceType: 'MANUAL',
        eventType: option.eventType,
        currency: selectedLine.currency,
        eventDate: new Date(eventDate).toISOString(),
        label: label.trim(),
        amountHt: amount.toFixed(2),
        taxRate: (selectedLine.taxRate ?? 0).toFixed(2),
      });
    },
    onSuccess: async () => {
      toast.success(
        nature === 'engagement'
          ? 'Engagement enregistré.'
          : 'Consommation enregistrée.',
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.dashboardAll(clientId),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.monthlyBreakdownAll(clientId),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
        }),
        queryClient.invalidateQueries({
          queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
        }),
        selectedLine
          ? queryClient.invalidateQueries({
              queryKey: budgetQueryKeys.budgetLineDetail(clientId, selectedLine.id),
            })
          : Promise.resolve(),
      ]);
      onOpenChange(false);
    },
    onError: (err: ApiFormError | Error) => {
      setSubmitError(err.message || 'Enregistrement impossible.');
    },
  });

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Saisir une dépense"
      description={budgetName}
      icon={Receipt}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            form="budget-expense-entry-form"
            className="min-h-11 sm:min-h-9"
            disabled={!canSubmit || mutation.isPending}
          >
            <Check className="size-4" aria-hidden />
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <form
        id="budget-expense-entry-form"
        className="starium-form space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit || mutation.isPending) return;
          setSubmitError(null);
          mutation.mutate();
        }}
      >
        {submitError ? (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="starium-form-field space-y-2">
          <p className="starium-modal-seg-title">Nature de la saisie</p>
          <div
            className="grid gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Nature de la saisie"
          >
            {NATURE_OPTIONS.map((option) => {
              const selected = nature === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setNature(option.value)}
                  className={cn(
                    'flex min-h-11 items-start gap-3 rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)]'
                      : 'border-border/70 bg-card hover:bg-muted/30',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
                      selected
                        ? 'bg-[color:var(--brand-gold)]/20 text-[color:var(--brand-gold-700)]'
                        : 'bg-muted text-muted-foreground',
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="starium-form-field space-y-2">
          <Label htmlFor={labelFieldId}>
            Libellé <span className="text-destructive">*</span>
          </Label>
          <Input
            id={labelFieldId}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ex. : Commande prestation T3"
            autoComplete="off"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="starium-form-field space-y-2">
            <Label htmlFor={envelopeFieldId}>
              Enveloppe <span className="text-destructive">*</span>
            </Label>
            <Select
              value={envelopeId}
              onValueChange={(value) => {
                setEnvelopeId(value ?? '');
                setLineId('');
              }}
            >
              <SelectTrigger id={envelopeFieldId} className="w-full">
                <SelectValue placeholder="Choisir une enveloppe" />
              </SelectTrigger>
              <SelectContent>
                {sortedEnvelopes.map((envelope) => (
                  <SelectItem key={envelope.id} value={envelope.id}>
                    {formatEnvelopeLabel(envelope)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="starium-form-field space-y-2">
            <Label htmlFor={lineFieldId}>
              Ligne budgétaire <span className="text-destructive">*</span>
            </Label>
            <Select
              value={lineId}
              onValueChange={(value) => setLineId(value ?? '')}
              disabled={!envelopeId}
            >
              <SelectTrigger id={lineFieldId} className="w-full">
                <SelectValue
                  placeholder={
                    envelopeId
                      ? 'Choisir une ligne'
                      : 'Choisir d’abord une enveloppe'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableLines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    {formatLineLabel(line)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="starium-form-field space-y-2">
            <Label htmlFor={amountFieldId}>
              Montant HT <span className="text-destructive">*</span>
            </Label>
            <Input
              id={amountFieldId}
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div className="starium-form-field space-y-2">
            <Label htmlFor={dateFieldId}>
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id={dateFieldId}
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              required
            />
          </div>
        </div>

        {selectedLine && impact ? (
          <p
            className="rounded-[var(--radius-md)] border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Ligne{' '}
            <span className="font-semibold text-foreground">{selectedLine.name}</span>
            {' — '}
            budget {formatCurrency(selectedLine.initialAmount, selectedLine.currency)}.
            Après saisie : engagé{' '}
            {formatCurrency(impact.nextCommitted, selectedLine.currency)}
            {' · '}
            consommé {formatCurrency(impact.nextConsumed, selectedLine.currency)}.
            {' '}
            <span
              className={cn(
                'font-semibold',
                impact.withinBudget ? 'text-[color:var(--state-success)]' : 'text-destructive',
              )}
            >
              {impact.withinBudget ? 'Dans le budget.' : 'Hors budget.'}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choisissez une ligne et un montant pour voir l’impact sur le budget.
          </p>
        )}
      </form>
    </StariumModal>
  );
}

/** @deprecated Conservé pour compat tests / imports historiques — préférer `BudgetExpenseNature`. */
export type BudgetExpenseLaunchKind =
  | 'COMMITMENT_REGISTERED'
  | 'CONSUMPTION_REGISTERED'
  | 'INVOICE';
