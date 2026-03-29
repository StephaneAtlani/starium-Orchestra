'use client';

import { cn } from '@/lib/utils';

export type BudgetMainSectionTab = 'structure' | 'pilotage';

export interface BudgetStructurePilotageTabsProps {
  value: BudgetMainSectionTab;
  onValueChange: (v: BudgetMainSectionTab) => void;
  className?: string;
}

export function BudgetStructurePilotageTabs({
  value,
  onValueChange,
  className,
}: BudgetStructurePilotageTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Zone budget"
      className={cn(
        'mb-4 inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground',
        className,
      )}
    >
      {(
        [
          { v: 'structure' as const, label: 'Structure' },
          { v: 'pilotage' as const, label: 'Pilotage' },
        ] as const
      ).map((opt) => {
        const selected = value === opt.v;
        return (
          <button
            key={opt.v}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              'rounded-md px-3 py-0.5 text-sm font-medium transition-colors',
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
