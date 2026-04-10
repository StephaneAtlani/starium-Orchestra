'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FileText, Loader2, ShoppingCart } from 'lucide-react';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { listInvoicesByBudgetLine, listPurchaseOrdersByBudgetLine } from '@/features/procurement/api/procurement.api';
import { ProcurementAttachmentsPanel } from '@/features/procurement/components/procurement-attachments-panel';
import { useUpdateInvoice } from '@/features/procurement/hooks/use-update-invoice';
import { useUpdatePurchaseOrder } from '@/features/procurement/hooks/use-update-purchase-order';
import { toast } from '@/lib/toast';
import type { FinancialEventForLine } from '../../api/budget-line-financial.api';
import type { ApiFormError } from '../../api/types';

export function EditProcurementEventDialog({
  open,
  onOpenChange,
  event,
  budgetId,
  budgetLineId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: FinancialEventForLine | null;
  budgetId: string;
  budgetLineId: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canUpdate = has('procurement.update');
  const canReadProcurement = has('procurement.read');
  const canProcurementLookup = canUpdate || canReadProcurement;

  const sourceType = event?.sourceType;
  const sourceId = event?.sourceId ?? null;

  const invoiceQuery = useQuery({
    queryKey: ['budgets', clientId, 'budget-line-invoices-lookup', budgetLineId, sourceId],
    queryFn: () => listInvoicesByBudgetLine(authFetch, budgetLineId, { limit: 500 }),
    enabled: open && sourceType === 'INVOICE' && !!sourceId && canProcurementLookup,
  });
  const poQuery = useQuery({
    queryKey: ['budgets', clientId, 'budget-line-po-lookup', budgetLineId, sourceId],
    queryFn: () => listPurchaseOrdersByBudgetLine(authFetch, budgetLineId, { limit: 500 }),
    enabled: open && sourceType === 'PURCHASE_ORDER' && !!sourceId && canProcurementLookup,
  });

  const invoice = useMemo(
    () => invoiceQuery.data?.items.find((i) => i.id === sourceId),
    [invoiceQuery.data?.items, sourceId],
  );
  const po = useMemo(
    () => poQuery.data?.items.find((p) => p.id === sourceId),
    [poQuery.data?.items, sourceId],
  );

  const [label, setLabel] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [reference, setReference] = useState('');
  const [submitError, setSubmitError] = useState<ApiFormError | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmitError(null);
      return;
    }
    if (invoice) {
      setLabel(invoice.label);
      setInvoiceNumber(invoice.invoiceNumber);
    } else if (po) {
      setLabel(po.label);
      setReference(po.reference);
    }
  }, [open, invoice, po]);

  const updateInv = useUpdateInvoice(budgetId, budgetLineId);
  const updatePo = useUpdatePurchaseOrder(budgetId, budgetLineId);

  const loading =
    canProcurementLookup &&
    ((sourceType === 'INVOICE' && (invoiceQuery.isPending || invoiceQuery.isLoading)) ||
      (sourceType === 'PURCHASE_ORDER' && (poQuery.isPending || poQuery.isLoading)));

  const loadError =
    canProcurementLookup &&
    ((sourceType === 'INVOICE' && invoiceQuery.isError) ||
      (sourceType === 'PURCHASE_ORDER' && poQuery.isError));

  const invoiceNotFound =
    open &&
    sourceType === 'INVOICE' &&
    !invoiceQuery.isPending &&
    !invoiceQuery.isLoading &&
    invoiceQuery.isSuccess &&
    !invoice;

  const poNotFound =
    open &&
    sourceType === 'PURCHASE_ORDER' &&
    !poQuery.isPending &&
    !poQuery.isLoading &&
    poQuery.isSuccess &&
    !po;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !canUpdate) return;
    setSubmitError(null);
    try {
      if (sourceType === 'INVOICE' && invoice) {
        await updateInv.mutateAsync({
          invoiceId: sourceId,
          payload: { label: label.trim(), invoiceNumber: invoiceNumber.trim() },
        });
        toast.success('Facture mise à jour.');
        onOpenChange(false);
      } else if (sourceType === 'PURCHASE_ORDER' && po) {
        await updatePo.mutateAsync({
          purchaseOrderId: sourceId,
          payload: { label: label.trim(), reference: reference.trim() },
        });
        toast.success('Commande mise à jour.');
        onOpenChange(false);
      }
    } catch (err) {
      setSubmitError(err as ApiFormError);
    }
  };

  const pending = updateInv.isPending || updatePo.isPending;

  if (!event) return null;

  const title =
    sourceType === 'INVOICE'
      ? 'Modifier la facture'
      : sourceType === 'PURCHASE_ORDER'
        ? 'Modifier la commande'
        : 'Modifier';

  const showUnsupported =
    open && sourceType !== 'INVOICE' && sourceType !== 'PURCHASE_ORDER';

  const HeaderIcon =
    sourceType === 'INVOICE' ? FileText : sourceType === 'PURCHASE_ORDER' ? ShoppingCart : FileText;

  const refetchLookup = () => {
    if (sourceType === 'INVOICE') void invoiceQuery.refetch();
    if (sourceType === 'PURCHASE_ORDER') void poQuery.refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex max-h-[min(90vh,640px)] w-full flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 shadow-lg',
          'sm:max-w-lg',
        )}
      >
        <div className="shrink-0 border-b border-border/60 bg-card/50 px-5 pb-4 pt-5 pr-14">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-start gap-3 text-xl font-semibold tracking-tight">
              <span
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50 shadow-sm"
                aria-hidden
              >
                <HeaderIcon className="size-5 text-foreground/85" />
              </span>
              <span className="leading-snug">{title}</span>
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground">
              {sourceType === 'INVOICE'
                ? 'Mise à jour du libellé et du numéro de facture (métadonnées uniquement).'
                : sourceType === 'PURCHASE_ORDER'
                  ? 'Mise à jour du libellé et de la référence (métadonnées uniquement).'
                  : 'Modification depuis l’événement financier lié.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {!canProcurementLookup && (
            <Alert>
              <AlertDescription>
                Droits insuffisants : lecture procurement (procurement.read) ou modification (procurement.update)
                requise.
              </AlertDescription>
            </Alert>
          )}

          {canReadProcurement && !canUpdate && (invoice || po) && !loading && !loadError && (
            <Alert>
              <AlertDescription>
                Lecture seule : documents consultables ; la modification du libellé ou des métadonnées nécessite{' '}
                <strong>procurement.update</strong>.
              </AlertDescription>
            </Alert>
          )}

          {showUnsupported && (
            <Alert>
              <AlertDescription>
                Seules les écritures liées à une <strong>facture</strong> ou une <strong>commande</strong> peuvent être
                modifiées depuis cette liste. Pour une saisie manuelle, utilisez les écrans métier prévus à cet effet.
              </AlertDescription>
            </Alert>
          )}

          {sourceType === 'INVOICE' && invoiceNotFound && (
            <Alert variant="destructive">
              <AlertDescription>Facture introuvable pour cette ligne budgétaire.</AlertDescription>
            </Alert>
          )}
          {sourceType === 'PURCHASE_ORDER' && poNotFound && (
            <Alert variant="destructive">
              <AlertDescription>Commande introuvable pour cette ligne budgétaire.</AlertDescription>
            </Alert>
          )}

          {loadError && canProcurementLookup && (sourceType === 'INVOICE' || sourceType === 'PURCHASE_ORDER') && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>Impossible de charger l’enregistrement à modifier.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => refetchLookup()}>
                  Réessayer
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {loading &&
            canProcurementLookup &&
            (sourceType === 'INVOICE' || sourceType === 'PURCHASE_ORDER') &&
            !loadError && (
            <div
              className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm"
              aria-busy="true"
              aria-label="Chargement"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Chargement des données…
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <p className="text-xs text-muted-foreground">Récupération de la facture ou de la commande liée.</p>
            </div>
          )}

          {canUpdate && sourceType === 'INVOICE' && invoice && !loading && !loadError && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="space-y-2">
                  <Label htmlFor="edit-inv-label" className="text-sm font-medium">
                    Libellé
                  </Label>
                  <Input
                    id="edit-inv-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="edit-inv-num" className="text-sm font-medium">
                    N° facture
                  </Label>
                  <Input
                    id="edit-inv-num"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                L’API n’autorise que la mise à jour des métadonnées (libellé, numéro). Montants et date : contacter un
                administrateur ou évolution produit.
              </p>
              {submitError?.message ? (
                <p className="text-sm text-destructive">{submitError.message}</p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end sm:gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending} className="min-w-[7rem]">
                  {pending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          )}

          {(canReadProcurement || canUpdate) &&
            sourceType === 'INVOICE' &&
            invoice &&
            !loading &&
            !loadError && (
              <ProcurementAttachmentsPanel
                parent={{ kind: 'invoice', id: invoice.id }}
                canList={canReadProcurement}
                canUpload={canUpdate}
              />
            )}

          {canUpdate && sourceType === 'PURCHASE_ORDER' && po && !loading && !loadError && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="space-y-2">
                  <Label htmlFor="edit-po-label" className="text-sm font-medium">
                    Libellé
                  </Label>
                  <Input
                    id="edit-po-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="edit-po-ref" className="text-sm font-medium">
                    Référence
                  </Label>
                  <Input
                    id="edit-po-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    autoComplete="off"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Même limite : métadonnées uniquement (libellé, référence) côté API.
              </p>
              {submitError?.message ? (
                <p className="text-sm text-destructive">{submitError.message}</p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end sm:gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending} className="min-w-[7rem]">
                  {pending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          )}

          {(canReadProcurement || canUpdate) &&
            sourceType === 'PURCHASE_ORDER' &&
            po &&
            !loading &&
            !loadError && (
              <ProcurementAttachmentsPanel
                parent={{ kind: 'purchase-order', id: po.id }}
                canList={canReadProcurement}
                canUpload={canUpdate}
              />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
