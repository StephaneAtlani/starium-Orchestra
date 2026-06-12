'use client';

import React from 'react';
export function ForecastKpiSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      data-testid="forecast-kpi-skeleton"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="starium-kpi-card space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
