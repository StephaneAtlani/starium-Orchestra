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
  { id: 'forecast', label: 'Synthèse prévision' },
  { id: 'comparaison', label: 'Comparaison' },
  { id: 'decisions', label: 'Historique' },
];

export function BudgetViewTabs({ mode, onModeChange, className }: BudgetViewTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex w-full max-w-full flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/35 p-1 shadow-inner',
        className,
      )}
      aria-label="Mode d’affichage du budget : synthèse, prévisionnel, atterrissage, synthèse prévision, comparaison ou historique"
    >
      {ITEMS.map((item) => {
        const selected = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onModeChange(item.id)}
            className={cn(
              'relative inline-flex min-h-8 shrink-0 items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-tight transition-colors sm:min-h-9 sm:px-3 sm:text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              selected
                ? 'bg-background text-foreground shadow-sm ring-1 ring-black/[0.07] dark:bg-background dark:ring-white/[0.12]'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
