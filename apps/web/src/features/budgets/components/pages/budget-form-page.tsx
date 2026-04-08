'use client';

import { BudgetPageHeader } from '../budget-page-header';
import { BudgetEmptyState } from '../budget-empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { BudgetForm } from '../forms/budget-form';
import { useBudgetDetail } from '../../hooks/use-budgets';
import { useBudgetExerciseOptionsQuery } from '../../hooks/use-budget-exercise-options-query';
import { useCreateBudget } from '../../hooks/use-create-budget';
import { useUpdateBudget } from '../../hooks/use-update-budget';
import { budgetApiToForm } from '../../mappers/budget-form.mappers';
import { budgetList, budgetDetail } from '../../constants/budget-routes';
import type { CreateBudgetInput } from '../../schemas/create-budget.schema';
import type { ApiFormError } from '../../api/types';
import type { BudgetWorkflowStatus } from '../../constants/budget-workflow-status';

interface BudgetFormPageProps {
  mode: 'create' | 'edit';
  budgetId?: string;
}

export function BudgetFormPage({ mode, budgetId }: BudgetFormPageProps) {
  const { data: budget, isLoading, error, refetch } = useBudgetDetail(budgetId ?? null);
  const { data: exerciseOptionsData } = useBudgetExerciseOptionsQuery();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget(budgetId ?? null);

  const isEdit = mode === 'edit';
  const submitError: ApiFormError | null =
    (createMutation.error as ApiFormError) ?? (updateMutation.error as ApiFormError) ?? null;

  const exerciseOptions = exerciseOptionsData ?? [];

  if (isEdit && isLoading) {
    return (
      <>
        <BudgetPageHeader title="Modifier le budget" description="Chargement…" />
        <LoadingState rows={3} />
      </>
    );
  }

  if (isEdit && (error || (!isLoading && !budget))) {
    return (
      <>
        <BudgetPageHeader title="Modifier le budget" />
        <BudgetEmptyState title="Aucun budget à afficher" description="" />
      </>
    );
  }

  const defaultValues: Partial<CreateBudgetInput> = isEdit && budget
    ? budgetApiToForm(budget)
    : { currency: 'EUR', status: 'DRAFT' };

  const handleSubmit = (values: CreateBudgetInput) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const cancelHref = isEdit && budgetId ? budgetDetail(budgetId) : budgetList();

  return (
    <>
      <BudgetPageHeader
        title={isEdit ? 'Modifier le budget' : 'Nouveau budget'}
        description={isEdit && budget ? budget.name : 'Créez un nouveau budget.'}
      />
      <BudgetForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        cancelHref={cancelHref}
        submitError={submitError}
        exerciseOptions={exerciseOptions}
        editStatusFrom={isEdit && budget ? (budget.status as BudgetWorkflowStatus) : undefined}
      />
    </>
  );
}
