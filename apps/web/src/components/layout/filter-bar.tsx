import React from 'react';

import { cn } from '@/lib/utils';

export type FilterBarDesktopColumns = 2 | 3 | 4 | 'auto';

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
  /** Nombre de colonnes max desktop (défaut : 3, puis auto-fit à xl) */
  desktopColumns?: FilterBarDesktopColumns;
  /** aria-label du groupe de filtres (défaut : « Filtres ») */
  'aria-label'?: string;
  /** role="search" si la zone est une recherche/filtrage principale */
  asSearch?: boolean;
}

const desktopColumnClasses: Record<Exclude<FilterBarDesktopColumns, 'auto'>, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

export function FilterBar({
  children,
  className,
  desktopColumns = 3,
  'aria-label': ariaLabel = 'Filtres',
  asSearch = false,
}: FilterBarProps) {
  const columnClass =
    desktopColumns === 'auto'
      ? 'xl:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]'
      : desktopColumnClasses[desktopColumns];

  return (
    <section
      aria-label={ariaLabel}
      {...(asSearch ? { role: 'search' as const } : {})}
      className={cn(
        'rounded-lg border border-border/70 bg-card p-3 sm:p-4',
        'grid grid-cols-1 gap-3 sm:grid-cols-2',
        columnClass,
        className,
      )}
    >
      {children}
    </section>
  );
}
