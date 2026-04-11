'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';
import { createInvoiceSchema, type CreateInvoiceValues } from '@/features/budgets/schemas/create-invoice.schema';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useCreateInvoiceStandalone } from '../hooks/use-procurement-entity-mutations';
import { useQuickCreateSupplier } from '../hooks/use-quick-create-supplier';
import { listPurchaseOrders, listSuppliers } from '../api/procurement.api';
import { SupplierSearchCombobox } from './supplier-search-combobox';
import { prepareQuickCreateRequest } from '../utils/prepare-quick-create-request';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import type { PurchaseOrder } from '../types/purchase-order.types';

export function CreateStandaloneInvoiceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<ApiFormError | null>(null);
  const [lastEditedField, setLastEditedField] = useState<'ht' | 'ttc' | 'tax'>('ht');
  const [resolvedSupplier, setResolvedSupplier] = useState<{ id: string; name: string } | null>(null);
  const createInvoice = useCreateInvoiceStandalone();
  const quickCreateSupplier = useQuickCreateSupplier();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canCreateProcurement = has('procurement.create');
  const { defaultTaxRate } = useTaxDisplayMode();
  const baseTaxRate = defaultTaxRate ?? 0;

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
      taxRateInput: baseTaxRate,
      description: '',
    },
  });

  const poOptionsQuery = useQuery({
    queryKey: ['procurement', clientId, 'purchase-orders', 'supplier-options', resolvedSupplier?.id ?? ''],
    queryFn: () =>
      listPurchaseOrders(authFetch, {
        supplierId: resolvedSupplier!.id,
        limit: 100,
        offset: 0,
        includeCancelled: false,
      }),
    enabled: open && Boolean(clientId && resolvedSupplier?.id),
  });

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      setResolvedSupplier(null);
      reset({
        supplierName: '',
        invoiceNumber: '',
        purchaseOrderId: '',
        eventDate: new Date().toISOString().slice(0, 10),
        label: '',
        amountHtInput: 0,
        amountTtcInput: 0,
        taxRateInput: baseTaxRate,
        description: '',
      });
    }
  }, [open, reset, baseTaxRate]);

  const amountHtInput = watch('amountHtInput');
  const amountTtcInput = watch('amountTtcInput');
  const taxRateInput = watch('taxRateInput');
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const applyPurchaseOrderToForm = useCallback(
    (po: PurchaseOrder) => {
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
      setValue('label', lineLabel || po.reference?.trim() || 'Facture', { shouldValidate: true });
    },
    [baseTaxRate, clearErrors, setValue],
  );

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

      const created = await createInvoice.mutateAsync({
        supplierId,
        purchaseOrderId: values.purchaseOrderId?.trim() || undefined,
        invoiceNumber: values.invoiceNumber.trim(),
        label: values.label,
        amountHt: values.amountHtInput.toFixed(2),
        taxRate: values.taxRateInput.toFixed(2),
        invoiceDate: new Date(values.eventDate).toISOString(),
      });
      onOpenChange(false);
      toast.success('Facture créée. Tu peux ajouter des pièces jointes sur la fiche.');
      router.push(`/suppliers/invoices/${created.id}?documents=1`);
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
        setValue('purchaseOrderId', '', { shouldValidate: true });
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
      // ignore
    }
  };

  const fieldLabel = 'text-sm font-medium text-foreground';
  const fieldHint = 'text-xs text-muted-foreground';
  const poItems = poOptionsQuery.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(90vh,820px)] w-full flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 shadow-lg',
          'sm:max-w-2xl',
        )}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border/60 bg-card/50 px-5 pb-4 pt-5 pr-14 sm:px-6">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="flex items-start gap-3 text-xl font-semibold tracking-tight">
                <span
                  className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50 shadow-sm"
                  aria-hidden
                >
                  <FileText className="size-5 text-foreground/85" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span>Nouvelle facture</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Hors ligne budgétaire — consommation enregistrée seulement si liée à une ligne (ex. via
                    commande).
                  </span>
                </span>
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
                Après création, redirection vers la fiche pour ajouter des documents (GED).
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {submitError && (
              <Alert variant="destructive" className="border-destructive/40">
                <AlertDescription>{submitError.message}</AlertDescription>
              </Alert>
            )}

            <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fournisseur
              </h3>
              <div className="grid gap-2">
                <Label htmlFor="standalone-inv-supplier" className={fieldLabel}>
                  Recherche ou création
                </Label>
                <Controller
                  name="supplierName"
                  control={control}
                  render={({ field }) => (
                    <SupplierSearchCombobox
                      id="standalone-inv-supplier"
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
                        setValue('purchaseOrderId', '', { shouldValidate: true });
                        clearErrors('supplierName');
                      }}
                      onSupplierPicked={(s) => {
                        setResolvedSupplier(s);
                        setValue('purchaseOrderId', '', { shouldValidate: true });
                        clearErrors('supplierName');
                      }}
                      hasSupplierSelection={resolvedSupplier != null}
                      onValidateOnBlur={validateSupplierOnBlur}
                      onRequestQuickCreate={(draftName) => requestQuickCreate(draftName)}
                    />
                  )}
                />
                {errors.supplierName && (
                  <p className="text-sm text-destructive">{errors.supplierName.message}</p>
                )}
              </div>
            </section>

            {resolvedSupplier && (
              <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Commande (optionnel)
                </h3>
                <div className="grid gap-2">
                  <Label htmlFor="standalone-inv-po" className={fieldLabel}>
                    Lier à une commande du fournisseur
                  </Label>
                  <p className={fieldHint}>
                    Préremplit montants et TVA ; la ligne budget de la commande sera réutilisée côté API si
                    présente.
                  </p>
                  <select
                    id="standalone-inv-po"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={watch('purchaseOrderId') ?? ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      setValue('purchaseOrderId', id, { shouldValidate: true });
                      if (!id) return;
                      const po = poItems.find((p) => p.id === id);
                      if (po) applyPurchaseOrderToForm(po);
                    }}
                  >
                    <option value="">Aucune</option>
                    {poItems.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.reference} — {po.label}
                      </option>
                    ))}
                  </select>
                  {poOptionsQuery.isLoading && (
                    <p className="text-xs text-muted-foreground">Chargement des commandes…</p>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Détail
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="standalone-inv-num" className={fieldLabel}>
                    Numéro de facture
                  </Label>
                  <Input id="standalone-inv-num" className="font-mono text-sm" {...register('invoiceNumber')} />
                  {errors.invoiceNumber && (
                    <p className="text-sm text-destructive">{errors.invoiceNumber.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="standalone-inv-date" className={fieldLabel}>
                    Date
                  </Label>
                  <Input id="standalone-inv-date" type="date" {...register('eventDate')} />
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Label htmlFor="standalone-inv-label" className={fieldLabel}>
                  Libellé
                </Label>
                <Input id="standalone-inv-label" {...register('label')} />
                {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
              </div>
            </section>

            <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Montants
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="standalone-inv-ht" className={fieldLabel}>
                    HT (€)
                  </Label>
                  <Input
                    id="standalone-inv-ht"
                    type="number"
                    step="0.01"
                    min={0}
                    className="tabular-nums"
                    {...register('amountHtInput', {
                      valueAsNumber: true,
                      onChange: () => setLastEditedField('ht'),
                    })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="standalone-inv-tva" className={fieldLabel}>
                    TVA %
                  </Label>
                  <Input
                    id="standalone-inv-tva"
                    type="number"
                    step="0.01"
                    min={0}
                    className="tabular-nums"
                    {...register('taxRateInput', {
                      valueAsNumber: true,
                      onChange: () => setLastEditedField('tax'),
                    })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="standalone-inv-ttc" className={fieldLabel}>
                    TTC (€)
                  </Label>
                  <Input
                    id="standalone-inv-ttc"
                    type="number"
                    step="0.01"
                    min={0}
                    className="tabular-nums"
                    {...register('amountTtcInput', {
                      valueAsNumber: true,
                      onChange: () => setLastEditedField('ttc'),
                    })}
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t border-border/60 bg-muted/25 px-5 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createInvoice.isPending || quickCreateSupplier.isPending}
                className="min-w-[7rem]"
              >
                {createInvoice.isPending ? 'Création…' : 'Créer'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
