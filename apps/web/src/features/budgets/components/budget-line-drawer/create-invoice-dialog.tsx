'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { toast } from '@/lib/toast';
import { createInvoiceSchema, type CreateInvoiceValues } from '../../schemas/create-invoice.schema';
import type { ApiFormError } from '../../api/types';
import type { BudgetLine } from '../../types/budget-management.types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useCreateInvoice } from '@/features/procurement/hooks/use-create-invoice';
import { useQuickCreateSupplier } from '@/features/procurement/hooks/use-quick-create-supplier';
import { listSuppliers } from '@/features/procurement/api/procurement.api';
import { SupplierSearchCombobox } from '@/features/procurement/components/supplier-search-combobox';
import { prepareQuickCreateRequest } from '@/features/procurement/utils/prepare-quick-create-request';
import { usePurchaseOrdersByBudgetLine } from '@/features/procurement/hooks/use-purchase-orders-by-budget-line';
import type { PurchaseOrder } from '@/features/procurement/types/purchase-order.types';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  budgetId,
  line,
  initialPurchaseOrderId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  line: BudgetLine;
  /** Si défini à l’ouverture : présélectionne la commande et préremplit le formulaire (ex. depuis l’onglet Commandes). */
  initialPurchaseOrderId?: string | null;
}) {
  const [submitError, setSubmitError] = useState<ApiFormError | null>(null);
  const [lastEditedField, setLastEditedField] = useState<'ht' | 'ttc' | 'tax'>('ht');
  const [resolvedSupplier, setResolvedSupplier] = useState<{ id: string; name: string } | null>(null);
  const createInvoice = useCreateInvoice(budgetId, line.id);
  const quickCreateSupplier = useQuickCreateSupplier();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has } = usePermissions();
  const canCreateProcurement = has('procurement.create');
  const { defaultTaxRate } = useTaxDisplayMode();
  const baseTaxRate = line.taxRate ?? defaultTaxRate;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
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
      setResolvedSupplier(null);
      reset();
    }
  }, [open, reset]);

  const amountHtInput = watch('amountHtInput');
  const amountTtcInput = watch('amountTtcInput');
  const taxRateInput = watch('taxRateInput');
  const poQuery = usePurchaseOrdersByBudgetLine(line.id, open);

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const applyPurchaseOrderToForm = useCallback((po: PurchaseOrder) => {
    setValue('purchaseOrderId', po.id, { shouldValidate: true });
    setResolvedSupplier({ id: po.supplierId, name: po.supplier.name });
    setValue('supplierName', po.supplier.name, { shouldValidate: true });
    clearErrors('supplierName');
    const tax = po.taxRate ?? baseTaxRate ?? 0;
    setValue('taxRateInput', tax, { shouldValidate: true });
    const ht = Number(po.amountHt) || 0;
    setValue('amountHtInput', ht, { shouldValidate: true });
    setLastEditedField('ht');
    setValue('amountTtcInput', round2(ht * (1 + tax / 100)), { shouldValidate: true });
    const lineLabel = po.label?.trim();
    setValue(
      'label',
      lineLabel || po.reference?.trim() || 'Facture',
      { shouldValidate: true },
    );
  }, [baseTaxRate, clearErrors, setValue]);

  const appliedInitialPoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      appliedInitialPoRef.current = null;
      return;
    }
    if (!initialPurchaseOrderId) return;
    if (appliedInitialPoRef.current === initialPurchaseOrderId) return;
    const items = poQuery.data?.items;
    if (!items?.length) return;
    const po = items.find((p) => p.id === initialPurchaseOrderId);
    if (!po) return;
    appliedInitialPoRef.current = initialPurchaseOrderId;
    applyPurchaseOrderToForm(po);
  }, [open, initialPurchaseOrderId, poQuery.data?.items, applyPurchaseOrderToForm]);

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
    if (!canCreateProcurement) {
      setSubmitError({
        status: 403,
        message: "Tu n'as pas la permission 'procurement.create' pour créer une facture.",
      });
      return;
    }
    try {
      const supplierNameValue = values.supplierName.trim();
      let supplierId = resolvedSupplier?.id;
      if (!supplierId && activeClient?.id) {
        const searchRes = await listSuppliers(authFetch, {
          search: supplierNameValue,
          limit: 50,
          offset: 0,
        });
        const exactSupplier = searchRes.items.find(
          (s) => s.name.toLowerCase() === supplierNameValue.toLowerCase(),
        );
        supplierId = exactSupplier?.id;
      }
      if (!supplierId) {
        setError('supplierName', {
          type: 'manual',
          message: 'Fournisseur introuvable. Sélectionne un fournisseur existant ou crée-le.',
        });
        return;
      }

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

  const requestQuickCreate = (draftName: string) => {
    void (async () => {
      setSubmitError(null);
      const request = prepareQuickCreateRequest(draftName, canCreateProcurement);
      if (!request.ok) {
        if (request.error) setSubmitError(request.error);
        return;
      }
      try {
        const created = await quickCreateSupplier.mutateAsync({ name: request.name });
        setResolvedSupplier({ id: created.id, name: created.name });
        setValue('supplierName', created.name, { shouldValidate: true });
        clearErrors('supplierName');
        toast.success('Fournisseur créé.');
      } catch (e) {
        setSubmitError(e as ApiFormError);
      }
    })();
  };

  const validateSupplierOnBlur = async (rawValue: string) => {
    const supplierNameValue = rawValue.trim();
    if (!supplierNameValue) return;
    if (resolvedSupplier) return;
    if (!activeClient?.id) return;

    try {
      const searchRes = await listSuppliers(authFetch, {
        search: supplierNameValue,
        limit: 50,
        offset: 0,
      });
      const exactSupplier = searchRes.items.find(
        (s) => s.name.toLowerCase() === supplierNameValue.toLowerCase(),
      );
      if (exactSupplier) {
        setResolvedSupplier({ id: exactSupplier.id, name: exactSupplier.name });
        setValue('supplierName', exactSupplier.name, { shouldValidate: true });
        clearErrors('supplierName');
        return;
      }
      setError('supplierName', {
        type: 'manual',
        message: 'Fournisseur introuvable. Sélectionne un fournisseur existant ou crée-le.',
      });
    } catch {
      // On ne bloque pas brutalement le flux en cas d'erreur réseau,
      // la validation finale côté submit reste souveraine.
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto shadow-lg bg-background" showCloseButton>
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

          <div className="col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Label
                htmlFor="invoice-purchaseOrderId"
                className="shrink-0 text-sm font-medium sm:min-w-[11rem] sm:pt-0.5"
              >
                Commande (optionnel)
              </Label>
              <select
                id="invoice-purchaseOrderId"
                name="purchaseOrderId"
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                value={watch('purchaseOrderId') ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setValue('purchaseOrderId', id, { shouldValidate: true });
                  if (!id) return;
                  const po = (poQuery.data?.items ?? []).find((p) => p.id === id);
                  if (po) applyPurchaseOrderToForm(po);
                }}
              >
                <option value="">Aucune</option>
                {(poQuery.data?.items ?? []).map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.reference} - {po.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground sm:pl-[calc(11rem+0.75rem)]">
              En choisissant une commande, fournisseur, libellé, montants et TVA sont préremplis (tu peux les
              ajuster).
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice-supplierName">Fournisseur</Label>
            <div className="min-w-0 flex-1">
              <Controller
                name="supplierName"
                control={control}
                render={({ field }) => (
                  <SupplierSearchCombobox
                    id="invoice-supplierName"
                    name={field.name}
                    ref={field.ref}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    parentOpen={open}
                    disabled={createInvoice.isPending || quickCreateSupplier.isPending}
                    aria-invalid={!!errors.supplierName}
                    onManualInput={() => {
                      setResolvedSupplier(null);
                      clearErrors('supplierName');
                    }}
                    onSupplierPicked={(s) => {
                      setResolvedSupplier(s);
                      clearErrors('supplierName');
                    }}
                    hasSupplierSelection={resolvedSupplier != null}
                    onValidateOnBlur={validateSupplierOnBlur}
                    onRequestQuickCreate={(draftName) => requestQuickCreate(draftName)}
                  />
                )}
              />
            </div>
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
    </>
  );
}

