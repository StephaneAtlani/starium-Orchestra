'use client';

import React from 'react';
import { BudgetStatusBadge } from './budget-status-badge';

interface BudgetEnvelopeStatusBadgeProps {
  status: 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'ARCHIVED';
  className?: string;
}

export function BudgetEnvelopeStatusBadge({
  status,
  className,
}: BudgetEnvelopeStatusBadgeProps) {
  return <BudgetStatusBadge status={status} className={className} />;
}

