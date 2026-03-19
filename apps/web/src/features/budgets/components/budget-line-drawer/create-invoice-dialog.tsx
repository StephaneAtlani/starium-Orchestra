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
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useCreateInvoice } from '@/features/procurement/hooks/use-create-invoice';
import { useQuickCreateSupplier } from '@/features/procurement/hooks/use-quick-create-supplier';
import { useSuppliersSearch } from '@/features/procurement/hooks/use-suppliers-search';
import { usePurchaseOrdersByBudgetLine } from '@/features/procurement/hooks/use-purchase-orders-by-budget-line';

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
  const [lastEditedField, setLastEditedField] = useState<'ht' | 'ttc' | 'tax'>('ht');
  const createInvoice = useCreateInvoice(budgetId, line.id);
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
  } = useForm<CreateInvoiceValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      supplierName: '',
      invoiceNumber: '',
      purchaseOrderId: '',
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
  const poQuery = usePurchaseOrdersByBudgetLine(line.id, open);

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

  const onSubmit = async (values: CreateInvoiceValues) => {
    setSubmitError(null);
    try {
      const exactSupplier = (supplierSearch.data?.items ?? []).find(
        (s) => s.name.toLowerCase() === values.supplierName.trim().toLowerCase(),
      );
      const supplierId =
        exactSupplier?.id ??
        (await quickCreateSupplier.mutateAsync({ name: values.supplierName.trim() }))
          .id;

      await createInvoice.mutateAsync({
        supplierId,
        budgetLineId: line.id,
        purchaseOrderId: values.purchaseOrderId?.trim() || undefined,
        invoiceNumber: values.invoiceNumber.trim(),
        label: values.label,
        amountHt: values.amountHtInput.toFixed(2),
        taxRate: values.taxRateInput.toFixed(2),
        invoiceDate: new Date(values.eventDate).toISOString(),
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
              <DialogTitle>Ajouter une facture</DialogTitle>
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
            <Label htmlFor="invoice-supplierName">Fournisseur</Label>
            <Input
              id="invoice-supplierName"
              list="invoice-suppliers"
              {...register('supplierName')}
              aria-invalid={!!errors.supplierName}
            />
            <datalist id="invoice-suppliers">
              {(supplierSearch.data?.items ?? []).map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
            {errors.supplierName && (
              <p className="text-sm text-destructive">{errors.supplierName.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice-invoiceNumber">Numero facture</Label>
            <Input
              id="invoice-invoiceNumber"
              {...register('invoiceNumber')}
              aria-invalid={!!errors.invoiceNumber}
            />
            {errors.invoiceNumber && (
              <p className="text-sm text-destructive">{errors.invoiceNumber.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice-purchaseOrderId">Commande (optionnel)</Label>
            <select
              id="invoice-purchaseOrderId"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              {...register('purchaseOrderId')}
            >
              <option value="">Aucune</option>
              {(poQuery.data?.items ?? []).map((po) => (
                <option key={po.id} value={po.id}>
                  {po.reference} - {po.label}
                </option>
              ))}
            </select>
          </div>

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
            <Label htmlFor="invoice-amountHtInput">Montant HT ({line.currency})</Label>
            <Input
              id="invoice-amountHtInput"
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
            <Label htmlFor="invoice-taxRateInput">TVA % (taxRate)</Label>
            <Input
              id="invoice-taxRateInput"
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
            <Label htmlFor="invoice-amountTtcInput">Montant TTC ({line.currency})</Label>
            <Input
              id="invoice-amountTtcInput"
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
            <Label htmlFor="invoice-description">Description (optionnel)</Label>
            <Input id="invoice-description" {...register('description')} aria-invalid={!!errors.description} />
          </div>

          <div className="col-span-2">
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createInvoice.isPending || quickCreateSupplier.isPending}
              >
                {createInvoice.isPending || quickCreateSupplier.isPending
                  ? 'Création…'
                  : 'Créer'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

