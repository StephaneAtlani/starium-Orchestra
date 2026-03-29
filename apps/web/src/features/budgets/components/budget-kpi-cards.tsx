'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export interface BudgetKpiCardItem {
  label: string;
  value: string;
  trend?: 'positive' | 'negative' | 'neutral';
  /** Ex. écarts % sous le montant (prévisionnel vs références). */
  subtext?: string;
}

interface BudgetKpiCardsProps {
  items: BudgetKpiCardItem[];
  className?: string;
}

export function BudgetKpiCards({ items, className }: BudgetKpiCardsProps) {
  return (
    <div
      className={
        className ??
        'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
      }
      data-testid="budget-kpi-cards"
    >
      {items.map((item, i) => (
        <Card key={i} data-testid={`kpi-${item.label.replace(/\s/g, '-').toLowerCase()}`}>
          <CardHeader className="pb-1">
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl font-semibold">{item.value}</div>
            {item.subtext ? (
              <p className="text-xs leading-snug text-muted-foreground">{item.subtext}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
