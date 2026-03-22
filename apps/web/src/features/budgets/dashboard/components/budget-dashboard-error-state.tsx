'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CockpitSurfaceCard } from './budget-cockpit-primitives';

export function BudgetDashboardErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <CockpitSurfaceCard
      title="Chargement impossible"
      description="La vue cockpit n’a pas pu être récupérée."
      icon={AlertCircle}
      accent="rose"
      className="border-destructive/25 bg-destructive/[0.03]"
      headerClassName="bg-destructive/[0.06]"
      data-testid="budget-dashboard-error"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-foreground">{message}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
      </div>
    </CockpitSurfaceCard>
  );
}
