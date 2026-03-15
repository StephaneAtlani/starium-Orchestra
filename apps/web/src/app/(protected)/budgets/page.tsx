'use client';

import React from 'react';
import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { budgetExercisesList, budgetDashboard, budgetImports } from '@/features/budgets/constants/budget-routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Calendar, FileUp } from 'lucide-react';

export default function BudgetsCockpitPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Budgets"
          description="Porte d’entrée du module budget. Accédez aux exercices, au dashboard et aux imports."
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="budget-cockpit-cards">
          <Link href={budgetExercisesList()}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="text-base">Exercices</CardTitle>
                <CardDescription>Liste et détail des exercices budgétaires.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href={budgetDashboard()}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="text-base">Dashboard</CardTitle>
                <CardDescription>Cockpit de pilotage budgétaire (KPI, enveloppes, lignes).</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href={budgetImports()}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="text-base">Imports</CardTitle>
                <CardDescription>Importer des données budgétaires.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </section>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Résumé</CardTitle>
            <CardDescription>Module budget — fondation. Les écrans métier (lignes, reporting, snapshots, versions, réallocations) sont accessibles depuis un budget.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sélectionnez un exercice pour voir les budgets, ou ouvrez le dashboard pour une vue synthétique.
          </CardContent>
        </Card>
      </PageContainer>
    </RequireActiveClient>
  );
}
