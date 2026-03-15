'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetExerciseFormPage } from '@/features/budgets/components/pages/budget-exercise-form-page';

export default function NewBudgetExercisePage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetExerciseFormPage mode="create" />
      </PageContainer>
    </RequireActiveClient>
  );
}
