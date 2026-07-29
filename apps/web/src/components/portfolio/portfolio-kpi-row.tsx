'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { KpiCard, type KpiCardProps } from '@/components/ui/kpi-card';

export type PortfolioKpiItem = KpiCardProps & { id: string };

export type PortfolioKpiRowProps = {
  items: PortfolioKpiItem[];
  /** Titre de section optionnel (overline / h2). */
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  /** Colonnes grille — défaut adaptatif 2→5. */
  columnsClassName?: string;
  'data-testid'?: string;
};

/**
 * Bandeau KPI portefeuille : `.starium-module` + N × `KpiCard` dense.
 * Pas de Card parente (anti cadre-dans-cadre).
 */
export function PortfolioKpiRow({
  items,
  title,
  description,
  className,
  columnsClassName,
  'data-testid': dataTestId,
}: PortfolioKpiRowProps) {
  const cols =
    columnsClassName ??
    (items.length >= 5
      ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'
      : items.length === 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : 'grid-cols-2 sm:grid-cols-3');

  return (
    <section className={cn('starium-module', className)} data-testid={dataTestId}>
      {title || description ? (
        <div className="mb-3">
          {title ? (
            typeof title === 'string' ? (
              <h2 className="starium-overline">{title}</h2>
            ) : (
              title
            )
          ) : null}
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className={cn('grid gap-3', cols)}>
        {items.map(({ id, ...kpi }) => (
          <KpiCard key={id} variant="dense" iconShape="circle" {...kpi} />
        ))}
      </div>
    </section>
  );
}
