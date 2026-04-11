'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { createOrderSchema, type CreateOrderValues } from '@/features/budgets/schemas/create-order.schema';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useTaxDisplayMode } from '@/hooks/use-tax-display-mode';
import { useCreatePurchaseOrderStandalone } from '../hooks/use-procurement-entity-mutations';
import { useQuickCreateSupplier } from '../hooks/use-quick-create-supplier';
import { listSuppliers, uploadPurchaseOrderAttachment } from '../api/procurement.api';
import {
  ProcurementPoPendingDocumentsSection,
  defaultPoAttachmentDisplayName,
  type PendingPoDocRow,
} from './procurement-po-pending-documents-section';
import { SupplierSearchCombobox } from './supplier-search-combobox';
import { prepareQuickCreateRequest } from '../utils/prepare-quick-create-request';
import { buildDefaultPurchaseOrderLabel } from '../utils/build-default-purchase-order-label';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';

export function CreateStandalonePurchaseOrderDialog({
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
  const createOrder = useCreatePurchaseOrderStandalone();
  const quickCreateSupplier = useQuickCreateSupplier();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has } = usePermissions();
  const canCreateProcurement = has('procurement.create');
  const canUploadAttachments = has('procurement.update');
  const { defaultTaxRate } = useTaxDisplayMode();
  const baseTaxRate = defaultTaxRate ?? 0;

  const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

  const [pendingDocs, setPendingDocs] = useState<PendingPoDocRow[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

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
      taxRateInput: baseTaxRate,
      description: '',
    },
  });

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      setResolvedSupplier(null);
      setPendingDocs([]);
      setIsUploadingAttachments(false);
      reset({
        supplierName: '',
        reference: '',
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

      const labelEffective =
        values.label.trim() || buildDefaultPurchaseOrderLabel(values.eventDate);

      const created = await createOrder.mutateAsync({
        supplierId,
        ...(referenceValue ? { reference: referenceValue } : {}),
        label: labelEffective,
        amountHt: values.amountHtInput.toFixed(2),
        taxRate: values.taxRateInput.toFixed(2),
        orderDate: new Date(values.eventDate).toISOString(),
      });

      const toUpload = canUploadAttachments ? pendingDocs.filter((r) => r.file.size > 0) : [];
      const oversized = toUpload.filter((r) => r.file.size > MAX_ATTACHMENT_BYTES);
      const okToUpload = toUpload.filter((r) => r.file.size <= MAX_ATTACHMENT_BYTES);

      if (oversized.length > 0) {
        toast.error('Un ou plusieurs fichiers dépassent 15 Mo — ils n’ont pas été envoyés.');
      }

      if (okToUpload.length > 0) {
        setIsUploadingAttachments(true);
        let failed = 0;
        for (const row of okToUpload) {
          try {
            await uploadPurchaseOrderAttachment(authFetch, created.id, row.file, {
              name: row.title.trim() || defaultPoAttachmentDisplayName(row.file),
              category: row.category,
            });
          } catch {
            failed += 1;
          }
        }
        setIsUploadingAttachments(false);
        if (failed > 0) {
          toast.error(
            `Commande créée. ${failed} pièce(s) jointe(s) n’ont pas pu être envoyées (tu peux réessayer sur la fiche).`,
          );
        } else {
          toast.success(
            okToUpload.length > 1
              ? `Commande créée — ${okToUpload.length} documents ajoutés.`
              : 'Commande créée — document ajouté.',
          );
        }
      } else if (!canUploadAttachments && pendingDocs.length > 0) {
        toast.message(
          'Commande créée. Les brouillons de fichiers n’ont pas été envoyés : permission procurement.update requise.',
        );
      } else {
        toast.success('Commande créée. Tu peux ajouter des pièces jointes sur la fiche.');
      }

      onOpenChange(false);
      router.push(`/suppliers/purchase-orders/${created.id}?documents=1`);
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
      // ignore
    }
  };

  const fieldLabel = 'text-sm font-medium text-foreground';
  const fieldHint = 'text-xs text-muted-foreground';

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
                  <ShoppingCart className="size-5 text-foreground/85" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span>Nouvelle commande</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Hors ligne budgétaire — pas d’engagement sur un budget.
                  </span>
                </span>
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
                Sous <strong className="text-foreground">Fournisseur</strong> : joindre devis et bon de commande si les
                droits le permettent ; sinon, dépôt possible sur la fiche après création.
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
                <Label htmlFor="standalone-po-supplier" className={fieldLabel}>
                  Recherche ou création
                </Label>
                <Controller
                  name="supplierName"
                  control={control}
                  render={({ field }) => (
                    <SupplierSearchCombobox
                      id="standalone-po-supplier"
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
                {errors.supplierName && (
                  <p className="text-sm text-destructive">{errors.supplierName.message}</p>
                )}
              </div>
            </section>

            {canUploadAttachments && (
              <ProcurementPoPendingDocumentsSection
                pendingDocs={pendingDocs}
                setPendingDocs={setPendingDocs}
                idPrefix="standalone-po"
                description={<>Taille maximale : 15&nbsp;Mo par fichier.</>}
              />
            )}

            {!canUploadAttachments && (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-50/90 to-amber-50/40 px-4 py-3 text-sm text-amber-950 dark:from-amber-950/50 dark:to-amber-950/30 dark:text-amber-50">
                <p className="font-medium text-amber-950 dark:text-amber-50">Documents non disponibles ici</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/85">
                  La permission <code className="rounded bg-amber-100/80 px-1 py-0.5 text-[11px] dark:bg-amber-900/60">procurement.update</code> est requise pour préparer les fichiers ici. Sinon, après création, utiliser la{' '}
                  <strong>fiche commande</strong> pour les déposer.
                </p>
              </div>
            )}

            <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Détail
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="standalone-po-ref" className={fieldLabel}>
                    Référence
                  </Label>
                  <p className={fieldHint}>Optionnel — sinon référence auto.</p>
                  <Input
                    id="standalone-po-ref"
                    className="font-mono text-sm"
                    {...register('reference')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="standalone-po-date" className={fieldLabel}>
                    Date de commande
                  </Label>
                  <Input id="standalone-po-date" type="date" {...register('eventDate')} />
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Label htmlFor="standalone-po-label" className={fieldLabel}>
                  Libellé <span className="font-normal text-muted-foreground">(optionnel)</span>
                </Label>
                <p className={fieldHint}>
                  Si vide :{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">BC_YYYY-MM-DD_····</code> à partir de la
                  date de commande.
                </p>
                <Input id="standalone-po-label" placeholder="Objet court visible en liste" {...register('label')} />
                {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
              </div>
            </section>

            <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Montants
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="standalone-po-ht" className={fieldLabel}>
                    HT (€)
                  </Label>
                  <Input
                    id="standalone-po-ht"
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
                  <Label htmlFor="standalone-po-tva" className={fieldLabel}>
                    TVA %
                  </Label>
                  <Input
                    id="standalone-po-tva"
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
                  <Label htmlFor="standalone-po-ttc" className={fieldLabel}>
                    TTC (€)
                  </Label>
                  <Input
                    id="standalone-po-ttc"
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
                disabled={
                  createOrder.isPending || quickCreateSupplier.isPending || isUploadingAttachments
                }
                className="min-w-[7rem]"
              >
                {isUploadingAttachments
                  ? 'Envoi des documents…'
                  : createOrder.isPending
                    ? 'Création…'
                    : 'Créer'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
