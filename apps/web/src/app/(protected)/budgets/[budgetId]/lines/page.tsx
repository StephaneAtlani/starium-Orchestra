'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';

export default function BudgetLinesPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Lignes budgétaires"
          description={`Budget ${budgetId} — liste des lignes (squelette).`}
        />
        <BudgetEmptyState
          title="Contenu à venir"
          description="La liste des lignes budgétaires sera implémentée dans une RFC dédiée."
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
