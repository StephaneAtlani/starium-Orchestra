'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { BudgetPilotageMode } from '../types/budget-pilotage.types';

export interface BudgetViewTabsProps {
  mode: BudgetPilotageMode;
  onModeChange: (mode: BudgetPilotageMode) => void;
  className?: string;
}

const ITEMS: { id: BudgetPilotageMode; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'synthese', label: 'Synthèse' },
  { id: 'previsionnel', label: 'Prévisionnel' },
  { id: 'atterrissage', label: 'Atterrissage' },
  { id: 'forecast', label: 'Forecast' },
];

export function BudgetViewTabs({ mode, onModeChange, className }: BudgetViewTabsProps) {
  return (
    <div
      role="tablist"
      className={cn('flex flex-wrap gap-1', className)}
      aria-label="Mode d’affichage du tableau budget"
    >
      {ITEMS.map((item) => {
        const selected = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onModeChange(item.id)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center rounded-md px-3 text-sm font-medium transition-colors',
              selected
                ? 'border border-border bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
