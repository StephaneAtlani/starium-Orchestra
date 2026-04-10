'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { listInvoicesByBudgetLine, listPurchaseOrdersByBudgetLine } from '@/features/procurement/api/procurement.api';
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

  const sourceType = event?.sourceType;
  const sourceId = event?.sourceId ?? null;

  const invoiceQuery = useQuery({
    queryKey: ['budgets', clientId, 'budget-line-invoices-lookup', budgetLineId, sourceId],
    queryFn: () => listInvoicesByBudgetLine(authFetch, budgetLineId, { limit: 500 }),
    enabled: open && sourceType === 'INVOICE' && !!sourceId && canUpdate,
  });
  const poQuery = useQuery({
    queryKey: ['budgets', clientId, 'budget-line-po-lookup', budgetLineId, sourceId],
    queryFn: () => listPurchaseOrdersByBudgetLine(authFetch, budgetLineId, { limit: 500 }),
    enabled: open && sourceType === 'PURCHASE_ORDER' && !!sourceId && canUpdate,
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
    (sourceType === 'INVOICE' && invoiceQuery.isLoading) ||
    (sourceType === 'PURCHASE_ORDER' && poQuery.isLoading);

  const invoiceNotFound =
    open &&
    sourceType === 'INVOICE' &&
    !invoiceQuery.isLoading &&
    invoiceQuery.isSuccess &&
    !invoice;

  const poNotFound =
    open &&
    sourceType === 'PURCHASE_ORDER' &&
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {!canUpdate && (
          <Alert>
            <AlertDescription>Droits insuffisants pour modifier (procurement.update).</AlertDescription>
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

        {loading && canUpdate && (sourceType === 'INVOICE' || sourceType === 'PURCHASE_ORDER') && (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        )}

        {canUpdate && sourceType === 'INVOICE' && invoice && !loading && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-inv-label">Libellé</Label>
              <Input
                id="edit-inv-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inv-num">N° facture</Label>
              <Input
                id="edit-inv-num"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              L’API n’autorise que la mise à jour des métadonnées (libellé, numéro). Montants et date : contacter un
              administrateur ou évolution produit.
            </p>
            {submitError?.message ? (
              <p className="text-sm text-destructive">{submitError.message}</p>
            ) : null}
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {canUpdate && sourceType === 'PURCHASE_ORDER' && po && !loading && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-po-label">Libellé</Label>
              <Input
                id="edit-po-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-po-ref">Référence</Label>
              <Input
                id="edit-po-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Même limite : métadonnées uniquement (libellé, référence) côté API.
            </p>
            {submitError?.message ? (
              <p className="text-sm text-destructive">{submitError.message}</p>
            ) : null}
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
