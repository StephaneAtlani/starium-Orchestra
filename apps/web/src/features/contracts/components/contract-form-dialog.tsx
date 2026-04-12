'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { listSuppliers } from '@/features/procurement/api/procurement.api';
import { createContract, updateContract } from '../api/contracts.api';
import { contractsKeys } from '../lib/contracts-query-keys';
import {
  contractKindOptions,
  contractRenewalOptions,
  contractStatusOptions,
} from '../lib/contracts-labels';
import type { Contract, SupplierContractKind, SupplierContractStatus } from '../types/contract.types';

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function fromDateInput(s: string): string {
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

export function ContractFormDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'create' | 'edit';
  contract?: Contract | null;
  onSuccess?: (c: Contract) => void;
}) {
  const { open, onOpenChange, mode, contract, onSuccess } = props;
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const suppliersQ = useQuery({
    queryKey: ['procurement', clientId, 'contracts-form-suppliers'],
    queryFn: () => listSuppliers(authFetch, { limit: 500, offset: 0 }),
    enabled: open && !!clientId,
  });

  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<SupplierContractKind>('SERVICES');
  const [status, setStatus] = useState<SupplierContractStatus>('DRAFT');
  const [signedAt, setSignedAt] = useState('');
  const [effectiveStart, setEffectiveStart] = useState('');
  const [effectiveEnd, setEffectiveEnd] = useState('');
  const [renewalMode, setRenewalMode] = useState<string>('NONE');
  const [noticeDays, setNoticeDays] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [annualValue, setAnnualValue] = useState('');
  const [totalCommitted, setTotalCommitted] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('');
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && contract) {
      setSupplierId(contract.supplierId);
      setReference(contract.reference);
      setTitle(contract.title);
      setKind(contract.kind);
      setStatus(contract.status);
      setSignedAt(toDateInput(contract.signedAt));
      setEffectiveStart(toDateInput(contract.effectiveStart));
      setEffectiveEnd(toDateInput(contract.effectiveEnd));
      setRenewalMode(contract.renewalMode);
      setNoticeDays(contract.noticePeriodDays != null ? String(contract.noticePeriodDays) : '');
      setCurrency(contract.currency);
      setAnnualValue(
        contract.annualValue != null ? String(contract.annualValue) : '',
      );
      setTotalCommitted(
        contract.totalCommittedValue != null ? String(contract.totalCommittedValue) : '',
      );
      setBillingFrequency(contract.billingFrequency ?? '');
      setDescription(contract.description ?? '');
      setInternalNotes(contract.internalNotes ?? '');
    } else if (mode === 'create') {
      setSupplierId('');
      setReference('');
      setTitle('');
      setKind('SERVICES');
      setStatus('DRAFT');
      setSignedAt('');
      const today = new Date().toISOString().slice(0, 10);
      setEffectiveStart(today);
      setEffectiveEnd('');
      setRenewalMode('NONE');
      setNoticeDays('');
      setCurrency('EUR');
      setAnnualValue('');
      setTotalCommitted('');
      setBillingFrequency('');
      setDescription('');
      setInternalNotes('');
    }
  }, [open, mode, contract]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!effectiveStart.trim()) throw new Error('Date de début requise.');
      if (mode === 'create') {
        if (!supplierId) throw new Error('Choisissez un fournisseur.');
        return createContract(authFetch, {
          supplierId,
          reference: reference.trim(),
          title: title.trim(),
          kind,
          status,
          signedAt: signedAt.trim() ? fromDateInput(signedAt.trim()) : undefined,
          effectiveStart: fromDateInput(effectiveStart.trim()),
          effectiveEnd: effectiveEnd.trim() ? fromDateInput(effectiveEnd.trim()) : undefined,
          renewalMode,
          noticePeriodDays: noticeDays.trim() ? Number(noticeDays) : undefined,
          currency: currency.trim().toUpperCase(),
          annualValue: annualValue.trim() || undefined,
          totalCommittedValue: totalCommitted.trim() || undefined,
          billingFrequency: billingFrequency.trim() || undefined,
          description: description.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
        });
      }
      if (!contract) throw new Error('Contrat manquant.');
      return updateContract(authFetch, contract.id, {
        supplierId,
        reference: reference.trim(),
        title: title.trim(),
        kind,
        status,
        signedAt: signedAt.trim() ? fromDateInput(signedAt.trim()) : undefined,
        effectiveStart: fromDateInput(effectiveStart.trim()),
        effectiveEnd: effectiveEnd.trim() ? fromDateInput(effectiveEnd.trim()) : null,
        renewalMode,
        noticePeriodDays: noticeDays.trim() ? Number(noticeDays) : null,
        currency: currency.trim().toUpperCase(),
        annualValue: annualValue.trim() || undefined,
        totalCommittedValue: totalCommitted.trim() || undefined,
        billingFrequency: billingFrequency.trim() || null,
        description: description.trim() || null,
        internalNotes: internalNotes.trim() || null,
      });
    },
    onSuccess: (c) => {
      toast.success(mode === 'create' ? 'Contrat créé.' : 'Contrat mis à jour.');
      void queryClient.invalidateQueries({ queryKey: contractsKeys.root(clientId) });
      onOpenChange(false);
      onSuccess?.(c);
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Enregistrement impossible.');
    },
  });

  const supplierOptions = suppliersQ.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nouveau contrat' : 'Modifier le contrat'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {supplierOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.code ? ` (${s.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {suppliersQ.isLoading && (
              <p className="text-xs text-muted-foreground">Chargement fournisseurs…</p>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ctr-ref">Référence</Label>
              <Input
                id="ctr-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctr-cur">Devise</Label>
              <Input
                id="ctr-cur"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-title">Titre</Label>
            <Input id="ctr-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as SupplierContractKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractKindOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SupplierContractStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractStatusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ctr-sig">Signé le</Label>
              <Input
                id="ctr-sig"
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctr-start">Début effet *</Label>
              <Input
                id="ctr-start"
                type="date"
                value={effectiveStart}
                onChange={(e) => setEffectiveStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctr-end">Fin effet</Label>
              <Input
                id="ctr-end"
                type="date"
                value={effectiveEnd}
                onChange={(e) => setEffectiveEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Renouvellement</Label>
              <Select value={renewalMode} onValueChange={setRenewalMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractRenewalOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctr-notice">Préavis (jours)</Label>
              <Input
                id="ctr-notice"
                inputMode="numeric"
                value={noticeDays}
                onChange={(e) => setNoticeDays(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ctr-annual">Valeur annuelle (info)</Label>
              <Input
                id="ctr-annual"
                inputMode="decimal"
                value={annualValue}
                onChange={(e) => setAnnualValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctr-total">Engagement total (info)</Label>
              <Input
                id="ctr-total"
                inputMode="decimal"
                value={totalCommitted}
                onChange={(e) => setTotalCommitted(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-bill">Fréquence facturation</Label>
            <Input
              id="ctr-bill"
              value={billingFrequency}
              onChange={(e) => setBillingFrequency(e.target.value)}
              placeholder="ex. Mensuel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-desc">Description</Label>
            <textarea
              id="ctr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={cn(
                'min-h-[60px] w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-notes">Notes internes</Label>
            <textarea
              id="ctr-notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              className={cn(
                'min-h-[60px] w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
