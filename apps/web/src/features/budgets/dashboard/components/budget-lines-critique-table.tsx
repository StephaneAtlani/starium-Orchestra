'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  BudgetDashboardLineRow,
  BudgetDashboardResponse,
} from '@/features/budgets/types/budget-dashboard.types';
import { formatAmount } from '@/features/budgets/lib/budget-formatters';
import { budgetDetail } from '@/features/budgets/constants/budget-routes';
import { cockpitCardClass } from './budget-dashboard-shell';

function severityBadge(level: BudgetDashboardLineRow['lineRiskLevel']) {
  if (level === 'CRITICAL')
    return (
      <Badge className="border-red-200 bg-red-50 text-red-800">
        Critique
      </Badge>
    );
  if (level === 'WARNING')
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-900">
        Attention
      </Badge>
    );
  return (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-900">
      OK
    </Badge>
  );
}

export function BudgetLinesCritiqueTable({
  rows,
  currency,
  budgetId,
}: {
  rows: NonNullable<BudgetDashboardResponse['criticalBudgetLines']>;
  currency: string;
  budgetId: string;
}) {
  if (rows.length === 0) {
    return (
      <Card
        className={cockpitCardClass}
        data-testid="budget-dashboard-critical-lines"
      >
        <CardHeader>
          <CardTitle className="text-base">Lignes critiques</CardTitle>
          <CardDescription>
            Lignes en alerte (WARNING / CRITICAL)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune ligne en alerte sur ce budget.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cockpitCardClass}
      data-testid="budget-dashboard-critical-lines"
    >
      <CardHeader>
        <CardTitle className="text-base">Lignes critiques</CardTitle>
        <CardDescription>
          Tri par gravité puis consommation (max. 10)
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Ligne</TableHead>
              <TableHead className="text-muted-foreground">Enveloppe</TableHead>
              <TableHead className="text-right text-muted-foreground">Révisé</TableHead>
              <TableHead className="text-right text-muted-foreground">Engagé</TableHead>
              <TableHead className="text-right text-muted-foreground">Consommé</TableHead>
              <TableHead className="text-right text-muted-foreground">Forecast</TableHead>
              <TableHead className="text-muted-foreground">Gravité</TableHead>
              <TableHead className="text-right text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.lineId} className="border-border">
                <TableCell className="max-w-[200px] truncate text-foreground">
                  {l.code ? `${l.code} — ` : ''}
                  {l.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {l.envelopeName ?? '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(l.revisedAmount, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(l.committed, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(l.consumed, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(l.forecast, currency)}
                </TableCell>
                <TableCell>{severityBadge(l.lineRiskLevel)}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={budgetDetail(budgetId)}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Budget
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
