'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ErrorState } from '@/components/feedback/error-state';
import { BudgetImportPage } from '@/features/budgets/budget-import/budget-import-page';

export default function BudgetImportRoutePage() {
  const p = useParams();
  const budgetId = typeof p.budgetId === 'string' ? p.budgetId : null;

  if (!budgetId) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <ErrorState message="Budget introuvable — identifiant manquant." />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  return <BudgetImportPage budgetId={budgetId} />;
}
