'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetFormPage } from '@/features/budgets/components/pages/budget-form-page';

export default function EditBudgetPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : undefined;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetFormPage mode="edit" budgetId={budgetId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
