'use client';

import React, { Suspense } from 'react';
import { BudgetDashboardPage } from '@/features/budgets/dashboard/budget-dashboard-page';
import { BudgetDashboardSkeleton } from '@/features/budgets/dashboard/components/budget-dashboard-skeleton';

export default function Page() {
  return (
    <Suspense fallback={<BudgetDashboardSkeleton />}>
      <BudgetDashboardPage />
    </Suspense>
  );
}
