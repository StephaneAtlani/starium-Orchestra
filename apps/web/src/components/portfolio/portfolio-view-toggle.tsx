'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PortfolioViewMode = 'cards' | 'table';

export type PortfolioViewToggleProps = {
  value: PortfolioViewMode;
  onChange: (mode: PortfolioViewMode) => void;
  className?: string;
  /** Libellé accessible du groupe. */
  ariaLabel?: string;
  cardsLabel?: string;
  tableLabel?: string;
};

export function PortfolioViewToggle({
  value,
  onChange,
  className,
  ariaLabel = "Mode d'affichage",
  cardsLabel = 'Cartes',
  tableLabel = 'Tableau',
}: PortfolioViewToggleProps) {
  return (
    <div
      className={cn(
        'starium-tab-group grid min-h-11 grid-cols-2 sm:min-h-9',
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        role="tab"
        className={cn('starium-tab-btn', value === 'cards' && 'starium-tab-btn--active')}
        aria-selected={value === 'cards'}
        aria-pressed={value === 'cards'}
        onClick={() => onChange('cards')}
      >
        <LayoutGrid className="size-4" aria-hidden />
        {cardsLabel}
      </button>
      <button
        type="button"
        role="tab"
        className={cn('starium-tab-btn', value === 'table' && 'starium-tab-btn--active')}
        aria-selected={value === 'table'}
        aria-pressed={value === 'table'}
        onClick={() => onChange('table')}
      >
        <List className="size-4" aria-hidden />
        {tableLabel}
      </button>
    </div>
  );
}
