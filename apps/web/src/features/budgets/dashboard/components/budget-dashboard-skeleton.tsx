'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function BudgetDashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="budget-dashboard-loading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-64 rounded-lg bg-muted" />
        <Skeleton className="h-10 w-full max-w-md rounded-lg bg-muted" />
      </div>
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        data-testid="budget-dashboard-kpis"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-2xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl bg-muted" />
        <Skeleton className="h-48 rounded-2xl bg-muted" />
      </div>
      <Skeleton className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}
