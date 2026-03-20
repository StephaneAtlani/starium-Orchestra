'use client';

import React from 'react';
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
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';
import type { BudgetDashboardResponse } from '@/features/budgets/types/budget-dashboard.types';
import { formatDashboardAmount } from '@/features/budgets/lib/budget-dashboard-format';
import { cockpitCardClass } from './budget-dashboard-shell';

function riskBadge(level: 'LOW' | 'MEDIUM' | 'HIGH') {
  if (level === 'HIGH')
    return (
      <Badge className="border-red-200 bg-red-50 text-red-800">
        Haut
      </Badge>
    );
  if (level === 'MEDIUM')
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-900">
        Moyen
      </Badge>
    );
  return (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-900">
      Bas
    </Badge>
  );
}

export function BudgetEnvelopesTable({
  rows,
  currency,
  taxDisplayMode,
  defaultTaxRate,
  onRowClick,
}: {
  rows: NonNullable<BudgetDashboardResponse['riskEnvelopes']>;
  currency: string;
  taxDisplayMode: TaxDisplayMode;
  defaultTaxRate: number | null;
  onRowClick?: () => void;
}) {
  if (rows.length === 0) return null;

  return (
    <Card className={cockpitCardClass}>
      <CardHeader>
        <CardTitle className="text-base">Enveloppes à risque</CardTitle>
        <CardDescription>
          Prévision vs budget révisé (agrégé enveloppe)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Enveloppe</TableHead>
              <TableHead className="text-right text-muted-foreground">
                Prévision
              </TableHead>
              <TableHead className="text-right text-muted-foreground">
                Budget
              </TableHead>
              <TableHead className="text-muted-foreground">Niveau</TableHead>
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
                    ht: e.forecast,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDashboardAmount({
                    ht: e.budgetAmount,
                    currency,
                    mode: taxDisplayMode,
                    defaultTaxRate,
                  })}
                </TableCell>
                <TableCell>{riskBadge(e.riskLevel)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
