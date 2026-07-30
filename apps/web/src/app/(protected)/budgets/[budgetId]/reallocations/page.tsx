'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBudgetExplorer } from '@/features/budgets/hooks/use-budget-explorer';
import { BudgetReallocationsPanel } from '@/features/budgets/components/budget-detail';
import { CreateBudgetReallocationDialog } from '@/features/budgets/components/create-budget-reallocation-dialog';
import { budgetDetail } from '@/features/budgets/constants/budget-routes';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';

/**
 * Vue plein écran du journal des réaffectations — même panneau que l'onglet Réaffectations de la
 * fiche budget (RFC-FE-BUD-032 §4.1), pour éviter deux implémentations divergentes.
 */
export default function BudgetReallocationsPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';
  const [dialogOpen, setDialogOpen] = useState(false);

  const { budget, lines, isLoading } = useBudgetExplorer(budgetId);

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          eyebrow="Pilotage › Budgets"
          title="Réaffectations"
          description={
            budget
              ? `${budget.name} — transferts de budget entre lignes.`
              : 'Transferts de budget entre lignes.'
          }
          actions={
            <Link
              href={budgetDetail(budgetId)}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-11 gap-1.5 sm:min-h-9',
              )}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Retour au budget
            </Link>
          }
        />

        {isLoading ? (
          <LoadingState rows={4} />
        ) : (
          <Card className="starium-panel">
            <CardContent>
              <BudgetReallocationsPanel
                budgetId={budgetId}
                lines={(lines ?? []) as BudgetLine[]}
                onCreateRequest={() => setDialogOpen(true)}
              />
            </CardContent>
          </Card>
        )}

        <CreateBudgetReallocationDialog
          budgetId={budgetId}
          lines={(lines ?? []) as BudgetLine[]}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
