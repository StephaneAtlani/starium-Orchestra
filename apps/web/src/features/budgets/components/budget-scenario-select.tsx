'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * MVP Forecast : baseline seule — pas de sélection métier côté front.
 * Les autres scénarios seront branchés quand l’API le permettra.
 */
export function BudgetScenarioSelect({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-2 text-sm', className)}
      aria-label="Scénario forecast"
    >
      <span className="text-muted-foreground">Scénario</span>
      <span className="font-medium text-foreground">Baseline</span>
      <span className="text-xs text-muted-foreground">(Révisé, Optimiste, Pessimiste — À venir)</span>
    </div>
  );
}
