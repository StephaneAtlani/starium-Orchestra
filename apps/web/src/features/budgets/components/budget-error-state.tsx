'use client';

import React from 'react';
import { ErrorState } from '@/components/feedback/error-state';

interface BudgetErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const DEFAULT_MESSAGE = 'Une erreur est survenue lors du chargement des données budget.';

export function BudgetErrorState({
  message = DEFAULT_MESSAGE,
  onRetry,
  className,
}: BudgetErrorStateProps) {
  return <ErrorState message={message} onRetry={onRetry} className={className} />;
}
