'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetLineFormPage } from '@/features/budgets/components/pages/budget-line-form-page';

export default function NewBudgetLinePage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : undefined;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetLineFormPage mode="create" budgetId={budgetId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
