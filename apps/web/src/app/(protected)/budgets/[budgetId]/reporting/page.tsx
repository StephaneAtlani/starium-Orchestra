'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { BudgetReportingForecastPage } from '@/features/budgets/forecast/budget-reporting-forecast-page';

export default function BudgetReportingPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';

  return (
    <RequireActiveClient>
      {budgetId ? (
        <BudgetReportingForecastPage budgetId={budgetId} />
      ) : (
        <div className="p-6 text-sm text-muted-foreground">Budget introuvable.</div>
      )}
    </RequireActiveClient>
  );
}
