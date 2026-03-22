'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { PermissionGate } from '@/components/PermissionGate';
import { budgetDetail, budgetLineNew } from '@/features/budgets/constants/budget-routes';

export default function BudgetLinesPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Lignes budgétaires"
          description={`Budget ${budgetId} — liste des lignes (squelette).`}
          actions={
            <div className="flex items-center gap-2">
              <Link
                href={budgetDetail(budgetId)}
                className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              >
                Retour au budget
              </Link>
              <PermissionGate permission="budgets.create">
                <Link
                  href={budgetLineNew(budgetId)}
                  className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Nouvelle ligne
                </Link>
              </PermissionGate>
            </div>
          }
        />
        <BudgetEmptyState
          title="Contenu à venir"
          description="La liste des lignes budgétaires sera implémentée dans une RFC dédiée."
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
