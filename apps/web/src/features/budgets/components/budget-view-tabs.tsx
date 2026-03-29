'use client';

import { cn } from '@/lib/utils';
import type { BudgetPilotageView } from '../types/budget-pilotage.types';

const VIEW_ITEMS: { value: BudgetPilotageView; label: string }[] = [
  { value: 'previsionnel', label: 'Prévisionnel' },
  { value: 'atterrissage', label: 'Atterrissage' },
  { value: 'forecast', label: 'Forecast' },
];

export interface BudgetViewTabsProps {
  value: BudgetPilotageView;
  onValueChange: (v: BudgetPilotageView) => void;
  className?: string;
}

/**
 * Sélecteur de vue métier (RFC-024) — boutons tablist, pas de panneaux ici (tableau unique en dessous).
 */
export function BudgetViewTabs({ value, onValueChange, className }: BudgetViewTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Vue pilotage budgétaire"
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-muted p-[3px] text-muted-foreground',
        className,
      )}
    >
      {VIEW_ITEMS.map((item) => {
        const selected = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`budget-pilotage-view-${item.value}`}
            tabIndex={selected ? 0 : -1}
            className={cn(
              'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-md border border-transparent px-2.5 py-0.5 text-sm font-medium whitespace-nowrap transition-colors',
              selected
                ? 'border-transparent bg-background text-foreground shadow-sm'
                : 'text-foreground/60 hover:text-foreground',
            )}
            onClick={() => onValueChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
