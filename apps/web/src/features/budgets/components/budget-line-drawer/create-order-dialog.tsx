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
import { createOrderSchema, type CreateOrderValues } from '../../schemas/create-order.schema';
import type { ApiFormError } from '../../api/types';
import type { BudgetLine } from '../../types/budget-management.types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useCreatePurchaseOrder } from '@/features/procurement/hooks/use-create-purchase-order';
import { useQuickCreateSupplier } from '@/features/procurement/hooks/use-quick-create-supplier';
import { useSuppliersSearch } from '@/features/procurement/hooks/use-suppliers-search';

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
  const [lastEditedField, setLastEditedField] = useState<'ht' | 'ttc' | 'tax'>('ht');
  const createOrder = useCreatePurchaseOrder(budgetId, line.id);
  const quickCreateSupplier = useQuickCreateSupplier();
  const { defaultTaxRate } = useTaxDisplayMode();
  const baseTaxRate = line.taxRate ?? defaultTaxRate;

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
      supplierName: '',
      reference: '',
      eventDate: new Date().toISOString().slice(0, 10),
      label: '',
      amountHtInput: 0,
      amountTtcInput: 0,
      taxRateInput: baseTaxRate ?? 0,
      description: '',
    },
  });

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      reset();
    }
  }, [open, reset]);

  const amountHtInput = watch('amountHtInput');
  const amountTtcInput = watch('amountTtcInput');
  const taxRateInput = watch('taxRateInput');
  const supplierName = watch('supplierName');
  const supplierSearch = useSuppliersSearch(supplierName, open);

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

  const onSubmit = async (values: CreateOrderValues) => {
    setSubmitError(null);
    try {
      const exactSupplier = (supplierSearch.data?.items ?? []).find(
        (s) => s.name.toLowerCase() === values.supplierName.trim().toLowerCase(),
      );
      const supplierId =
        exactSupplier?.id ??
        (await quickCreateSupplier.mutateAsync({ name: values.supplierName.trim() }))
          .id;

      await createOrder.mutateAsync({
        supplierId,
        budgetLineId: line.id,
        reference: values.reference.trim(),
        label: values.label,
        amountHt: values.amountHtInput.toFixed(2),
        taxRate: values.taxRateInput.toFixed(2),
        orderDate: new Date(values.eventDate).toISOString(),
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
              <DialogTitle>Ajouter une commande</DialogTitle>
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
            <Label htmlFor="order-supplierName">Fournisseur</Label>
            <Input
              id="order-supplierName"
              list="order-suppliers"
              {...register('supplierName')}
              aria-invalid={!!errors.supplierName}
            />
            <datalist id="order-suppliers">
              {(supplierSearch.data?.items ?? []).map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
            {errors.supplierName && (
              <p className="text-sm text-destructive">{errors.supplierName.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="order-reference">Référence</Label>
            <Input
              id="order-reference"
              {...register('reference')}
              aria-invalid={!!errors.reference}
            />
            {errors.reference && (
              <p className="text-sm text-destructive">{errors.reference.message}</p>
            )}
          </div>

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
            <Label htmlFor="order-amountHtInput">Montant HT ({line.currency})</Label>
            <Input
              id="order-amountHtInput"
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
            <Label htmlFor="order-taxRateInput">TVA % (taxRate)</Label>
            <Input
              id="order-taxRateInput"
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
            <Label htmlFor="order-amountTtcInput">Montant TTC ({line.currency})</Label>
            <Input
              id="order-amountTtcInput"
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

          <div className="grid gap-2">
            <Label htmlFor="order-description">Description (optionnel)</Label>
            <Input id="order-description" {...register('description')} aria-invalid={!!errors.description} />
          </div>

          <div className="col-span-2">
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createOrder.isPending || quickCreateSupplier.isPending}
              >
                {createOrder.isPending || quickCreateSupplier.isPending ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

