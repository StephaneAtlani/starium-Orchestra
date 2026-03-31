'use client';

import React from 'react';
import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { budgetList } from '@/features/budgets/constants/budget-routes';
import { Button } from '@/components/ui/button';

export default function BudgetImportsPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Imports budget"
          description="L’import de lignes se fait depuis un budget précis (fichier CSV ou Excel)."
        />
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          <p className="mb-4">
            Ouvrez un budget dans la liste, puis utilisez l’action <strong className="text-foreground">Importer</strong>{' '}
            pour lancer le wizard (analyse, mapping, prévisualisation, exécution).
          </p>
          <Button type="button" variant="secondary" asChild>
            <Link href={budgetList()}>Aller à la liste des budgets</Link>
          </Button>
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
