'use client';

import React from 'react';
import type { FinancialEventForLine } from '../../api/budget-line-financial.api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatAmount } from '../../lib/budget-formatters';
import { formatFinancialEventType } from '../../lib/financial-event-labels';

export function BudgetLineEventsTable({
  events,
}: {
  events: FinancialEventForLine[];
}) {
  if (events.length === 0) {
    return <div className="py-6 text-sm text-muted-foreground">Aucun événement.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Libellé</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Montant</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="text-muted-foreground">
              {new Date(e.eventDate).toLocaleDateString()}
            </TableCell>
            <TableCell className="font-medium">{e.label}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatFinancialEventType(e.eventType)}
            </TableCell>
            <TableCell className="text-muted-foreground">{e.sourceType}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatAmount(e.amount, e.currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

