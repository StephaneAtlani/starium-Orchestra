'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function BudgetDashboardSkeleton() {
  return (
    <div className="space-y-8" data-testid="budget-dashboard-loading">
      <div className="rounded-2xl border border-border/80 bg-muted/20 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-2xl bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-56 rounded-lg bg-muted" />
              <Skeleton className="h-4 w-80 max-w-full rounded bg-muted" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-xl rounded-lg bg-muted" />
        </div>
      </div>

      <Skeleton className="h-36 rounded-2xl bg-muted" />

      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg bg-muted" />
          <Skeleton className="h-4 w-72 rounded bg-muted" />
        </div>
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4"
          data-testid="budget-dashboard-kpis"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl bg-muted" />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-7 w-64 rounded-lg bg-muted" />
        <Skeleton className="h-52 rounded-2xl bg-muted" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-7 w-72 rounded-lg bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl bg-muted" />
          <Skeleton className="h-64 rounded-2xl bg-muted" />
        </div>
        <Skeleton className="h-56 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
