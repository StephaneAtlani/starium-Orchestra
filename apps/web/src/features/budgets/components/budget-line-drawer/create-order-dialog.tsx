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
import { createOrderSchema, type CreateOrderValues } from '../../schemas/create-order.schema';
import type { ApiFormError } from '../../api/types';
import type { BudgetLine } from '../../types/budget-management.types';
import { useCreateFinancialEvent } from '../../hooks/use-create-financial-event';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';

export function CreateOrderDialog({
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateOrderValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      eventDate: new Date().toISOString().slice(0, 10),
      label: '',
      inputMode: taxInputMode,
      amountInput: 0,
      description: '',
    },
  });

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (open && (taxInputMode === 'HT' || taxInputMode === 'TTC')) setValue('inputMode', taxInputMode);
  }, [open, setValue, taxInputMode]);

  const inputMode = watch('inputMode');
  const amountInput = watch('amountInput');

  const effectiveTaxRate = line.taxRate ?? defaultTaxRate;
  const isTaxRateAvailable = effectiveTaxRate !== null && effectiveTaxRate !== undefined;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const indicative = useMemo(() => {
    if (!isTaxRateAvailable) return null;
    const taxRate = effectiveTaxRate as number;
    if (inputMode === 'HT') {
      const taxAmount = round2((amountInput * taxRate) / 100);
      const amountTtc = round2(amountInput + taxAmount);
      return { taxAmount, amountTtc, amountHt: amountInput };
    }
    const amountHt = taxRate === 0 ? amountInput : round2(amountInput / (1 + taxRate / 100));
    const taxAmount = round2(amountInput - amountHt);
    return { taxAmount, amountHt, amountTtc: amountInput };
  }, [amountInput, effectiveTaxRate, inputMode, isTaxRateAvailable]);

  const onSubmit = async (values: CreateOrderValues) => {
    setSubmitError(null);
    try {
      if (!isTaxRateAvailable) {
        throw {
          message: 'TVA indisponible : définissez la TVA (lignes ou configuration client).',
        } as ApiFormError;
      }

      const budgetLineTaxRate = line.taxRate ?? null;
      const shouldUseDefaultTaxRate = budgetLineTaxRate === null && defaultTaxRate !== null;

      await mutateAsync({
        budgetLineId: line.id,
        sourceType: 'MANUAL',
        eventType: 'COMMITMENT_REGISTERED',
        currency: line.currency,
        eventDate: new Date(values.eventDate).toISOString(),
        label: values.label,
        description: values.description?.trim() ? values.description.trim() : undefined,
        ...(values.inputMode === 'HT'
          ? {
              amountHt: values.amountInput.toFixed(2),
              ...(shouldUseDefaultTaxRate
                ? { useDefaultTaxRate: true }
                : { taxRate: (budgetLineTaxRate ?? defaultTaxRate)!.toFixed(2) }),
            }
          : {
              amountTtc: values.amountInput.toFixed(2),
              ...(shouldUseDefaultTaxRate
                ? { useDefaultTaxRate: true }
                : { taxRate: (budgetLineTaxRate ?? defaultTaxRate)!.toFixed(2) }),
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Ajouter une commande</DialogTitle>
          </DialogHeader>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="order-eventDate">Date</Label>
            <Input id="order-eventDate" type="date" {...register('eventDate')} aria-invalid={!!errors.eventDate} />
            {errors.eventDate && <p className="text-sm text-destructive">{errors.eventDate.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="order-label">Libellé</Label>
            <Input id="order-label" {...register('label')} aria-invalid={!!errors.label} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label>Mode de saisie</Label>
            <Select value={inputMode} onValueChange={(v) => setValue('inputMode', v as CreateOrderValues['inputMode'])}>
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
            <Label htmlFor="order-amount">
              Montant {inputMode === 'HT' ? `(HT) (${line.currency})` : `(TTC) (${line.currency})`}
            </Label>
            <Input
              id="order-amount"
              type="number"
              step="0.01"
              min={0}
              {...register('amountInput', { valueAsNumber: true })}
              aria-invalid={!!errors.amountInput}
            />
            {errors.amountInput && <p className="text-sm text-destructive">{errors.amountInput.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="order-description">Description (optionnel)</Label>
            <Input id="order-description" {...register('description')} aria-invalid={!!errors.description} />
          </div>

          {!isTaxRateAvailable && (
            <Alert variant="destructive">
              <AlertDescription>Impossible de recalculer TVA : aucune TVA connue sur la ligne ni pour le client.</AlertDescription>
            </Alert>
          )}

          {isTaxRateAvailable && indicative && (
            <div className="grid gap-2">
              <Label>Champs dérivés (indicatifs)</Label>
              {inputMode === 'HT' ? (
                <>
                  <div className="grid gap-1">
                    <Label>TVA (calculée)</Label>
                    <Input value={indicative.taxAmount.toFixed(2)} disabled />
                  </div>
                  <div className="grid gap-1">
                    <Label>Montant TTC (calculé)</Label>
                    <Input value={indicative.amountTtc.toFixed(2)} disabled />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-1">
                    <Label>TVA (calculée)</Label>
                    <Input value={indicative.taxAmount.toFixed(2)} disabled />
                  </div>
                  <div className="grid gap-1">
                    <Label>Montant HT (calculé)</Label>
                    <Input value={indicative.amountHt.toFixed(2)} disabled />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !isTaxRateAvailable}>
              {isPending ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

