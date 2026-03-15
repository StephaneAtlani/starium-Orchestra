'use client';

import { BudgetPageHeader } from '../budget-page-header';
import { BudgetErrorState } from '../budget-error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { BudgetExerciseForm } from '../forms/budget-exercise-form';
import { useExerciseDetail } from '../../hooks/use-exercise-detail';
import { useCreateBudgetExercise } from '../../hooks/use-create-budget-exercise';
import { useUpdateBudgetExercise } from '../../hooks/use-update-budget-exercise';
import { exerciseApiToForm } from '../../mappers/budget-form.mappers';
import { budgetExercisesList } from '../../constants/budget-routes';
import type { BudgetExerciseFormValues } from '../../schemas/budget-exercise-form.schema';
import type { ApiFormError } from '../../api/types';

interface BudgetExerciseFormPageProps {
  mode: 'create' | 'edit';
  id?: string;
}

export function BudgetExerciseFormPage({ mode, id }: BudgetExerciseFormPageProps) {
  const { data: exercise, isLoading, error, refetch } = useExerciseDetail(id ?? null);
  const createMutation = useCreateBudgetExercise();
  const updateMutation = useUpdateBudgetExercise(id ?? null);

  const isEdit = mode === 'edit';
  const submitError: ApiFormError | null =
    (createMutation.error as ApiFormError) ?? (updateMutation.error as ApiFormError) ?? null;

  if (isEdit && isLoading) {
    return (
      <>
        <BudgetPageHeader title="Modifier l'exercice" description="Chargement…" />
        <LoadingState rows={3} />
      </>
    );
  }

  if (isEdit && (error || (!isLoading && !exercise))) {
    return (
      <>
        <BudgetPageHeader title="Modifier l'exercice" />
        <BudgetErrorState
          message={error instanceof Error ? error.message : 'Exercice non trouvé.'}
          onRetry={() => void refetch()}
        />
      </>
    );
  }

  const defaultValues: Partial<BudgetExerciseFormValues> = isEdit && exercise
    ? exerciseApiToForm(exercise)
    : { status: 'DRAFT' };

  const handleSubmit = (values: BudgetExerciseFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <>
      <BudgetPageHeader
        title={isEdit ? "Modifier l'exercice" : 'Nouvel exercice budgétaire'}
        description={isEdit && exercise ? exercise.name : 'Créez un nouvel exercice.'}
      />
      <BudgetExerciseForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        cancelHref={budgetExercisesList()}
        submitError={submitError}
      />
    </>
  );
}
