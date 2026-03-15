'use client';

import React from 'react';
import { DollarSign, Users, Building2, TrendingUp } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
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

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vue d’ensemble
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Revenue"
              value="—"
              subtitle="Ce mois"
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              title="New Customers"
              value="—"
              subtitle="30 jours"
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              title="Active Accounts"
              value="—"
              subtitle="30 jours"
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              title="Growth Rate"
              value="—"
              subtitle="30 jours"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Documents
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Vue dashboard (placeholder).</CardDescription>
            </CardHeader>
            <CardContent>
              <TableToolbar>
                <span className="text-sm text-muted-foreground">0 of 0 row(s) selected.</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Columns</Button>
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-accent">Add Section</Button>
                </div>
              </TableToolbar>
              <EmptyState
                title="Cockpit en cours de construction"
                description="Les KPI et listes de pilotage seront ajoutés ici (budgets, projets, contrats, etc.)."
              />
            </CardContent>
          </Card>
        </section>
      </PageContainer>
    </RequireActiveClient>
  );
}
