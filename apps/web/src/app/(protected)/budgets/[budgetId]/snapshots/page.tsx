'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';

export default function BudgetSnapshotsPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Snapshots"
          description={`Budget ${budgetId} — snapshots (squelette).`}
        />
        <BudgetEmptyState
          title="Contenu à venir"
          description="Les snapshots budget seront implémentés dans une RFC dédiée."
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
