'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { BudgetPilotageDensity } from '../types/budget-pilotage.types';

export interface BudgetDensityToggleProps {
  density: BudgetPilotageDensity;
  onDensityChange: (density: BudgetPilotageDensity) => void;
  disabled?: boolean;
  className?: string;
}

export function BudgetDensityToggle({
  density,
  onDensityChange,
  disabled,
  className,
}: BudgetDensityToggleProps) {
  return (
    <div
      className={cn('inline-flex h-8 items-center rounded-md border border-border p-0.5', className)}
      role="group"
      aria-label="Densité d’affichage"
    >
      {(
        [
          { id: 'mensuel' as const, label: 'Mensuel' },
          { id: 'condense' as const, label: 'Condensé' },
        ] as const
      ).map((opt) => {
        const selected = density === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onDensityChange(opt.id)}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
