'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';

export default function BudgetImportsPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Imports budget"
          description="Importer des données budgétaires (squelette)."
        />
        <BudgetEmptyState
          title="Contenu à venir"
          description="L’import budget sera implémenté dans une RFC dédiée."
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
