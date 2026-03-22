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
  initialEventType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  line: BudgetLine;
  initialEventType?: 'COMMITMENT_REGISTERED' | 'CONSUMPTION_REGISTERED';
}) {
  const [submitError, setSubmitError] = useState<ApiFormError | null>(null);
  const [lastEditedField, setLastEditedField] = useState<'ht' | 'ttc' | 'tax'>('ht');
  const { mutateAsync, isPending } = useCreateFinancialEvent(budgetId, line.id);
  const { defaultTaxRate } = useTaxDisplayMode();
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
      eventType: initialEventType ?? KNOWN_EVENT_TYPES[0].value,
      eventDate: new Date().toISOString().slice(0, 10),
      label: '',
      amountHtInput: 0,
      amountTtcInput: 0,
      taxRateInput: baseTaxRate ?? 0,
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

  const amountHtInput = watch('amountHtInput');
  const amountTtcInput = watch('amountTtcInput');
  const taxRateInput = watch('taxRateInput');

  const round2 = (n: number) => Math.round(n * 100) / 100;

  useEffect(() => {
    if (!open) return;
    const rate = taxRateInput ?? 0;
    if (lastEditedField === 'ttc') {
      const nextHt = rate === 0 ? amountTtcInput : round2(amountTtcInput / (1 + rate / 100));
      if (Math.abs((amountHtInput ?? 0) - nextHt) > 0.004) {
        setValue('amountHtInput', nextHt, { shouldValidate: true });
      }
      return;
    }
    const nextTtc = round2((amountHtInput ?? 0) * (1 + rate / 100));
    if (Math.abs((amountTtcInput ?? 0) - nextTtc) > 0.004) {
      setValue('amountTtcInput', nextTtc, { shouldValidate: true });
    }
  }, [open, amountHtInput, amountTtcInput, taxRateInput, lastEditedField, setValue]);

  const onSubmit = async (values: CreateFinancialEventValues) => {
    setSubmitError(null);
    try {
      await mutateAsync({
        budgetLineId: line.id,
        sourceType: 'MANUAL',
        eventType: values.eventType,
        currency: line.currency,
        eventDate: new Date(values.eventDate).toISOString(),
        label: values.label,
        description: values.description?.trim() ? values.description.trim() : undefined,
        amountHt: values.amountHtInput.toFixed(2),
        taxRate: values.taxRateInput.toFixed(2),
      });
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e as ApiFormError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto shadow-lg bg-white" showCloseButton>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <DialogHeader>
              <DialogTitle>
                {initialEventType === 'COMMITMENT_REGISTERED'
                  ? 'Ajouter un engagement'
                  : initialEventType === 'CONSUMPTION_REGISTERED'
                    ? 'Ajouter une consommation'
                    : 'Ajouter un événement'}
              </DialogTitle>
            </DialogHeader>
          </div>

          {submitError && (
            <div className="col-span-2">
              <Alert variant="destructive">
                <AlertDescription>{submitError.message}</AlertDescription>
              </Alert>
            </div>
          )}

          {!initialEventType && (
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
          )}

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
            <Label htmlFor="event-amountHtInput">Montant HT ({line.currency})</Label>
            <Input
              id="event-amountHtInput"
              type="number"
              step="0.01"
              min={0}
              {...register('amountHtInput', {
                valueAsNumber: true,
                onChange: () => setLastEditedField('ht'),
              })}
              aria-invalid={!!errors.amountHtInput}
            />
            {errors.amountHtInput && <p className="text-sm text-destructive">{errors.amountHtInput.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-taxRateInput">TVA % (taxRate)</Label>
            <Input
              id="event-taxRateInput"
              type="number"
              step="0.01"
              min={0}
              {...register('taxRateInput', {
                valueAsNumber: true,
                onChange: () => setLastEditedField('tax'),
              })}
              aria-invalid={!!errors.taxRateInput}
            />
            {errors.taxRateInput && (
              <p className="text-sm text-destructive">{errors.taxRateInput.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-amountTtcInput">Montant TTC ({line.currency})</Label>
            <Input
              id="event-amountTtcInput"
              type="number"
              step="0.01"
              min={0}
              {...register('amountTtcInput', {
                valueAsNumber: true,
                onChange: () => setLastEditedField('ttc'),
              })}
              aria-invalid={!!errors.amountTtcInput}
            />
            {errors.amountTtcInput && <p className="text-sm text-destructive">{errors.amountTtcInput.message}</p>}
          </div>

          <div className="grid gap-2 col-span-2">
            <Label htmlFor="event-description">Description (optionnel)</Label>
            <Input id="event-description" {...register('description')} aria-invalid={!!errors.description} />
          </div>

          <div className="col-span-2">
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

