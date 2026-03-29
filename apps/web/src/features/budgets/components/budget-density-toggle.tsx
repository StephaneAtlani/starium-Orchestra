'use client';

import { cn } from '@/lib/utils';
import type { BudgetPilotageDensity } from '../types/budget-pilotage.types';

export interface BudgetDensityToggleProps {
  value: BudgetPilotageDensity;
  onValueChange: (v: BudgetPilotageDensity) => void;
  disabled?: boolean;
  className?: string;
}

export function BudgetDensityToggle({
  value,
  onValueChange,
  disabled,
  className,
}: BudgetDensityToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      role="group"
      aria-label="Densité d’affichage"
    >
      {(
        [
          { v: 'mensuel' as const, label: 'Mensuel' },
          { v: 'condense' as const, label: 'Condensé' },
        ] as const
      ).map((opt) => {
        const selected = value === opt.v;
        return (
          <button
            key={opt.v}
            type="button"
            className={cn(
              'rounded-md px-2.5 py-0.5 text-sm font-medium transition-colors',
              selected ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground',
            )}
            onClick={() => onValueChange(opt.v)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
