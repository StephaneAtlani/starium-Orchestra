'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createBudgetSchema, type CreateBudgetInput } from '../../schemas/create-budget.schema';
import { BudgetFormActions } from './budget-form-actions';
import type { ApiFormError } from '../../api/types';
import {
  BUDGET_WORKFLOW_STATUSES,
  BUDGET_WORKFLOW_STATUS_LABELS,
} from '../../constants/budget-workflow-status';

const CURRENCY_OPTIONS = [{ value: 'EUR', label: 'EUR' }];
const STATUS_OPTIONS = BUDGET_WORKFLOW_STATUSES.map((value) => ({
  value,
  label: BUDGET_WORKFLOW_STATUS_LABELS[value],
}));

interface BudgetFormProps {
  defaultValues: Partial<CreateBudgetInput>;
  onSubmit: (values: CreateBudgetInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelHref: string;
  submitError?: ApiFormError | null;
  exerciseOptions: { id: string; name: string; code: string | null }[];
}

export function BudgetForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
  cancelHref,
  submitError,
  exerciseOptions,
}: BudgetFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateBudgetInput>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      currency: 'EUR',
      status: 'DRAFT',
      taxMode: 'HT',
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (submitError?.fieldErrors) {
      for (const [field, message] of Object.entries(submitError.fieldErrors)) {
        setError(field as keyof CreateBudgetInput, { type: 'server', message });
      }
    }
  }, [submitError, setError]);

  const onInvalid = (errs: Partial<Record<keyof CreateBudgetInput, { message?: string }>>) => {
    const first = Object.keys(errs)[0] as keyof CreateBudgetInput | undefined;
    if (first) document.getElementById(String(first))?.focus();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rattachement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exerciseId">Exercice *</Label>
            <select
              id="exerciseId"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('exerciseId')}
              aria-invalid={!!errors.exerciseId}
            >
              <option value="">Sélectionner un exercice</option>
              {exerciseOptions.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                  {ex.code ? ` (${ex.code})` : ''}
                </option>
              ))}
            </select>
            {errors.exerciseId && <p className="text-sm text-destructive">{errors.exerciseId.message}</p>}
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
            <Input id="name" {...register('name')} placeholder="Ex. Budget SI" aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...register('code')} placeholder="Ex. BUD-2025" aria-invalid={!!errors.code} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} placeholder="Description optionnelle" aria-invalid={!!errors.description} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilotage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Devise *</Label>
            <select
              id="currency"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('currency')}
              aria-invalid={!!errors.currency}
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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

          <div className="space-y-2">
            <Label htmlFor="taxMode">Mode fiscal du budget</Label>
            <select
              id="taxMode"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('taxMode')}
              aria-invalid={!!errors.taxMode}
            >
              <option value="HT">HT</option>
              <option value="TTC">TTC</option>
            </select>
            {errors.taxMode && <p className="text-sm text-destructive">{errors.taxMode.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultTaxRate">TVA par défaut (%)</Label>
            <Input
              id="defaultTaxRate"
              type="number"
              step="0.01"
              placeholder="Ex. 20"
              {...register('defaultTaxRate')}
              aria-invalid={!!errors.defaultTaxRate}
            />
            {errors.defaultTaxRate && (
              <p className="text-sm text-destructive">{errors.defaultTaxRate.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <BudgetFormActions cancelHref={cancelHref} submitLabel={submitLabel} isSubmitting={isSubmitting} />
    </form>
  );
}
