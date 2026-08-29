'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  BUDGET_DETAIL_TABS,
  type BudgetDetailTabId,
} from '@/features/budgets/types/budget-detail-tabs.types';

export interface BudgetDetailTabsProps {
  tab: BudgetDetailTabId | null;
  onTabChange: (tab: BudgetDetailTabId) => void;
  className?: string;
}

/**
 * Navigation de la zone de travail (RFC-FE-BUD-032 §3.B) : 6 onglets métier.
 * Remplace `BudgetViewTabs` et ses 7 modes redondants.
 */
export function BudgetDetailTabs({ tab, onTabChange, className }: BudgetDetailTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const lastIndex = BUDGET_DETAIL_TABS.length - 1;
      let nextIndex: number | null = null;

      if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
      else if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = lastIndex;

      if (nextIndex == null) return;
      event.preventDefault();
      onTabChange(BUDGET_DETAIL_TABS[nextIndex]!.id);
      tabRefs.current[nextIndex]?.focus();
    },
    [onTabChange],
  );

  return (
    <div className={cn('max-w-full overflow-x-auto', className)}>
      <div
        role="tablist"
        aria-label="Zone de travail du budget"
        className="starium-tab-group"
      >
        {BUDGET_DETAIL_TABS.map((item, index) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`budget-detail-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`budget-detail-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'starium-tab-btn min-h-11 shrink-0 sm:min-h-9',
                selected && 'starium-tab-btn--active',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
