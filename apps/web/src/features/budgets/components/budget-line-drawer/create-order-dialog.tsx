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
import { usePermissions } from '@/hooks/use-permissions';

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
  const [resolvedSupplier, setResolvedSupplier] = useState<{ id: string; name: string } | null>(null);
  const [isCreateSupplierDialogOpen, setIsCreateSupplierDialogOpen] = useState(false);
  const [supplierDraftName, setSupplierDraftName] = useState('');
  const createOrder = useCreatePurchaseOrder(budgetId, line.id);
  const quickCreateSupplier = useQuickCreateSupplier();
  const { has } = usePermissions();
  const canCreateProcurement = has('procurement.create');
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
      setResolvedSupplier(null);
      setIsCreateSupplierDialogOpen(false);
      setSupplierDraftName('');
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
    if (!canCreateProcurement) {
      setSubmitError({
        status: 403,
        message: "Tu n'as pas la permission 'procurement.create' pour créer une commande.",
      });
      return;
    }
    try {
      const supplierNameValue = values.supplierName.trim();
      const exactSupplier = (supplierSearch.data?.items ?? []).find(
        (s) => s.name.toLowerCase() === supplierNameValue.toLowerCase(),
      );
      const supplierId =
        resolvedSupplier?.id ??
        exactSupplier?.id ??
        (await quickCreateSupplier.mutateAsync({ name: supplierNameValue })).id;

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
            <div className="flex gap-2">
              <Input
                id="order-supplierName"
                list="order-suppliers"
                {...register('supplierName', {
                  onChange: () => setResolvedSupplier(null),
                })}
                aria-invalid={!!errors.supplierName}
              />
              <Button
                type="button"
                variant="outline"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!canCreateProcurement) {
                    setSubmitError({
                      status: 403,
                      message: "Tu n'as pas la permission 'procurement.create' pour créer un fournisseur.",
                    });
                    return;
                  }
                  setSupplierDraftName((watch('supplierName') ?? '').trim());
                  setIsCreateSupplierDialogOpen(true);
                }}
                disabled={createOrder.isPending || quickCreateSupplier.isPending}
                aria-label="Créer le fournisseur"
                title={
                  canCreateProcurement
                    ? 'Créer le fournisseur'
                    : "Permission manquante: procurement.create"
                }
              >
                +
              </Button>
            </div>
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

      <Dialog open={isCreateSupplierDialogOpen} onOpenChange={setIsCreateSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Créer un fournisseur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="order-create-supplier-name">Nom du fournisseur</Label>
            <Input
              id="order-create-supplier-name"
              value={supplierDraftName}
              onChange={(event) => setSupplierDraftName(event.target.value)}
              placeholder="Ex: ACME Services"
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsCreateSupplierDialogOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={!canCreateProcurement || !supplierDraftName.trim() || quickCreateSupplier.isPending}
              onClick={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                setSubmitError(null);
                if (!canCreateProcurement) {
                  setSubmitError({
                    status: 403,
                    message: "Tu n'as pas la permission 'procurement.create' pour créer un fournisseur.",
                  });
                  return;
                }
                try {
                  const name = supplierDraftName.trim();
                  if (!name) return;
                  const created = await quickCreateSupplier.mutateAsync({ name });
                  setResolvedSupplier({ id: created.id, name: created.name });
                  setValue('supplierName', created.name, { shouldValidate: true });
                  setIsCreateSupplierDialogOpen(false);
                } catch (e) {
                  setSubmitError(e as ApiFormError);
                }
              }}
            >
              {quickCreateSupplier.isPending ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

