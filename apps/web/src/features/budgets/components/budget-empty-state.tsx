'use client';

import React from 'react';
import { EmptyState } from '@/components/feedback/empty-state';

interface BudgetEmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const DEFAULT_TITLE = 'Aucune donnée';
const DEFAULT_DESCRIPTION = 'Aucun élément à afficher pour le moment.';

export function BudgetEmptyState({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  action,
  className,
}: BudgetEmptyStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
