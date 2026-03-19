'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createFinancialEventSchema, type CreateFinancialEventValues } from '../../schemas/create-financial-event.schema';
import type { ApiFormError } from '../../api/types';
import type { BudgetLine } from '../../types/budget-management.types';
import { useCreateFinancialEvent } from '../../hooks/use-create-financial-event';
import { formatFinancialEventType } from '../../lib/financial-event-labels';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';

const KNOWN_EVENT_TYPES = [
  { value: 'COMMITMENT_REGISTERED', label: 'Engagement' },
  { value: 'CONSUMPTION_REGISTERED', label: 'Consommation' },
] as const;

export function CreateFinancialEventDialog({
  open,
  onOpenChange,
  budgetId,
  line,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  line: BudgetLine;
}) {
  const [submitError, setSubmitError] = useState<ApiFormError | null>(null);
  const { mutateAsync, isPending } = useCreateFinancialEvent(budgetId, line.id);
  const { taxInputMode, defaultTaxRate } = useTaxDisplayMode();
  const baseTaxRate = line.taxRate ?? defaultTaxRate;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateFinancialEventValues>({
    resolver: zodResolver(createFinancialEventSchema),
    defaultValues: {
      eventType: KNOWN_EVENT_TYPES[0].value,
      eventDate: new Date().toISOString().slice(0, 10),
      label: '',
      inputMode: taxInputMode,
      amountInput: 0,
      taxRateInput: baseTaxRate ?? undefined,
      description: '',
    },
  });

  const eventType = watch('eventType') ?? '';
  const eventTypeSelectValue = useMemo(() => {
    return KNOWN_EVENT_TYPES.some((t) => t.value === eventType) ? eventType : '__custom__';
  }, [eventType]);

  const eventTypeLabel = useMemo(() => {
    if (!eventType) return '';
    const known = KNOWN_EVENT_TYPES.find((t) => t.value === eventType);
    if (known) return known.label;
    return formatFinancialEventType(eventType);
  }, [eventType]);

  const triggerLabel =
    eventTypeSelectValue === '__custom__'
      ? 'Autre…'
      : eventTypeLabel || '';

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    // On ré-aligne le mode de saisie sur la config client au moment où la modale s'ouvre.
    if (open && (taxInputMode === 'HT' || taxInputMode === 'TTC')) setValue('inputMode', taxInputMode);
  }, [open, setValue, taxInputMode]);

  const inputMode = watch('inputMode');
  const amountInput = watch('amountInput');
  const taxRateInput = watch('taxRateInput');

  const effectiveTaxRate = line.taxRate ?? defaultTaxRate;
  const selectedTaxRate = taxRateInput ?? effectiveTaxRate;
  const isTaxRateAvailable =
    selectedTaxRate !== null && selectedTaxRate !== undefined;

  useEffect(() => {
    // Préremplit `taxRateInput` dès que la TVA est disponible.
    if (!open) return;
    if (!isTaxRateAvailable) return;
    if (taxRateInput === undefined || taxRateInput === null) {
      setValue('taxRateInput', selectedTaxRate as number, {
        shouldValidate: true,
      });
    }
  }, [open, isTaxRateAvailable, setValue, taxRateInput, selectedTaxRate]);

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const indicative = useMemo(() => {
    if (!isTaxRateAvailable) return null;
    const taxRate = selectedTaxRate as number;
    if (inputMode === 'HT') {
      const taxAmount = round2((amountInput * taxRate) / 100);
      const amountTtc = round2(amountInput + taxAmount);
      return { taxAmount, amountTtc, amountHt: amountInput };
    }
    const amountHt = taxRate === 0 ? amountInput : round2(amountInput / (1 + taxRate / 100));
    const taxAmount = round2(amountInput - amountHt);
    return { taxAmount, amountHt, amountTtc: amountInput };
  }, [amountInput, inputMode, isTaxRateAvailable, selectedTaxRate]);

  const onSubmit = async (values: CreateFinancialEventValues) => {
    setSubmitError(null);
    try {
      if (!isTaxRateAvailable) {
        throw {
          message: 'TVA indisponible : définissez la TVA (lignes ou configuration client).',
        } as ApiFormError;
      }

      const budgetLineTaxRate = line.taxRate ?? null;
      const shouldUseDefaultTaxRate =
        budgetLineTaxRate === null && defaultTaxRate !== null && values.taxRateInput === undefined;

      const taxRateToUse =
        values.taxRateInput ?? budgetLineTaxRate ?? defaultTaxRate ?? null;

      if (taxRateToUse == null) {
        throw {
          message: 'TVA indisponible : définissez la TVA (lignes ou configuration client).',
        } as ApiFormError;
      }

      await mutateAsync({
        budgetLineId: line.id,
        sourceType: 'MANUAL',
        eventType: values.eventType,
        currency: line.currency,
        eventDate: new Date(values.eventDate).toISOString(),
        label: values.label,
        description: values.description?.trim() ? values.description.trim() : undefined,
        ...(values.inputMode === 'HT'
          ? {
              amountHt: values.amountInput.toFixed(2),
              ...(shouldUseDefaultTaxRate
                ? { useDefaultTaxRate: true }
                : { taxRate: taxRateToUse.toFixed(2) }),
            }
          : {
              amountTtc: values.amountInput.toFixed(2),
              ...(shouldUseDefaultTaxRate
                ? { useDefaultTaxRate: true }
                : { taxRate: taxRateToUse.toFixed(2) }),
            }),
      });
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e as ApiFormError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <DialogHeader>
              <DialogTitle>Ajouter un événement</DialogTitle>
            </DialogHeader>
          </div>

          {submitError && (
            <div className="col-span-2">
              <Alert variant="destructive">
                <AlertDescription>{submitError.message}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Type d’événement</Label>
            <Select
              value={eventTypeSelectValue}
              onValueChange={(v) => {
                if (v === '__custom__') {
                  setValue('eventType', '');
                } else {
                  setValue('eventType', v ?? '');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type">
                  {triggerLabel || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {KNOWN_EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Autre…</SelectItem>
              </SelectContent>
            </Select>
            {eventTypeSelectValue === '__custom__' && (
              <Input
                placeholder="Type personnalisé"
                {...register('eventType')}
                aria-invalid={!!errors.eventType}
              />
            )}
            {errors.eventType && <p className="text-sm text-destructive">{errors.eventType.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-eventDate">Date</Label>
            <Input id="event-eventDate" type="date" {...register('eventDate')} aria-invalid={!!errors.eventDate} />
            {errors.eventDate && <p className="text-sm text-destructive">{errors.eventDate.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-label">Libellé</Label>
            <Input id="event-label" {...register('label')} aria-invalid={!!errors.label} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label>Mode de saisie</Label>
            <Select value={inputMode} onValueChange={(v) => setValue('inputMode', v as CreateFinancialEventValues['inputMode'])}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le mode de saisie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HT">Saisie HT</SelectItem>
                <SelectItem value="TTC">Saisie TTC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-amount">
              Montant {inputMode === 'HT' ? `(HT) (${line.currency})` : `(TTC) (${line.currency})`}
            </Label>
            <Input
              id="event-amount"
              type="number"
              step="0.01"
              min={0}
              {...register('amountInput', { valueAsNumber: true })}
              aria-invalid={!!errors.amountInput}
            />
            {errors.amountInput && <p className="text-sm text-destructive">{errors.amountInput.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-taxRateInput">TVA % (taxRate)</Label>
            <Input
              id="event-taxRateInput"
              type="number"
              step="0.01"
              min={0}
              {...register('taxRateInput', {
                setValueAs: (v) => (v === '' || v === undefined ? undefined : Number(v)),
              })}
              aria-invalid={!!errors.taxRateInput}
            />
            {errors.taxRateInput && (
              <p className="text-sm text-destructive">{errors.taxRateInput.message}</p>
            )}
          </div>

          <div className="grid gap-2 col-span-2">
            <Label htmlFor="event-description">Description (optionnel)</Label>
            <Input id="event-description" {...register('description')} aria-invalid={!!errors.description} />
          </div>

          <div className="grid gap-2 col-span-2">
            <Label>Champs dérivés (indicatifs)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label>Montant HT (calculé)</Label>
                <Input value={indicative ? indicative.amountHt.toFixed(2) : ''} disabled />
              </div>
              <div className="grid gap-1">
                <Label>TVA montant (calculée)</Label>
                <Input value={indicative ? indicative.taxAmount.toFixed(2) : ''} disabled />
              </div>
              <div className="grid gap-1 col-span-2">
                <Label>Montant TTC (calculé)</Label>
                <Input value={indicative ? indicative.amountTtc.toFixed(2) : ''} disabled />
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending || !isTaxRateAvailable}>
                {isPending ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

