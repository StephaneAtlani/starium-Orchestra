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

const KNOWN_EVENT_TYPES = [
  { value: 'COMMITMENT_REGISTERED', label: 'Commande / engagement (COMMITMENT_REGISTERED)' },
  { value: 'CONSUMPTION_REGISTERED', label: 'Facture / consommation (CONSUMPTION_REGISTERED)' },
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
      amount: 0,
      description: '',
    },
  });

  const eventType = watch('eventType') ?? '';
  const eventTypeSelectValue = useMemo(() => {
    return KNOWN_EVENT_TYPES.some((t) => t.value === eventType) ? eventType : '__custom__';
  }, [eventType]);

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: CreateFinancialEventValues) => {
    setSubmitError(null);
    try {
      await mutateAsync({
        budgetLineId: line.id,
        sourceType: 'MANUAL',
        eventType: values.eventType,
        amount: values.amount,
        currency: line.currency,
        eventDate: new Date(values.eventDate).toISOString(),
        label: values.label,
        description: values.description?.trim() ? values.description.trim() : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e as ApiFormError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Ajouter un événement</DialogTitle>
          </DialogHeader>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError.message}</AlertDescription>
            </Alert>
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
                <SelectValue placeholder="Sélectionner un type" />
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
                placeholder="Ex. ADJUSTMENT_REGISTERED"
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
            <Label htmlFor="event-amount">Montant ({line.currency})</Label>
            <Input
              id="event-amount"
              type="number"
              step="0.01"
              min={0}
              {...register('amount', { valueAsNumber: true })}
              aria-invalid={!!errors.amount}
              onFocus={(e) => {
                if (e.target.value === '0') setValue('amount', '' as unknown as number);
              }}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-description">Description (optionnel)</Label>
            <Input id="event-description" {...register('description')} aria-invalid={!!errors.description} />
          </div>

          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

