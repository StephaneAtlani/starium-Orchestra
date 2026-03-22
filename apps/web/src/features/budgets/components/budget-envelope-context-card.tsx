'use client';

import React from 'react';
import Link from 'next/link';
import type { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { budgetDetail } from '../constants/budget-routes';

interface BudgetEnvelopeContextCardProps {
  envelope: BudgetEnvelopeDetail;
}

export function BudgetEnvelopeContextCard({
  envelope,
}: BudgetEnvelopeContextCardProps) {
  const budgetLabel = envelope.budgetName || envelope.budgetId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contexte budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Budget</span>
          <div>{budgetLabel}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Budget ID</span>
          <div className="font-mono text-xs">{envelope.budgetId}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Devise</span>
          <div>{envelope.currency}</div>
        </div>
        <div>
          <Link
            href={budgetDetail(envelope.budgetId)}
            className="text-primary hover:underline text-sm font-medium"
          >
            Retour au budget
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

