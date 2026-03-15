'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';

export default function BudgetReallocationsPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Réallocations"
          description={`Budget ${budgetId} — réallocations (squelette).`}
        />
        <BudgetEmptyState
          title="Contenu à venir"
          description="Les réallocations budget seront implémentées dans une RFC dédiée."
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
