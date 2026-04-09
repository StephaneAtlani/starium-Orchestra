'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createEnvelopeSchema, type CreateEnvelopeInput } from '../../schemas/create-envelope.schema';
import { BudgetFormActions } from './budget-form-actions';
import { BudgetValidationWorkflowStrip } from './budget-validation-workflow-strip';
import { useBudgetDetail } from '../../hooks/use-budgets';
import type { BudgetWorkflowStatus } from '../../constants/budget-workflow-status';
import type { ApiFormError } from '../../api/types';

const TYPE_OPTIONS = [
  { value: 'RUN', label: 'RUN' },
  { value: 'BUILD', label: 'BUILD' },
  { value: 'TRANSVERSE', label: 'TRANSVERSE' },
] as const;

interface BudgetEnvelopeFormProps {
  defaultValues: Partial<CreateEnvelopeInput>;
  onSubmit: (values: CreateEnvelopeInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelHref: string;
  submitError?: ApiFormError | null;
  /** budgetId en création : affiché en lecture seule */
  budgetId?: string;
}

export function BudgetEnvelopeForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
  cancelHref,
  submitError,
  budgetId,
}: BudgetEnvelopeFormProps) {
  const { data: budgetContext, isLoading: budgetContextLoading } = useBudgetDetail(
    budgetId ?? null,
  );

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<CreateEnvelopeInput>({
    resolver: zodResolver(createEnvelopeSchema),
    defaultValues: {
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (budgetId) setValue('budgetId', budgetId);
  }, [budgetId, setValue]);

  useEffect(() => {
    if (submitError?.fieldErrors) {
      for (const [field, message] of Object.entries(submitError.fieldErrors)) {
        setError(field as keyof CreateEnvelopeInput, { type: 'server', message });
      }
    }
  }, [submitError, setError]);

  const onInvalid = (errs: Partial<Record<keyof CreateEnvelopeInput, { message?: string }>>) => {
    const first = Object.keys(errs)[0] as keyof CreateEnvelopeInput | undefined;
    if (first) document.getElementById(String(first))?.focus();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>
            {typeof submitError.message === 'string'
              ? submitError.message
              : JSON.stringify(submitError.message)}
          </AlertDescription>
        </Alert>
      )}

      {budgetId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Budget : {budgetId}</p>
            <input type="hidden" {...register('budgetId')} value={budgetId} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" {...register('name')} placeholder="Ex. Enveloppe RUN" aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" {...register('code')} placeholder="Ex. ENV-01" aria-invalid={!!errors.code} />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} aria-invalid={!!errors.description} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <select
              id="type"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('type')}
              aria-invalid={!!errors.type}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">État *</Label>
            <select
              id="status"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register('status')}
              aria-invalid={!!errors.status}
            >
              <option value="DRAFT">Brouillon</option>
              <option value="ACTIVE">Actif</option>
              <option value="CLOSED">Clôturé</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
            {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
          </div>
        </CardContent>
      </Card>

      {!!budgetId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow de validation du budget</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetContextLoading ? (
              <p className="text-sm text-muted-foreground">Chargement du contexte…</p>
            ) : (
              <BudgetValidationWorkflowStrip
                currentStatus={budgetContext?.status as BudgetWorkflowStatus | undefined}
              />
            )}
          </CardContent>
        </Card>
      )}

      <BudgetFormActions cancelHref={cancelHref} submitLabel={submitLabel} isSubmitting={isSubmitting} />
    </form>
  );
}
