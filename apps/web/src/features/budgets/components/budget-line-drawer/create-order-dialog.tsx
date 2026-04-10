'use client';

import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';
import { createOrderSchema, type CreateOrderValues } from '../../schemas/create-order.schema';
import type { ApiFormError } from '../../api/types';
import type { BudgetLine } from '../../types/budget-management.types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useCreatePurchaseOrder } from '@/features/procurement/hooks/use-create-purchase-order';
import { useQuickCreateSupplier } from '@/features/procurement/hooks/use-quick-create-supplier';
import { listSuppliers } from '@/features/procurement/api/procurement.api';
import { SupplierSearchCombobox } from '@/features/procurement/components/supplier-search-combobox';
import { prepareQuickCreateRequest } from '@/features/procurement/utils/prepare-quick-create-request';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';

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
  const createOrder = useCreatePurchaseOrder(budgetId, line.id);
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
      const referenceValue = values.reference?.trim() ?? '';
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

      await createOrder.mutateAsync({
        supplierId,
        budgetLineId: line.id,
        ...(referenceValue
          ? { reference: referenceValue }
          : {}),
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

  const fieldLabel = 'text-sm font-medium text-foreground';
  const fieldHint = 'text-xs text-muted-foreground';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className={cn(
            'flex max-h-[min(90vh,820px)] w-full flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 shadow-lg',
            'sm:max-w-2xl',
          )}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="shrink-0 border-b border-border/60 bg-card/50 px-5 pb-4 pt-5 pr-14 sm:px-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="flex items-start gap-3 text-xl font-semibold tracking-tight">
                  <span
                    className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50 shadow-sm"
                    aria-hidden
                  >
                    <ShoppingCart className="size-5 text-foreground/85" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span>Nouvelle commande</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Ligne « {line.name} » · {line.currency}
                    </span>
                  </span>
                </DialogTitle>
                <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
                  Choisis un fournisseur, libellé et montants. La référence est générée automatiquement si tu
                  la laisses vide.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              {submitError && (
                <Alert variant="destructive" className="border-destructive/40">
                  <AlertDescription>{submitError.message}</AlertDescription>
                </Alert>
              )}

              <section
                className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
                aria-labelledby="order-section-supplier"
              >
                <h3
                  id="order-section-supplier"
                  className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Fournisseur
                </h3>
                <div className="grid gap-2">
                  <Label htmlFor="order-supplierName" className={fieldLabel}>
                    Recherche ou création
                  </Label>
                  <div className="min-w-0 flex-1">
                    <Controller
                      name="supplierName"
                      control={control}
                      render={({ field }) => (
                        <SupplierSearchCombobox
                          id="order-supplierName"
                          name={field.name}
                          ref={field.ref}
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          parentOpen={open}
                          disabled={createOrder.isPending || quickCreateSupplier.isPending}
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
              </section>

              <section
                className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
                aria-labelledby="order-section-detail"
              >
                <h3
                  id="order-section-detail"
                  className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Détail de la commande
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="order-reference" className={fieldLabel}>
                      Référence
                    </Label>
                    <p className={fieldHint}>Optionnel — sinon référence auto.</p>
                    <Input
                      id="order-reference"
                      placeholder="Ex. BC-2026-00042"
                      className="font-mono text-sm"
                      {...register('reference')}
                      aria-invalid={!!errors.reference}
                    />
                    {errors.reference && (
                      <p className="text-sm text-destructive">{errors.reference.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="order-eventDate" className={fieldLabel}>
                      Date de commande
                    </Label>
                    <Input
                      id="order-eventDate"
                      type="date"
                      {...register('eventDate')}
                      aria-invalid={!!errors.eventDate}
                    />
                    {errors.eventDate && (
                      <p className="text-sm text-destructive">{errors.eventDate.message}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  <Label htmlFor="order-label" className={fieldLabel}>
                    Libellé
                  </Label>
                  <Input
                    id="order-label"
                    placeholder="Objet court visible en liste"
                    {...register('label')}
                    aria-invalid={!!errors.label}
                  />
                  {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
                </div>
                <div className="mt-4 grid gap-2">
                  <Label htmlFor="order-description" className={fieldLabel}>
                    Description <span className="font-normal text-muted-foreground">(optionnel)</span>
                  </Label>
                  <Input
                    id="order-description"
                    placeholder="Précision interne, commentaire…"
                    {...register('description')}
                    aria-invalid={!!errors.description}
                  />
                </div>
              </section>

              <section
                className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5"
                aria-labelledby="order-section-amounts"
              >
                <h3
                  id="order-section-amounts"
                  className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Montants
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="order-amountHtInput" className={fieldLabel}>
                      HT ({line.currency})
                    </Label>
                    <Input
                      id="order-amountHtInput"
                      type="number"
                      step="0.01"
                      min={0}
                      className="tabular-nums"
                      {...register('amountHtInput', {
                        valueAsNumber: true,
                        onChange: () => setLastEditedField('ht'),
                      })}
                      aria-invalid={!!errors.amountHtInput}
                    />
                    {errors.amountHtInput && (
                      <p className="text-sm text-destructive">{errors.amountHtInput.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="order-taxRateInput" className={fieldLabel}>
                      TVA %
                    </Label>
                    <Input
                      id="order-taxRateInput"
                      type="number"
                      step="0.01"
                      min={0}
                      className="tabular-nums"
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
                    <Label htmlFor="order-amountTtcInput" className={fieldLabel}>
                      TTC ({line.currency})
                    </Label>
                    <Input
                      id="order-amountTtcInput"
                      type="number"
                      step="0.01"
                      min={0}
                      className="tabular-nums"
                      {...register('amountTtcInput', {
                        valueAsNumber: true,
                        onChange: () => setLastEditedField('ttc'),
                      })}
                      aria-invalid={!!errors.amountTtcInput}
                    />
                    {errors.amountTtcInput && (
                      <p className="text-sm text-destructive">{errors.amountTtcInput.message}</p>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Modifie HT, TTC ou TVA : les deux autres se recalculent selon le dernier champ saisi.
                </p>
              </section>
            </div>

            <div className="shrink-0 border-t border-border/60 bg-muted/25 px-5 py-4 sm:px-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createOrder.isPending || quickCreateSupplier.isPending}
                  className="min-w-[7rem] sm:min-w-[8rem]"
                >
                  {createOrder.isPending || quickCreateSupplier.isPending ? 'Création…' : 'Créer la commande'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

