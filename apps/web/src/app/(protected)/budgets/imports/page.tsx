'use client';

import { Suspense } from 'react';
import { BudgetImportHubPage } from '@/features/budgets/import-hub/budget-import-hub-page';
import { LoadingState } from '@/components/feedback/loading-state';

export default function BudgetsImportsPage() {
  return (
    <Suspense fallback={<LoadingState rows={3} />}>
      <BudgetImportHubPage />
    </Suspense>
  );
}
