'use client';

import { BudgetPageHeader } from '../budget-page-header';
import { BudgetErrorState } from '../budget-error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { BudgetEnvelopeForm } from '../forms/budget-envelope-form';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useQuery } from '@tanstack/react-query';
import { budgetQueryKeys } from '../../lib/budget-query-keys';
import { getEnvelope } from '../../api/budget-management.api';
import { useCreateBudgetEnvelope } from '../../hooks/use-create-budget-envelope';
import { useUpdateBudgetEnvelope } from '../../hooks/use-update-budget-envelope';
import { envelopeApiToForm } from '../../mappers/budget-form.mappers';
import { budgetDetail } from '../../constants/budget-routes';
import type { CreateEnvelopeInput } from '../../schemas/create-envelope.schema';
import type { ApiFormError } from '../../api/types';

interface BudgetEnvelopeFormPageProps {
  mode: 'create' | 'edit';
  budgetId?: string;
  envelopeId?: string;
}

export function BudgetEnvelopeFormPage({ mode, budgetId, envelopeId }: BudgetEnvelopeFormPageProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const { data: envelope, isLoading, error, refetch } = useQuery({
    queryKey: ['budget-envelope-detail', clientId, envelopeId],
    queryFn: () => getEnvelope(authFetch, envelopeId!),
    enabled: mode === 'edit' && !!envelopeId && !!clientId,
  });

  const createMutation = useCreateBudgetEnvelope(budgetId ?? null);
  const updateMutation = useUpdateBudgetEnvelope(envelopeId ?? null, envelope?.budgetId ?? budgetId ?? null);

  const isEdit = mode === 'edit';
  const submitError: ApiFormError | null =
    (createMutation.error as ApiFormError) ?? (updateMutation.error as ApiFormError) ?? null;

  const resolvedBudgetId = budgetId ?? envelope?.budgetId;

  if (isEdit && isLoading) {
    return (
      <>
        <BudgetPageHeader title="Modifier l'enveloppe" description="Chargement…" />
        <LoadingState rows={3} />
      </>
    );
  }

  if (isEdit && (error || (!isLoading && !envelope))) {
    return (
      <>
        <BudgetPageHeader title="Modifier l'enveloppe" />
        <BudgetErrorState
          message={error instanceof Error ? error.message : 'Enveloppe non trouvée.'}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  const defaultValues: Partial<CreateEnvelopeInput> = isEdit && envelope
    ? envelopeApiToForm(envelope)
    : resolvedBudgetId ? { budgetId: resolvedBudgetId } : {};

  const handleSubmit = (values: CreateEnvelopeInput) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const cancelHref = resolvedBudgetId ? budgetDetail(resolvedBudgetId) : '/budgets';

  return (
    <>
      <BudgetPageHeader
        title={isEdit ? "Modifier l'enveloppe" : 'Nouvelle enveloppe'}
        description={isEdit && envelope ? envelope.name : 'Créez une enveloppe pour ce budget.'}
      />
      <BudgetEnvelopeForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        cancelHref={cancelHref}
        submitError={submitError}
        budgetId={resolvedBudgetId}
      />
    </>
  );
}
