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
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { purchaseOrderCreationDocumentTypeOptions } from '../lib/procurement-attachment-category-labels';
import type { ProcurementAttachmentCategory } from '../types/procurement-attachment.types';
import { SupplierSearchCombobox } from './supplier-search-combobox';
import { prepareQuickCreateRequest } from '../utils/prepare-quick-create-request';
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

  type PendingPoDocRow = {
    key: string;
    file: File | null;
    title: string;
    category: ProcurementAttachmentCategory;
  };

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

      const created = await createOrder.mutateAsync({
        supplierId,
        ...(referenceValue ? { reference: referenceValue } : {}),
        label: values.label,
        amountHt: values.amountHtInput.toFixed(2),
        taxRate: values.taxRateInput.toFixed(2),
        orderDate: new Date(values.eventDate).toISOString(),
      });

      const toUpload = canUploadAttachments
        ? pendingDocs.filter((r) => r.file && r.file.size > 0)
        : [];
      const oversized = toUpload.filter((r) => (r.file?.size ?? 0) > MAX_ATTACHMENT_BYTES);
      const okToUpload = toUpload.filter((r) => (r.file?.size ?? 0) <= MAX_ATTACHMENT_BYTES);

      if (oversized.length > 0) {
        toast.error('Un ou plusieurs fichiers dépassent 15 Mo — ils n’ont pas été envoyés.');
      }

      if (okToUpload.length > 0) {
        setIsUploadingAttachments(true);
        let failed = 0;
        for (const row of okToUpload) {
          try {
            await uploadPurchaseOrderAttachment(authFetch, created.id, row.file!, {
              name: row.title.trim() || undefined,
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
      } else if (!canUploadAttachments && pendingDocs.some((r) => r.file)) {
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
                Tu peux joindre des documents (devis, bon de commande) dès maintenant si tu as{' '}
                <code className="text-xs">procurement.update</code>, ou après sur la fiche commande.
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
                  Libellé
                </Label>
                <Input id="standalone-po-label" {...register('label')} />
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

            {canUploadAttachments && (
              <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Documents (optionnel)
                </h3>
                <p className={fieldHint + ' mb-3'}>
                  PDF, JPEG ou PNG — 15&nbsp;Mo max par fichier. Type : devis ou bon de commande (GED).
                </p>
                {pendingDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground mb-3">Aucun fichier sélectionné.</p>
                ) : (
                  <ul className="mb-3 space-y-3">
                    {pendingDocs.map((row) => (
                      <li
                        key={row.key}
                        className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Pièce</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label="Retirer ce document"
                            onClick={() =>
                              setPendingDocs((prev) => prev.filter((r) => r.key !== row.key))
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <Input
                          id={`standalone-po-doc-file-${row.key}`}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                          className="cursor-pointer text-sm"
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setPendingDocs((prev) =>
                              prev.map((r) => (r.key === row.key ? { ...r, file: f } : r)),
                            );
                          }}
                        />
                        {row.file && (
                          <p className="text-xs text-muted-foreground truncate">{row.file.name}</p>
                        )}
                        <div className="grid gap-2">
                          <Label className={fieldLabel}>Type de document</Label>
                          <Select
                            value={row.category}
                            onValueChange={(v) =>
                              setPendingDocs((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? { ...r, category: v as ProcurementAttachmentCategory }
                                    : r,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {purchaseOrderCreationDocumentTypeOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`standalone-po-doc-title-${row.key}`} className={fieldLabel}>
                            Titre affiché (optionnel)
                          </Label>
                          <Input
                            id={`standalone-po-doc-title-${row.key}`}
                            value={row.title}
                            onChange={(e) =>
                              setPendingDocs((prev) =>
                                prev.map((r) =>
                                  r.key === row.key ? { ...r, title: e.target.value } : r,
                                ),
                              )
                            }
                            placeholder="Ex. Devis mars 2026"
                            autoComplete="off"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    setPendingDocs((prev) => [
                      ...prev,
                      {
                        key: crypto.randomUUID(),
                        file: null,
                        title: '',
                        category: 'QUOTE_PDF',
                      },
                    ])
                  }
                >
                  <Plus className="size-4" aria-hidden />
                  Ajouter un document
                </Button>
              </section>
            )}

            {!canUploadAttachments && (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2">
                Pour envoyer des pièces jointes depuis ce formulaire, la permission{' '}
                <code className="text-[11px]">procurement.update</code> est requise (sinon ajout sur la fiche
                après création).
              </p>
            )}
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
