'use client';

import React, { useEffect, useState } from 'react';
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
import { createInvoiceSchema, type CreateInvoiceValues } from '../../schemas/create-invoice.schema';
import type { ApiFormError } from '../../api/types';
import type { BudgetLine } from '../../types/budget-management.types';
import { useCreateFinancialEvent } from '../../hooks/use-create-financial-event';

export function CreateInvoiceDialog({
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
    formState: { errors },
  } = useForm<CreateInvoiceValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      eventDate: new Date().toISOString().slice(0, 10),
      label: '',
      amount: 0,
      description: '',
    },
  });

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: CreateInvoiceValues) => {
    setSubmitError(null);
    try {
      await mutateAsync({
        budgetLineId: line.id,
        sourceType: 'MANUAL',
        eventType: 'CONSUMPTION_REGISTERED',
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
            <DialogTitle>Ajouter une facture</DialogTitle>
          </DialogHeader>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="invoice-eventDate">Date</Label>
            <Input id="invoice-eventDate" type="date" {...register('eventDate')} aria-invalid={!!errors.eventDate} />
            {errors.eventDate && <p className="text-sm text-destructive">{errors.eventDate.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice-label">Libellé</Label>
            <Input id="invoice-label" {...register('label')} aria-invalid={!!errors.label} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice-amount">Montant ({line.currency})</Label>
            <Input
              id="invoice-amount"
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
            <Label htmlFor="invoice-description">Description (optionnel)</Label>
            <Input id="invoice-description" {...register('description')} aria-invalid={!!errors.description} />
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

