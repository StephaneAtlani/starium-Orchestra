'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetLineFormPage } from '@/features/budgets/components/pages/budget-line-form-page';

export default function EditBudgetLinePage() {
  const params = useParams();
  const lineId = typeof params.lineId === 'string' ? params.lineId : undefined;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetLineFormPage mode="edit" lineId={lineId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
