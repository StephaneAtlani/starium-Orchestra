'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { cockpitCardClass } from './budget-dashboard-shell';

export function BudgetTopEnvelopesCard({
  rows,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  onRowClick,
}: {
  rows: NonNullable<BudgetDashboardResponse['topEnvelopes']>;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  onRowClick?: () => void;
}) {
  if (rows.length === 0) return null;

  return (
    <Card className={cockpitCardClass}>
      <CardHeader>
        <CardTitle className="text-base">Top enveloppes</CardTitle>
        <CardDescription>
          Par montant consommé (max. 10)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Enveloppe</TableHead>
              <TableHead className="text-right text-muted-foreground">
                Budget
              </TableHead>
              <TableHead className="text-right text-muted-foreground">
                Consommé
              </TableHead>
              <TableHead className="text-right text-muted-foreground">
                Restant
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow
                key={e.envelopeId}
                className="cursor-pointer border-border hover:bg-muted/50"
                onClick={onRowClick}
              >
                <TableCell className="text-foreground">
                  {e.code ? `${e.code} — ` : ''}
                  {e.name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDashboardAmount({
                    ht: e.totalBudget,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDashboardAmount({
                    ht: e.consumed,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDashboardAmount({
                    ht: e.remaining,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
