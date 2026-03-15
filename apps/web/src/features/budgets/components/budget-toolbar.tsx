'use client';

import React from 'react';
import { TableToolbar } from '@/components/layout/table-toolbar';

interface BudgetToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

export function BudgetToolbar({ children, className }: BudgetToolbarProps) {
  return <TableToolbar className={className}>{children}</TableToolbar>;
}
