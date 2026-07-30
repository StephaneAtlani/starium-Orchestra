'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';

export default function BudgetVersionsPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Versions"
          description="Versioning du budget (squelette)."
        />
        <BudgetEmptyState
          title="Contenu à venir"
          description="Le versioning budget sera implémenté dans une RFC dédiée."
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
