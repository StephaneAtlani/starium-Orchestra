'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetVersionsPageContent } from '@/features/budgets/components/budget-versions/budget-versions-page-content';

export default function BudgetVersionsPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Versions"
          description="Lignée de versions, baseline et révisions — comparaison alignée sur le même ensemble."
        />
        {budgetId ? <BudgetVersionsPageContent budgetId={budgetId} /> : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
