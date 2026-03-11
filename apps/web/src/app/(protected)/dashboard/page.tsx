'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          description="Vue d’ensemble du cockpit."
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>KPI</CardTitle>
              <CardDescription>Budgets</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>KPI</CardTitle>
              <CardDescription>Projets</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>KPI</CardTitle>
              <CardDescription>Contrats</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>KPI</CardTitle>
              <CardDescription>Fournisseurs</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Vue d’ensemble</CardTitle>
            <CardDescription>
              Les widgets du cockpit seront alimentés par l’API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Cockpit en cours de construction"
              description="Les KPI et listes de pilotage seront ajoutés ici (budgets, projets, contrats, etc.)."
            />
          </CardContent>
        </Card>
      </PageContainer>
    </RequireActiveClient>
  );
}
