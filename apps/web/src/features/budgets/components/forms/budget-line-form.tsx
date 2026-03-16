'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildBudgetLineFormSchema, type BudgetLineFormValues } from '../../schemas/budget-line-form.schema';
import { BudgetFormActions } from './budget-form-actions';
import { budgetEnvelopeNew } from '../../constants/budget-routes';
import type { ApiFormError } from '../../api/types';
import type { GeneralLedgerAccountOption } from '../../api/general-ledger-accounts.api';
import { useActiveClient } from '@/hooks/use-active-client';

const EXPENSE_TYPE_OPTIONS = [
  { value: 'CAPEX', label: 'CAPEX' },
  { value: 'OPEX', label: 'OPEX' },
] as const;

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'ARCHIVED', label: 'Archivé' },
  { value: 'CLOSED', label: 'Clôturé' },
] as const;

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

interface BudgetLineFormProps {
  defaultValues: Partial<BudgetLineFormValues>;
  onSubmit: (values: BudgetLineFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelHref?: string;
  onCancel?: () => void;
  submitError?: ApiFormError | null;
  budgetId: string;
  budgetLabel?: string;
  isEdit?: boolean;
  envelopeOptions: { id: string; name: string }[];
  envelopeOptionsLoading?: boolean;
  /** true quand la requête enveloppes a réussi (évite d’afficher l’alerte pendant le chargement ou si la query est désactivée). */
  envelopeOptionsSuccess?: boolean;
  generalLedgerOptions: GeneralLedgerAccountOption[];
  /** Afficher l'icône calculette (planning) à côté des montants. */
  hasPlanning?: boolean;
  /** Callback pour ouvrir la calculette de planning. */
  onOpenPlanning?: () => void;
}

export function BudgetLineForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
  cancelHref,
  onCancel,
  submitError,
  budgetId,
  budgetLabel,
  isEdit = false,
  envelopeOptions,
  envelopeOptionsLoading = false,
  envelopeOptionsSuccess = false,
  generalLedgerOptions,
  hasPlanning = false,
  onOpenPlanning,
}: BudgetLineFormProps) {
  const noEnvelopes = envelopeOptionsSuccess && envelopeOptions.length === 0;
  const envelopeSelectLoading = !envelopeOptionsSuccess || envelopeOptionsLoading;
  const noGeneralLedger = generalLedgerOptions.length === 0;
  const { activeClient } = useActiveClient();
  const isBudgetAccountingEnabled = activeClient?.budgetAccountingEnabled ?? false;
  const canSubmit = !noEnvelopes && (isBudgetAccountingEnabled ? !noGeneralLedger : true);

  const [showQuickCalculator, setShowQuickCalculator] = useState(false);
  const [calcQuantity, setCalcQuantity] = useState<number | ''>('');
  const [calcUnitPrice, setCalcUnitPrice] = useState<number | ''>('');
  const [monthValues, setMonthValues] = useState<number[]>(() => Array(12).fill(0));

  const monthTotal = useMemo(
    () => monthValues.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
    [monthValues],
  );

  const effectiveTotal = useMemo(() => {
    const hasMonths = monthValues.some((v) => v > 0);

    const qty = calcQuantity === '' ? 0 : Number(calcQuantity);
    const unit = calcUnitPrice === '' ? 0 : Number(calcUnitPrice);
    const qp = !Number.isNaN(qty) && !Number.isNaN(unit) ? qty * unit : 0;

    if (hasMonths) {
      // Le calendrier contient déjà des montants finaux.
      return monthTotal;
    }

    // Sinon, on utilise uniquement quantité × prix unitaire.
    return qp;
  }, [calcQuantity, calcUnitPrice, monthTotal, monthValues]);

  const applySpread = (mode: 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'YEARLY') => {
    if (!Number.isFinite(effectiveTotal) || effectiveTotal <= 0) return;

    if (mode === 'MONTHLY') {
      const value = Number((effectiveTotal / 12).toFixed(2));
      setMonthValues(Array(12).fill(value));
      return;
    }

    if (mode === 'QUARTERLY') {
      const activeMonths = [1, 4, 7, 10];
      const per = Number((effectiveTotal / activeMonths.length).toFixed(2));
      setMonthValues(
        Array.from({ length: 12 }, (_, i) =>
          activeMonths.includes(i + 1) ? per : 0,
        ),
      );
      return;
    }

    if (mode === 'SEMESTER') {
      const activeMonths = [1, 7];
      const per = Number((effectiveTotal / activeMonths.length).toFixed(2));
      setMonthValues(
        Array.from({ length: 12 }, (_, i) =>
          activeMonths.includes(i + 1) ? per : 0,
        ),
      );
      return;
    }

    if (mode === 'YEARLY') {
      setMonthValues(
        Array.from({ length: 12 }, (_, i) => (i === 0 ? effectiveTotal : 0)),
      );
    }
  };

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<BudgetLineFormValues>({
    resolver: zodResolver(buildBudgetLineFormSchema(isBudgetAccountingEnabled)),
    defaultValues: {
      currency: 'EUR',
      status: 'DRAFT',
      budgetId,
      ...defaultValues,
    },
  });

  useEffect(() => {
    setValue('budgetId', budgetId);
  }, [budgetId, setValue]);

  useEffect(() => {
    if (submitError?.fieldErrors) {
      for (const [field, message] of Object.entries(submitError.fieldErrors)) {
        setError(field as keyof BudgetLineFormValues, { type: 'server', message });
      }
    }
  }, [submitError, setError]);

  const onInvalid = (errs: Partial<Record<keyof BudgetLineFormValues, { message?: string }>>) => {
    const first = Object.keys(errs)[0] as keyof BudgetLineFormValues | undefined;
    if (first) document.getElementById(String(first))?.focus();
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError.message}</AlertDescription>
          </Alert>
        )}

        {noGeneralLedger && (
          <Alert variant={isBudgetAccountingEnabled ? 'destructive' : 'default'}>
            <AlertDescription>
              Aucun compte comptable n&apos;est disponible pour le client.
              {isBudgetAccountingEnabled
                ? ' Créez un compte comptable ou contactez l\'administrateur.'
                : ' Vous pouvez néanmoins créer des lignes sans compte comptable.'}
            </AlertDescription>
          </Alert>
        )}
        {noEnvelopes && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center gap-x-1 gap-y-1">
              Il faut créer au moins une enveloppe avant de créer une ligne.
              <Link
                href={budgetEnvelopeNew(budgetId)}
                className="underline font-medium focus:outline-none focus:underline"
              >
                Créer une enveloppe
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexte & rattachement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Budget : {budgetLabel ?? budgetId}
            </p>
            <input type="hidden" {...register('budgetId')} value={budgetId} />

            <div className="space-y-2">
              <Label htmlFor="envelopeId">Enveloppe *</Label>
              <select
                id="envelopeId"
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register('envelopeId')}
                aria-invalid={!!errors.envelopeId}
                disabled={isEdit || noEnvelopes || envelopeSelectLoading}
              >
                <option value="">Sélectionner une enveloppe</option>
                {envelopeOptions.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
              {errors.envelopeId && <p className="text-sm text-destructive">{errors.envelopeId.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails de la ligne</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Ex. Ligne maintenance"
                  aria-invalid={!!errors.name}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" {...register('code')} aria-invalid={!!errors.code} />
                {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register('description')} aria-invalid={!!errors.description} />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expenseType">Type de dépense *</Label>
                <select
                  id="expenseType"
                  className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('expenseType')}
                  aria-invalid={!!errors.expenseType}
                  disabled={isEdit}
                >
                  {EXPENSE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.expenseType && <p className="text-sm text-destructive">{errors.expenseType.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="generalLedgerAccountId">
                  {isBudgetAccountingEnabled ? 'Compte comptable *' : 'Compte comptable (optionnel)'}
                </Label>
                <select
                  id="generalLedgerAccountId"
                  className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('generalLedgerAccountId')}
                  aria-invalid={!!errors.generalLedgerAccountId}
                  disabled={isBudgetAccountingEnabled && noGeneralLedger}
                >
                  <option value="">Sélectionner un compte</option>
                  {generalLedgerOptions.map((gla) => (
                    <option key={gla.id} value={gla.id}>
                      {gla.code} — {gla.name}
                    </option>
                  ))}
                </select>
                {errors.generalLedgerAccountId && (
                  <p className="text-sm text-destructive">{errors.generalLedgerAccountId.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Montants & statut</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="initialAmount">Montant initial *</Label>
                  {hasPlanning && (
                    <button
                      type="button"
                      onClick={() => setShowQuickCalculator(true)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Ouvrir la calculette de planning"
                    >
                      <Calculator className="size-3.5" />
                    </button>
                  )}
                </div>
                <Input
                  id="initialAmount"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register('initialAmount', { valueAsNumber: true })}
                  aria-invalid={!!errors.initialAmount}
                  disabled={isEdit}
                />
                {errors.initialAmount && <p className="text-sm text-destructive">{errors.initialAmount.message}</p>}
              </div>
              <div className="space-y-2">
                <div className="flex items_center justify-between gap-2">
                  <Label htmlFor="revisedAmount">Montant révisé</Label>
                  {hasPlanning && (
                    <button
                      type="button"
                      onClick={() => setShowQuickCalculator(true)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Ouvrir la calculette de planning"
                    >
                      <Calculator className="size-3.5" />
                    </button>
                  )}
                </div>
                <Input
                  id="revisedAmount"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register('revisedAmount', {
                    setValueAs: (v) =>
                      v === '' || v === undefined ? undefined : (Number(v) as number),
                  })}
                  aria-invalid={!!errors.revisedAmount}
                />
                {errors.revisedAmount && <p className="text-sm text-destructive">{errors.revisedAmount.message}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Devise *</Label>
                <Input id="currency" {...register('currency')} aria-invalid={!!errors.currency} />
                {errors.currency && <p className="text-sm text-destructive">{errors.currency.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('status')}
                  aria-invalid={!!errors.status}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <BudgetFormActions
          cancelHref={cancelHref}
          onCancel={onCancel}
          submitLabel={submitLabel}
          isSubmitting={isSubmitting}
          disableSubmit={!canSubmit}
        />
      </form>

      {hasPlanning && (
        <Dialog open={showQuickCalculator} onOpenChange={setShowQuickCalculator}>
          <DialogContent className="max-w-md sm:max-w-lg" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1">
                  <Calculator className="size-4" />
                  <span>Calculette rapide</span>
                </span>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setShowQuickCalculator(false)}
                  aria-label="Fermer la calculette"
                >
                  <X className="size-3.5" />
                </button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="text-xs text-muted-foreground">
                Saisissez une quantité et un prix unitaire, ou remplissez directement les montants par mois.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="calcQuantity">Quantité</Label>
                  <Input
                    id="calcQuantity"
                    type="number"
                    min={0}
                    step="0.01"
                    value={calcQuantity}
                    onChange={(e) =>
                      setCalcQuantity(e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="calcUnitPrice">Prix unitaire</Label>
                  <Input
                    id="calcUnitPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={calcUnitPrice}
                    onChange={(e) =>
                      setCalcUnitPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                  />
                </div>
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Répartition par mois.</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-6 px-2 text-[11px]"
                      disabled={effectiveTotal <= 0}
                      onClick={() => applySpread('MONTHLY')}
                    >
                      x12 mois
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-6 px-2 text-[11px]"
                      disabled={effectiveTotal <= 0}
                      onClick={() => applySpread('QUARTERLY')}
                    >
                      x4 trimestres
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-6 px-2 text-[11px]"
                      disabled={effectiveTotal <= 0}
                      onClick={() => applySpread('SEMESTER')}
                    >
                      x2 semestres
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-6 px-2 text-[11px]"
                      disabled={effectiveTotal <= 0}
                      onClick={() => applySpread('YEARLY')}
                    >
                      1 fois / an
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {MONTH_LABELS.map((label, index) => (
                    <div key={label} className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground leading-none">{label}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={monthValues[index]}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const parsed = raw === '' ? 0 : Number(raw);
                          setMonthValues((prev) => {
                            const next = [...prev];
                            next[index] = Number.isNaN(parsed) ? prev[index] : parsed;
                            return next;
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs sm:text-sm">
                  <span className="text-xs text-muted-foreground">Montant total</span>
                  <span className="font-semibold tabular-nums text-right">
                    {Number.isFinite(effectiveTotal) ? effectiveTotal.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setValue('initialAmount', effectiveTotal);
                    setShowQuickCalculator(false);
                  }}
                  disabled={effectiveTotal <= 0}
                >
                  Appliquer sur montant initial
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setValue('revisedAmount', effectiveTotal);
                    setShowQuickCalculator(false);
                  }}
                  disabled={effectiveTotal <= 0}
                >
                  Appliquer sur montant révisé
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
