'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { budgetLineFormSchema, type BudgetLineFormValues } from '../../schemas/budget-line-form.schema';
import { BudgetFormActions } from './budget-form-actions';
import type { ApiFormError } from '../../api/types';
import type { GeneralLedgerAccountOption } from '../../api/general-ledger-accounts.api';

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
  envelopeOptions: { id: string; name: string }[];
  generalLedgerOptions: GeneralLedgerAccountOption[];
}

export function BudgetLineForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
  cancelHref,
  submitError,
  budgetId,
  envelopeOptions,
  generalLedgerOptions,
}: BudgetLineFormProps) {
  const noEnvelopes = envelopeOptions.length === 0;
  const noGeneralLedger = generalLedgerOptions.length === 0;
  const canSubmit = !noEnvelopes && !noGeneralLedger;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<BudgetLineFormValues>({
    resolver: zodResolver(budgetLineFormSchema),
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
        <Alert variant="destructive">
          <AlertDescription>
            Aucun compte comptable n&apos;est disponible pour le client. Créez un compte comptable ou contactez l&apos;administrateur.
          </AlertDescription>
        </Alert>
      )}
      {noEnvelopes && (
        <Alert variant="destructive">
          <AlertDescription>
            Il faut créer au moins une enveloppe avant de créer une ligne.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contexte</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Budget : {budgetId}</p>
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
              disabled={noEnvelopes}
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
            <Label htmlFor="generalLedgerAccountId">Compte comptable *</Label>
            <select
              id="generalLedgerAccountId"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('generalLedgerAccountId')}
              aria-invalid={!!errors.generalLedgerAccountId}
              disabled={noGeneralLedger}
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
            <Label htmlFor="initialAmount">Montant initial *</Label>
            <Input
              id="initialAmount"
              type="number"
              step="0.01"
              min={0}
              {...register('initialAmount', { valueAsNumber: true })}
              aria-invalid={!!errors.initialAmount}
            />
            {errors.initialAmount && <p className="text-sm text-destructive">{errors.initialAmount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="revisedAmount">Montant révisé</Label>
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
