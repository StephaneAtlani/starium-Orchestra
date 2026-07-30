'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { BudgetForm } from '../forms/budget-form';
import { BudgetStatusChangeDialog } from '../forms/budget-status-change-dialog';
import { useBudgetDetail } from '../../hooks/use-budgets';
import { useBudgetExerciseOptionsQuery } from '../../hooks/use-budget-exercise-options-query';
import { useCreateBudget } from '../../hooks/use-create-budget';
import { useUpdateBudget } from '../../hooks/use-update-budget';
import { budgetApiToForm } from '../../mappers/budget-form.mappers';
import { budgetList, budgetDetail } from '../../constants/budget-routes';
import type { CreateBudgetInput } from '../../schemas/create-budget.schema';
import type { ApiFormError } from '../../api/types';
import type { BudgetWorkflowStatus } from '../../constants/budget-workflow-status';
import type { ChildWorkflowCascadeCounts } from '../../types/budget-management.types';
import { budgetStatusChangeNeedsCascadeConfirmation } from '../../lib/budget-cascade-confirmation';

const ZERO_CASCADE_COUNTS: ChildWorkflowCascadeCounts = {
  draftEnvelopeCount: 0,
  pendingValidationEnvelopeCount: 0,
  draftLineCount: 0,
  pendingValidationLineCount: 0,
};

interface BudgetFormPageProps {
  mode: 'create' | 'edit';
  budgetId?: string;
}

export function BudgetFormPage({ mode, budgetId }: BudgetFormPageProps) {
  const { data: budget, isLoading, error } = useBudgetDetail(budgetId ?? null);
  const { data: exerciseOptionsData } = useBudgetExerciseOptionsQuery();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget(budgetId ?? null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<CreateBudgetInput | null>(null);

  const isEdit = mode === 'edit';
  const submitError: ApiFormError | null =
    (createMutation.error as ApiFormError) ?? (updateMutation.error as ApiFormError) ?? null;

  const exerciseOptions = exerciseOptionsData ?? [];
  const cancelHref = isEdit && budgetId ? budgetDetail(budgetId) : budgetList();

  if (isEdit && isLoading) {
    return (
      <>
        <PageHeader
          backHref={budgetList()}
          eyebrow="Pilotage › Budgets"
          title="Modifier le budget"
          description="Chargement du budget…"
        />
        <LoadingState rows={4} />
      </>
    );
  }

  if (isEdit && (error || (!isLoading && !budget))) {
    return (
      <>
        <PageHeader
          backHref={budgetList()}
          eyebrow="Pilotage › Budgets"
          title="Modifier le budget"
        />
        <ErrorState message="Ce budget n’existe pas ou vous n’avez pas les droits pour le consulter." />
      </>
    );
  }

  const defaultValues: Partial<CreateBudgetInput> =
    isEdit && budget
      ? budgetApiToForm(budget)
      : { currency: 'EUR', status: 'DRAFT', ownerUserId: '' };

  const handleSubmit = (values: CreateBudgetInput) => {
    if (!isEdit) {
      createMutation.mutate(values);
      return;
    }
    if (!budget) return;
    if (values.status !== budget.status) {
      setPendingSubmit(values);
      setStatusDialogOpen(true);
      return;
    }
    updateMutation.mutate({ values });
  };

  const confirmStatusChange = () => {
    if (!pendingSubmit || !budget) return;
    const counts = budget.childWorkflowCascadeCounts ?? ZERO_CASCADE_COUNTS;
    const needsCascade = budgetStatusChangeNeedsCascadeConfirmation(
      budget.status as BudgetWorkflowStatus,
      pendingSubmit.status as BudgetWorkflowStatus,
      counts,
    );
    updateMutation.mutate({
      values: pendingSubmit,
      cascadeChildWorkflowStatuses: needsCascade ? true : undefined,
    });
  };

  return (
    <>
      <PageHeader
        backHref={cancelHref}
        eyebrow="Pilotage › Budgets"
        title={isEdit ? 'Modifier le budget' : 'Nouveau budget'}
        description={
          isEdit && budget
            ? budget.name
            : 'Renseignez l’identité, le rattachement et le pilotage du budget.'
        }
      />
      <BudgetForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        cancelHref={cancelHref}
        submitError={submitError}
        exerciseOptions={exerciseOptions}
        editStatusFrom={isEdit && budget ? (budget.status as BudgetWorkflowStatus) : undefined}
        ownerUserFallback={
          isEdit && budget?.ownerUserId && budget.ownerUserName
            ? { id: budget.ownerUserId, label: budget.ownerUserName }
            : null
        }
      />
      {isEdit && budget && pendingSubmit ? (
        <BudgetStatusChangeDialog
          open={statusDialogOpen}
          onOpenChange={(open) => {
            setStatusDialogOpen(open);
            if (!open) setPendingSubmit(null);
          }}
          from={budget.status as BudgetWorkflowStatus}
          to={pendingSubmit.status as BudgetWorkflowStatus}
          counts={budget.childWorkflowCascadeCounts ?? ZERO_CASCADE_COUNTS}
          isSubmitting={updateMutation.isPending}
          onConfirm={confirmStatusChange}
        />
      ) : null}
    </>
  );
}
