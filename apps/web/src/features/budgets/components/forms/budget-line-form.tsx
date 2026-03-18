'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface BudgetLineFormProps {
  defaultValues: Partial<BudgetLineFormValues>;
  onSubmit: (values: BudgetLineFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelHref: string;
  submitError?: ApiFormError | null;
  budgetId: string;
  budgetLabel?: string;
  isEdit?: boolean;
  envelopeOptions: { id: string; name: string }[];
  envelopeOptionsLoading?: boolean;
  /** true quand la requête enveloppes a réussi (évite d’afficher l’alerte pendant le chargement ou si la query est désactivée). */
  envelopeOptionsSuccess?: boolean;
  generalLedgerOptions: GeneralLedgerAccountOption[];
  /** Interprétation côté backend des montants saisis (conversion TTC -> HT si besoin). */
  budgetTaxMode?: 'HT' | 'TTC';
}

export function BudgetLineForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
  cancelHref,
  submitError,
  budgetId,
  budgetLabel,
  isEdit = false,
  envelopeOptions,
  envelopeOptionsLoading = false,
  envelopeOptionsSuccess = false,
  generalLedgerOptions,
  budgetTaxMode = 'HT',
}: BudgetLineFormProps) {
  const noEnvelopes = envelopeOptionsSuccess && envelopeOptions.length === 0;
  const envelopeSelectLoading = !envelopeOptionsSuccess || envelopeOptionsLoading;
  const noGeneralLedger = generalLedgerOptions.length === 0;
  const { activeClient } = useActiveClient();
  const isBudgetAccountingEnabled = activeClient?.budgetAccountingEnabled ?? false;
  const canSubmit = !noEnvelopes && (isBudgetAccountingEnabled ? !noGeneralLedger : true);

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
          <CardTitle className="text-base">Contexte</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Budget : {budgetLabel ?? budgetId}
          </p>
          <input type="hidden" {...register('budgetId')} value={budgetId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rattachement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <CardTitle className="text-base">Identité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" {...register('name')} placeholder="Ex. Ligne maintenance" aria-invalid={!!errors.name} />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nature de dépense</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Montants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initialAmount">
              {budgetTaxMode === 'TTC'
                ? 'Montant initial TTC *'
                : 'Montant initial HT *'}
            </Label>
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
            <Label htmlFor="revisedAmount">
              {budgetTaxMode === 'TTC'
                ? 'Montant révisé TTC'
                : 'Montant révisé HT'}
            </Label>
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
        </CardContent>
      </Card>

      <BudgetFormActions
        cancelHref={cancelHref}
        submitLabel={submitLabel}
        isSubmitting={isSubmitting}
        disableSubmit={!canSubmit}
      />
    </form>
  );
}
