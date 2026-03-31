'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetImportWizard } from '@/features/budgets/budget-import';
import { budgetDetail } from '@/features/budgets/constants/budget-routes';
import { Button } from '@/components/ui/button';

export default function BudgetImportPage() {
  const p = useParams();
  const budgetId = typeof p.budgetId === 'string' ? p.budgetId : null;

  if (!budgetId) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <p className="text-sm text-muted-foreground">Budget introuvable.</p>
        </PageContainer>
      </RequireActiveClient>
    );
  }

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Importer des lignes budgétaires"
          description="Analyse du fichier, mapping des colonnes, prévisualisation puis exécution transactionnelle."
        />
        <div className="mb-6">
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href={budgetDetail(budgetId)} className="gap-2">
              <ArrowLeft className="size-4" aria-hidden />
              Retour au budget
            </Link>
          </Button>
        </div>
        <BudgetImportWizard budgetId={budgetId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
