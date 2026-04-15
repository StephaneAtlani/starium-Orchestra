'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import {
  createContract,
  listContractKindTypesMerged,
  listContractSupplierOptions,
  updateContract,
  uploadContractAttachment,
} from '../api/contracts.api';
import { contractsKeys } from '../lib/contracts-query-keys';
import {
  contractAttachmentCategoryLabel,
  contractAttachmentCategoryOptions,
  contractKindLabel,
  contractRenewalOptions,
  contractStatusOptions,
  fallbackPlatformContractKindSelectRows,
} from '../lib/contracts-labels';
import type {
  Contract,
  ContractAttachmentCategory,
  SupplierContractStatus,
} from '../types/contract.types';
import {
  previewNoticeDeadlineLabel,
  previewTermEndLabel,
} from '../lib/contract-form-date-hints';
import { ContractAttachmentFilePicker } from './contract-attachment-file-picker';

const RENEWAL_TERM_PRESET_VALUES = ['12', '24', '36', '48', '60'] as const;

const RENEWAL_TERM_SELECT_ITEMS: { value: string; label: string }[] = [
  { value: '__none', label: 'Non renseigné' },
  { value: '12', label: '12 mois (1 an)' },
  { value: '24', label: '24 mois (2 ans)' },
  { value: '36', label: '36 mois (3 ans)' },
  { value: '48', label: '48 mois (4 ans)' },
  { value: '60', label: '60 mois (5 ans)' },
  { value: '__other', label: 'Autre durée (mois)…' },
];

const BILLING_PRESET_VALUES = ['Mensuel', 'Trimestriel', 'Semestriel', 'Annuel', 'Ponctuel'] as const;

const BILLING_SELECT_ITEMS: { value: string; label: string }[] = [
  { value: '__none', label: 'Non renseigné' },
  ...BILLING_PRESET_VALUES.map((v) => ({ value: v, label: v })),
  { value: '__custom', label: 'Autre libellé…' },
];

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function fromDateInput(s: string): string {
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

function supplierRowLabel(name: string, code: string | null): string {
  return code ? `${name} · ${code}` : name;
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
  const { has } = usePermissions();
  const canProcurement = has('procurement.read');
  const canUploadAttachment = has('contracts.update');
  const canManageKindTypes = has('contracts.kind_types.manage');
  const clientId = activeClient?.id ?? '';
  const attachmentInputId = useId();
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const contractDocJustUploaded = useRef(false);
  const queryClient = useQueryClient();

  const suppliersQ = useQuery({
    queryKey: ['contracts', clientId, 'form-supplier-options'],
    queryFn: () => listContractSupplierOptions(authFetch, { limit: 500, offset: 0 }),
    enabled: open && !!clientId,
  });

  const kindTypesQ = useQuery({
    queryKey: contractsKeys.kindTypesMerged(clientId),
    queryFn: () => listContractKindTypesMerged(authFetch),
    enabled: open && !!clientId,
  });

  const kindTypeRows = useMemo(() => {
    if (kindTypesQ.isError) return fallbackPlatformContractKindSelectRows;
    return kindTypesQ.data ?? [];
  }, [kindTypesQ.isError, kindTypesQ.data]);

  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<string>('SERVICES');
  const [status, setStatus] = useState<SupplierContractStatus>('DRAFT');
  const [signedAt, setSignedAt] = useState('');
  const [effectiveStart, setEffectiveStart] = useState('');
  const [effectiveEnd, setEffectiveEnd] = useState('');
  const [renewalMode, setRenewalMode] = useState<string>('NONE');
  const [renewalTermMonths, setRenewalTermMonths] = useState('');
  const [noticeDays, setNoticeDays] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [annualValue, setAnnualValue] = useState('');
  const [totalCommitted, setTotalCommitted] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('');
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentDocName, setAttachmentDocName] = useState('');
  const [attachmentCategory, setAttachmentCategory] =
    useState<ContractAttachmentCategory>('CONTRACT_PDF');

  const clearAttachmentFields = useCallback(() => {
    setAttachmentFile(null);
    setAttachmentDocName('');
    setAttachmentCategory('CONTRACT_PDF');
    setAttachmentInputKey((k) => k + 1);
  }, []);

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
      setRenewalTermMonths(
        contract.renewalTermMonths != null ? String(contract.renewalTermMonths) : '',
      );
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
      clearAttachmentFields();
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
      setRenewalTermMonths('');
      setNoticeDays('');
      setCurrency('EUR');
      setAnnualValue('');
      setTotalCommitted('');
      setBillingFrequency('');
      setDescription('');
      setInternalNotes('');
      clearAttachmentFields();
    }
  }, [open, mode, contract, clearAttachmentFields]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!effectiveStart.trim()) throw new Error('Date de début requise.');
      if (renewalTermMonths.trim()) {
        const m = Number(renewalTermMonths.trim());
        if (!Number.isFinite(m) || m < 1) {
          throw new Error('Durée initiale (mois) : nombre entier ≥ 1 attendu.');
        }
      }
      let saved: Contract;
      if (mode === 'create') {
        if (!supplierId) throw new Error('Choisissez un fournisseur.');
        saved = await createContract(authFetch, {
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
          renewalTermMonths: renewalTermMonths.trim()
            ? Number(renewalTermMonths.trim())
            : undefined,
          currency: currency.trim().toUpperCase(),
          annualValue: annualValue.trim() || undefined,
          totalCommittedValue: totalCommitted.trim() || undefined,
          billingFrequency: billingFrequency.trim() || undefined,
          description: description.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
        });
      } else {
        if (!contract) throw new Error('Contrat manquant.');
        saved = await updateContract(authFetch, contract.id, {
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
          ...(renewalTermMonths.trim()
            ? { renewalTermMonths: Number(renewalTermMonths.trim()) }
            : {}),
          currency: currency.trim().toUpperCase(),
          annualValue: annualValue.trim() || undefined,
          totalCommittedValue: totalCommitted.trim() || undefined,
          billingFrequency: billingFrequency.trim() || null,
          description: description.trim() || null,
          internalNotes: internalNotes.trim() || null,
        });
      }

      contractDocJustUploaded.current = false;
      if (attachmentFile && canUploadAttachment) {
        try {
          const displayName =
            attachmentDocName.trim() ||
            attachmentFile.name.replace(/\.[^.]+$/, '');
          await uploadContractAttachment(authFetch, saved.id, attachmentFile, {
            name: displayName,
            category: attachmentCategory,
          });
          contractDocJustUploaded.current = true;
          void queryClient.invalidateQueries({
            queryKey: contractsKeys.attachments(clientId, saved.id),
          });
          void queryClient.invalidateQueries({
            queryKey: contractsKeys.detail(clientId, saved.id),
          });
        } catch (uploadErr: unknown) {
          const msg =
            uploadErr instanceof Error ? uploadErr.message : 'Échec envoi du fichier';
          toast.error(
            `Contrat enregistré. ${msg} Vous pouvez joindre le document depuis la fiche contrat.`,
          );
        }
      }

      return saved;
    },
    onSuccess: (c) => {
      const base = mode === 'create' ? 'Contrat créé.' : 'Contrat mis à jour.';
      toast.success(
        contractDocJustUploaded.current ? `${base} Document joint.` : base,
      );
      contractDocJustUploaded.current = false;
      clearAttachmentFields();
      void queryClient.invalidateQueries({ queryKey: contractsKeys.root(clientId) });
      onOpenChange(false);
      onSuccess?.(c);
    },
    onError: (e: Error & { message?: string }) => {
      toast.error(e?.message ?? 'Enregistrement impossible.');
    },
  });

  const supplierRows = useMemo(() => {
    const items = suppliersQ.data?.items ?? [];
    const rows = items.map((s) => ({ id: s.id, name: s.name, code: s.code }));
    if (
      mode === 'edit' &&
      contract &&
      contract.supplierId &&
      !rows.some((r) => r.id === contract.supplierId)
    ) {
      rows.unshift({
        id: contract.supplierId,
        name: contract.supplier.name,
        code: contract.supplier.code,
      });
    }
    return rows;
  }, [suppliersQ.data?.items, mode, contract]);

  const suppliersLoading = suppliersQ.isLoading;
  const suppliersError = suppliersQ.isError;
  const suppliersEmpty = suppliersQ.isSuccess && supplierRows.length === 0;

  const supplierSelectDisabled = suppliersLoading || suppliersError || suppliersEmpty;

  const createBlockedBySupplier =
    mode === 'create' &&
    (!supplierId || suppliersLoading || suppliersError || suppliersEmpty);

  const termEndHint = useMemo(
    () => previewTermEndLabel(effectiveStart, renewalTermMonths),
    [effectiveStart, renewalTermMonths],
  );
  const noticeDeadlineHint = useMemo(
    () => previewNoticeDeadlineLabel(effectiveEnd, noticeDays),
    [effectiveEnd, noticeDays],
  );

  const renewalTermSelectValue = useMemo(() => {
    if (!renewalTermMonths.trim()) return '__none';
    if (RENEWAL_TERM_PRESET_VALUES.includes(renewalTermMonths as (typeof RENEWAL_TERM_PRESET_VALUES)[number])) {
      return renewalTermMonths;
    }
    return '__other';
  }, [renewalTermMonths]);

  const billingSelectValue = useMemo(() => {
    if (!billingFrequency.trim()) return '__none';
    if (BILLING_PRESET_VALUES.includes(billingFrequency as (typeof BILLING_PRESET_VALUES)[number])) {
      return billingFrequency;
    }
    return '__custom';
  }, [billingFrequency]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(90vh,880px)] w-full gap-4 overflow-y-auto sm:max-w-4xl lg:max-w-5xl"
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <DialogHeader className="-mx-4 -mt-4 space-y-3 rounded-t-xl border-b border-border/60 bg-card pb-4 pl-7 pr-4 pt-4 text-left shadow-sm sm:pl-8">
            <div className="pr-8">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <DialogTitle className="text-left">
                  {mode === 'create' ? 'Nouveau contrat' : 'Modifier le contrat'}
                </DialogTitle>
                <Badge variant="secondary" className="shrink-0 font-normal text-muted-foreground">
                  Contrats
                </Badge>
              </div>
              <DialogDescription className="mt-2 text-left">
                Contrepartie contractuelle = fournisseur du répertoire achats ; enregistrement explicite via
                « Enregistrer ».
              </DialogDescription>
            </div>
            <div
              className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {suppliersLoading ? (
                <>
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
                  <span>Chargement des fournisseurs…</span>
                </>
              ) : suppliersError ? (
                <>
                  <AlertCircle className="size-3.5 shrink-0 text-destructive" aria-hidden />
                  <span className="text-destructive">
                    Liste fournisseurs indisponible — utilisez « Réessayer » dans l’encart ci-dessous.
                  </span>
                </>
              ) : mut.isPending ? (
                <>
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
                  <span>Enregistrement en cours…</span>
                </>
              ) : (
                <>
                  <FileText className="size-3.5 shrink-0 text-muted-foreground/90" aria-hidden />
                  <span>
                    Document joint optionnel après validation — PDF, PNG ou JPEG si vous avez le droit de
                    modification.
                  </span>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-2 rounded-lg border border-border/70 bg-card p-3 shadow-sm sm:p-4">
            <Label htmlFor={suppliersLoading || suppliersError ? undefined : 'ctr-supplier-trigger'}>
              Fournisseur
            </Label>
            {suppliersLoading ? (
              <div
                className="space-y-2"
                role="status"
                aria-busy="true"
                aria-label="Chargement des fournisseurs"
              >
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-2 w-2/3 max-w-xs" />
              </div>
            ) : suppliersError ? (
              <div className="space-y-3" id="ctr-supplier-error" role="alert">
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>
                    Impossible de charger la liste des fournisseurs. Vérifiez le module contrats pour ce
                    client ou réessayez.
                  </AlertDescription>
                </Alert>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => void suppliersQ.refetch()}
                  disabled={suppliersQ.isFetching}
                >
                  {suppliersQ.isFetching ? 'Nouvelle tentative…' : 'Réessayer'}
                </Button>
              </div>
            ) : (
              <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? '')}>
                <SelectTrigger
                  id="ctr-supplier-trigger"
                  className="w-full border-input"
                  disabled={supplierSelectDisabled}
                  aria-describedby={
                    suppliersEmpty && !suppliersError ? 'ctr-supplier-hint' : undefined
                  }
                >
                  <SelectValue placeholder="Choisir un fournisseur">
                    {(value) =>
                      !value
                        ? suppliersEmpty
                          ? 'Aucun fournisseur disponible'
                          : 'Choisir un fournisseur…'
                        : (() => {
                            const row = supplierRows.find((r) => r.id === value);
                            if (row) return supplierRowLabel(row.name, row.code);
                            if (mode === 'edit' && contract && contract.supplierId === value) {
                              return supplierRowLabel(
                                contract.supplier.name,
                                contract.supplier.code,
                              );
                            }
                            return 'Fournisseur';
                          })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {supplierRows.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {supplierRowLabel(s.name, s.code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {suppliersEmpty && !suppliersLoading && !suppliersError && (
              <p className="text-xs text-muted-foreground" id="ctr-supplier-hint">
                Aucun fournisseur sur ce client.
                {canProcurement ? (
                  <>
                    {' '}
                    <Link
                      href="/suppliers"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Gérer les fournisseurs
                    </Link>
                  </>
                ) : null}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border/70 bg-card p-3 shadow-sm sm:p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Informations générales
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Champs équivalents à une fiche contrat type GLPI : pas de lieu, plages horaires ni alertes e-mail
              tant que le modèle Orchestra ne les prévoit pas.
            </p>

            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ctr-title">Intitulé *</Label>
                  <Input
                    id="ctr-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex. Maintenance 24/7"
                    className="border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctr-desc">Commentaires</Label>
                  <textarea
                    id="ctr-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Contexte, périmètre, clauses notables…"
                    className={cn(
                      'min-h-[72px] w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctr-ref">Numéro / référence *</Label>
                  <Input
                    id="ctr-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    disabled={mode === 'edit'}
                    className="border-input font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctr-notice">Préavis (jours calendaires)</Label>
                  <Input
                    id="ctr-notice"
                    inputMode="numeric"
                    value={noticeDays}
                    onChange={(e) => setNoticeDays(e.target.value)}
                    className="border-input"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="w-full text-[11px] text-muted-foreground">Raccourcis :</span>
                    {([30, 60, 90, 120] as const).map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 border-border/70 px-2 text-xs"
                        onClick={() => setNoticeDays(String(d))}
                      >
                        {d} j
                      </Button>
                    ))}
                  </div>
                  {noticeDeadlineHint ? (
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                      Dernière date pour respecter le préavis avant fin d&apos;effet{' '}
                      <span className="font-medium text-foreground">{noticeDeadlineHint}</span>
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium leading-none">Durée initiale / période (mois)</span>
                  <p className="text-xs text-muted-foreground">
                    Sert au calcul indicatif de fin de période à partir du début d&apos;effet.
                  </p>
                  <Select
                    value={renewalTermSelectValue}
                    onValueChange={(v) => {
                      if (v === '__none' || v == null) setRenewalTermMonths('');
                      else if (v === '__other') {
                        setRenewalTermMonths((prev) => {
                          const t = prev.trim();
                          if (!t || RENEWAL_TERM_PRESET_VALUES.includes(t as (typeof RENEWAL_TERM_PRESET_VALUES)[number])) {
                            return '1';
                          }
                          return prev;
                        });
                      } else setRenewalTermMonths(v);
                    }}
                  >
                    <SelectTrigger className="w-full border-input">
                      <SelectValue placeholder="Non renseigné">
                        {renewalTermSelectValue === '__none'
                          ? 'Non renseigné'
                          : renewalTermSelectValue === '__other'
                            ? renewalTermMonths.trim()
                              ? `Autre : ${renewalTermMonths.trim()} mois`
                              : 'Autre durée (mois)…'
                            : (RENEWAL_TERM_SELECT_ITEMS.find((o) => o.value === renewalTermSelectValue)
                                ?.label ?? '—')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {RENEWAL_TERM_SELECT_ITEMS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renewalTermSelectValue === '__other' ? (
                    <Input
                      id="ctr-renewal-months-custom"
                      inputMode="numeric"
                      min={1}
                      value={renewalTermMonths}
                      onChange={(e) => setRenewalTermMonths(e.target.value)}
                      className="border-input"
                      aria-label="Nombre de mois (durée personnalisée)"
                    />
                  ) : null}
                  {termEndHint ? (
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                      Fin théorique sur cette durée à partir du début d&apos;effet{' '}
                      <span className="font-medium text-foreground">{termEndHint}</span>
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Renouvellement</Label>
                  <Select value={renewalMode} onValueChange={(v) => setRenewalMode(v ?? 'NONE')}>
                    <SelectTrigger className="w-full border-input">
                      <SelectValue placeholder="Mode">
                        {contractRenewalOptions.find((o) => o.value === renewalMode)?.label ?? '—'}
                      </SelectValue>
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
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as SupplierContractStatus)}>
                    <SelectTrigger className="w-full border-input">
                      <SelectValue placeholder="Statut">
                        {contractStatusOptions.find((o) => o.value === status)?.label ?? '—'}
                      </SelectValue>
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
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="ctr-kind-trigger">Type de contrat</Label>
                    {canManageKindTypes ? (
                      <Link
                        href="/contracts/kind-types"
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Gérer les types
                      </Link>
                    ) : null}
                  </div>
                  {kindTypesQ.isLoading ? (
                    <Skeleton className="h-9 w-full rounded-lg" />
                  ) : (
                    <>
                      {kindTypesQ.isError ? (
                        <Alert className="border-amber-500/40 bg-amber-500/[0.06] py-2">
                          <AlertDescription className="text-xs text-amber-950 dark:text-amber-100">
                            Catalogue types indisponible (API ou migration). Sélection plateforme par défaut ;
                            les types client n’apparaissent pas tant que{' '}
                            <code className="rounded bg-muted px-1 font-mono text-[11px]">
                              GET /api/contracts/kind-types
                            </code>{' '}
                            ne répond pas correctement.
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      <Select value={kind} onValueChange={(v) => setKind(v ?? '')}>
                        <SelectTrigger id="ctr-kind-trigger" className="w-full border-input">
                          <SelectValue placeholder="Type">
                            {(() => {
                              const row = kindTypeRows.find((t) => t.code === kind);
                              if (row) return row.label;
                              if (mode === 'edit' && contract && contract.kind === kind) {
                                return contractKindLabel(kind, contract.kindLabel);
                              }
                              return contractKindLabel(kind);
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {kindTypeRows.map((t) => (
                            <SelectItem key={t.id} value={t.code}>
                              {t.label}
                            </SelectItem>
                          ))}
                          {mode === 'edit' &&
                          contract &&
                          contract.kind === kind &&
                          !kindTypeRows.some((t) => t.code === kind) ? (
                            <SelectItem value={kind}>
                              {contractKindLabel(kind, contract.kindLabel)} (catalogue)
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Catalogue plateforme complété par les types définis pour votre organisation (admin
                    client).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctr-sig">Signé le</Label>
                  <Input
                    id="ctr-sig"
                    type="date"
                    value={signedAt}
                    onChange={(e) => setSignedAt(e.target.value)}
                    className="border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctr-start">Début d&apos;effet *</Label>
                  <Input
                    id="ctr-start"
                    type="date"
                    value={effectiveStart}
                    onChange={(e) => setEffectiveStart(e.target.value)}
                    className="border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctr-end">Fin d&apos;effet</Label>
                  <Input
                    id="ctr-end"
                    type="date"
                    value={effectiveEnd}
                    onChange={(e) => setEffectiveEnd(e.target.value)}
                    className="border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctr-cur">Devise *</Label>
                  <Input
                    id="ctr-cur"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    maxLength={3}
                    className="border-input uppercase"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ctr-annual">Valeur annuelle (info)</Label>
                    <Input
                      id="ctr-annual"
                      inputMode="decimal"
                      value={annualValue}
                      onChange={(e) => setAnnualValue(e.target.value)}
                      className="border-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ctr-total">Engagement total (info)</Label>
                    <Input
                      id="ctr-total"
                      inputMode="decimal"
                      value={totalCommitted}
                      onChange={(e) => setTotalCommitted(e.target.value)}
                      className="border-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium leading-none">Fréquence de facturation</span>
                  <Select
                    value={billingSelectValue}
                    onValueChange={(v) => {
                      if (v === '__none' || v == null) setBillingFrequency('');
                      else if (v === '__custom') {
                        setBillingFrequency((prev) =>
                          BILLING_PRESET_VALUES.includes(
                            prev as (typeof BILLING_PRESET_VALUES)[number],
                          )
                            ? ''
                            : prev,
                        );
                      } else setBillingFrequency(v);
                    }}
                  >
                    <SelectTrigger id="ctr-bill-select" className="w-full border-input">
                      <SelectValue placeholder="Non renseigné">
                        {billingSelectValue === '__none'
                          ? 'Non renseigné'
                          : billingSelectValue === '__custom'
                            ? billingFrequency.trim() || 'Saisie libre…'
                            : billingSelectValue}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_SELECT_ITEMS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {billingSelectValue === '__custom' ? (
                    <Input
                      id="ctr-bill-custom"
                      value={billingFrequency}
                      onChange={(e) => setBillingFrequency(e.target.value)}
                      maxLength={32}
                      placeholder="ex. Tous les 18 mois"
                      className="border-input"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2 border-t border-border/60 pt-4">
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

          {canUploadAttachment ? (
            <div className="space-y-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm sm:p-4">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Document contrat (optionnel)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fichier associé après enregistrement — PDF signé, scan ou image (PNG, JPEG).
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/[0.04] to-transparent p-4 sm:p-5">
                <ContractAttachmentFilePicker
                  id={attachmentInputId}
                  file={attachmentFile}
                  onFileChange={setAttachmentFile}
                  inputKey={attachmentInputKey}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctr-attach-name">Titre du document</Label>
                <Input
                  id="ctr-attach-name"
                  value={attachmentDocName}
                  onChange={(e) => setAttachmentDocName(e.target.value)}
                  placeholder="Libellé dans la liste des pièces"
                  className="border-input"
                  disabled={!attachmentFile}
                />
              </div>
              <div className="space-y-2">
                <Label>Type de pièce</Label>
                <Select
                  value={attachmentCategory}
                  onValueChange={(v) => setAttachmentCategory(v as ContractAttachmentCategory)}
                  disabled={!attachmentFile}
                >
                  <SelectTrigger className="w-full border-input">
                    <SelectValue>
                      {contractAttachmentCategoryLabel(attachmentCategory)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {contractAttachmentCategoryOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => mut.mutate()}
              disabled={mut.isPending || createBlockedBySupplier}
            >
              {mut.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
