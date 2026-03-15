'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetExerciseFormPage } from '@/features/budgets/components/pages/budget-exercise-form-page';

export default function EditBudgetExercisePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : undefined;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetExerciseFormPage mode="edit" id={id} />
      </PageContainer>
    </RequireActiveClient>
  );
}
