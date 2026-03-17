'use client';

import React from 'react';
import Link from 'next/link';
import { BudgetEnvelopeDetail } from '../types/budget-envelope-detail.types';
import { BudgetEnvelopeStatusBadge } from './budget-envelope-status-badge';
import { BudgetPageHeader } from './budget-page-header';
import { budgetDetail } from '../constants/budget-routes';

interface BudgetEnvelopeHeaderProps {
  envelope: BudgetEnvelopeDetail;
}

export function BudgetEnvelopeHeader({ envelope }: BudgetEnvelopeHeaderProps) {
  const budgetLabel = envelope.budgetName || envelope.budgetId;

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        <Link href="/budgets" className="hover:underline">
          Budgets
        </Link>
        <span className="mx-1">/</span>
        <Link href={budgetDetail(envelope.budgetId)} className="hover:underline">
          {budgetLabel}
        </Link>
        <span className="mx-1">/</span>
        <span>{envelope.name}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <BudgetPageHeader
          title={envelope.name}
          description={
            envelope.code
              ? `${envelope.code} · ${envelope.currency}`
              : envelope.currency
          }
        />
        <BudgetEnvelopeStatusBadge status={envelope.status} />
      </div>
    </div>
  );
}

