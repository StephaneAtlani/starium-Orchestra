'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetLineFormPage } from '@/features/budgets/components/pages/budget-line-form-page';

export default function NewBudgetLinePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : undefined;
  const envelopeId = searchParams.get('envelopeId') ?? undefined;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetLineFormPage mode="create" budgetId={budgetId} envelopeId={envelopeId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
