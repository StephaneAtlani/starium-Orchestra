'use client';

import { BudgetPageHeader } from '../budget-page-header';
import { BudgetEmptyState } from '../budget-empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { BudgetLineForm } from '../forms/budget-line-form';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useQuery } from '@tanstack/react-query';
import { getLine } from '../../api/budget-management.api';
import { useBudgetEnvelopesAll } from '../../hooks/use-budget-envelopes';
import { useBudgetDetail } from '../../hooks/use-budgets';
import { useGeneralLedgerAccountOptions } from '../../hooks/use-general-ledger-account-options';
import { useCreateBudgetLine } from '../../hooks/use-create-budget-line';
import { useUpdateBudgetLine } from '../../hooks/use-update-budget-line';
import { lineApiToForm } from '../../mappers/budget-form.mappers';
import { budgetDetail } from '../../constants/budget-routes';
import type { BudgetLineFormValues } from '../../schemas/budget-line-form.schema';
import type { ApiFormError } from '../../api/types';

interface BudgetLineFormPageProps {
  mode: 'create' | 'edit';
  budgetId?: string;
  envelopeId?: string;
  lineId?: string;
  variant?: 'page' | 'embedded';
  onCloseEmbedded?: () => void;
}

export function BudgetLineFormPage({
  mode,
  budgetId,
  envelopeId,
  lineId,
  variant = 'page',
  onCloseEmbedded,
}: BudgetLineFormPageProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const { data: line, isLoading, error, refetch } = useQuery({
    queryKey: ['budget-line-detail', clientId, lineId],
    queryFn: () => getLine(authFetch, lineId!),
    enabled: mode === 'edit' && !!lineId && !!clientId,
  });

  const resolvedBudgetId = budgetId ?? line?.budgetId;
  const { data: budget } = useBudgetDetail(resolvedBudgetId ?? null);
  const envelopesQuery = useBudgetEnvelopesAll(resolvedBudgetId ?? null);
  const { data: generalLedgerData } = useGeneralLedgerAccountOptions();

  const envelopeOptions = envelopesQuery.data ?? [];
  const isEnvelopeOptionsLoading = envelopesQuery.isLoading;
  const isEnvelopeOptionsSuccess = envelopesQuery.isSuccess;
  const generalLedgerOptions = generalLedgerData?.items ?? [];

  const createMutation = useCreateBudgetLine(resolvedBudgetId ?? null);
  const updateMutation = useUpdateBudgetLine(lineId ?? null, resolvedBudgetId ?? null);

  const isEdit = mode === 'edit';
  const submitError: ApiFormError | null =
    (createMutation.error as ApiFormError) ?? (updateMutation.error as ApiFormError) ?? null;

  if (isEdit && isLoading) {
    return (
      variant === 'page' ? (
        <>
          <BudgetPageHeader title="Modifier la ligne" description="Chargement…" />
          <LoadingState rows={3} />
        </>
      ) : (
        <LoadingState rows={3} />
      )
    );
  }

  if (isEdit && (error || (!isLoading && !line))) {
    return (
      variant === 'page' ? (
        <>
          <BudgetPageHeader title="Modifier la ligne" />
          <BudgetEmptyState title="Aucune ligne à afficher" description="" />
        </>
      ) : (
        <BudgetEmptyState title="Aucune ligne à afficher" description="" />
      )
    );
  }

  if (!resolvedBudgetId) {
    return (
      variant === 'page' ? (
        <>
          <BudgetPageHeader title="Ligne" />
          <BudgetEmptyState title="Aucun budget à afficher" description="" />
        </>
      ) : (
        <BudgetEmptyState title="Aucun budget à afficher" description="" />
      )
    );
  }

  const defaultValues: Partial<BudgetLineFormValues> = isEdit && line
    ? lineApiToForm(line)
    : { budgetId: resolvedBudgetId, envelopeId, currency: 'EUR', status: 'DRAFT' };

  const handleSubmit = (values: BudgetLineFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const cancelHref = budgetDetail(resolvedBudgetId);
  const budgetLabel = budget?.name ?? resolvedBudgetId;

  return (
    <>
      {variant === 'page' && (
        <BudgetPageHeader
          title={isEdit ? 'Modifier la ligne' : 'Nouvelle ligne budgétaire'}
          description={isEdit && line ? line.name : 'Créez une ligne pour ce budget.'}
        />
      )}
      <BudgetLineForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        cancelHref={variant === 'page' ? cancelHref : undefined}
        onCancel={variant === 'embedded' ? onCloseEmbedded : undefined}
        submitError={submitError}
        budgetId={resolvedBudgetId}
        budgetLabel={budgetLabel}
        isEdit={isEdit}
        envelopeOptions={envelopeOptions.map((e) => ({ id: e.id, name: e.name }))}
        envelopeOptionsLoading={isEnvelopeOptionsLoading}
        envelopeOptionsSuccess={isEnvelopeOptionsSuccess}
        generalLedgerOptions={generalLedgerOptions}
      />
    </>
  );
}
