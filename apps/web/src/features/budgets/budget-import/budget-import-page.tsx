'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, FolderOpen } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { firstDisplayLabel } from '@/lib/display-label';
import { useBudgetDetail } from '../hooks/use-budgets';
import {
  budgetDetail,
  budgetImportsTab,
} from '../constants/budget-routes';
import { BudgetImportWizard } from './budget-import-wizard';

export interface BudgetImportPageProps {
  budgetId: string;
}

function BudgetImportPageInner({ budgetId }: BudgetImportPageProps) {
  const { data: budget, isLoading } = useBudgetDetail(budgetId);
  const budgetLabel = firstDisplayLabel([budget?.name, budget?.code], 'Budget');

  return (
    <PageContainer>
      <PageHeader
        backHref={budgetDetail(budgetId)}
        eyebrow="Pilotage › Budgets › Import"
        title={isLoading ? 'Import budgétaire' : `Importer — ${budgetLabel}`}
        description="Chargez un fichier CSV ou Excel, configurez le mapping, vérifiez l’aperçu puis lancez l’import transactionnel."
        actions={
          <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center">
            <Link
              href={budgetImportsTab('profiles')}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-1.5 min-h-11 sm:min-h-9',
              )}
            >
              <FolderOpen className="size-4" aria-hidden />
              Profils
            </Link>
            <Link
              href={budgetImportsTab('help')}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-1.5 min-h-11 sm:min-h-9',
              )}
            >
              <FileSpreadsheet className="size-4" aria-hidden />
              Modèle CSV
            </Link>
          </div>
        }
      />

      <Suspense fallback={<LoadingState rows={4} />}>
        <BudgetImportWizard budgetId={budgetId} budgetLabel={budgetLabel} />
      </Suspense>
    </PageContainer>
  );
}

export function BudgetImportPage({ budgetId }: BudgetImportPageProps) {
  return (
    <RequireActiveClient>
      <BudgetImportPageInner budgetId={budgetId} />
    </RequireActiveClient>
  );
}
