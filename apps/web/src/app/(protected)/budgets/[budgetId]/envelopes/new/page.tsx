'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetEnvelopeFormPage } from '@/features/budgets/components/pages/budget-envelope-form-page';

export default function NewBudgetEnvelopePage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : undefined;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetEnvelopeFormPage mode="create" budgetId={budgetId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
