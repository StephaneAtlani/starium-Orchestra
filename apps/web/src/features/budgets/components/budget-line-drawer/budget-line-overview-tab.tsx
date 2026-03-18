'use client';

import React from 'react';
import type { BudgetLine } from '../../types/budget-management.types';
import type { FinancialEventForLine } from '../../api/budget-line-financial.api';
import { formatAmount } from '../../lib/budget-formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BudgetLineOverviewTab({
  line,
  budgetName,
  envelopeName,
  lastEvent,
}: {
  line: BudgetLine;
  budgetName?: string | null;
  envelopeName?: string | null;
  lastEvent?: FinancialEventForLine | null;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synthèse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {line.description && (
            <div className="text-muted-foreground">
              {line.description}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Code</span>
            <span className="font-medium">{line.code ?? '—'}</span>
          </div>
          {envelopeName && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground">Enveloppe</span>
              <span className="font-medium">{envelopeName}</span>
            </div>
          )}
          {budgetName && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">{budgetName}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Statut</span>
            <span className="font-medium">{line.status}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{line.expenseType}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">Devise</span>
            <span className="font-medium">{line.currency}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dernier événement</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!lastEvent ? (
            <p className="text-muted-foreground">Aucun événement.</p>
          ) : (
            <div className="space-y-1">
              <div className="font-medium">{lastEvent.label}</div>
              <div className="text-muted-foreground">
                {new Date(lastEvent.eventDate).toLocaleDateString()} · {lastEvent.eventType}
              </div>
              <div className="tabular-nums">
                {formatAmount(lastEvent.amount, lastEvent.currency ?? line.currency)}
              </div>
              {lastEvent.description && (
                <div className="text-muted-foreground">{lastEvent.description}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

