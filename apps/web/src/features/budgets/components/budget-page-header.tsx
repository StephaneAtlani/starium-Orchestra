'use client';

import React from 'react';
import { PageHeader } from '@/components/layout/page-header';

interface BudgetPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function BudgetPageHeader({ title, description, actions }: BudgetPageHeaderProps) {
  return <PageHeader title={title} description={description} actions={actions} />;
}
