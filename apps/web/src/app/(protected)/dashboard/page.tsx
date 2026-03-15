'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Button } from '@/components/ui/button';
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <CardDescription>Ce mois</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                <CardDescription>30 jours</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
                <CardDescription>30 jours</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                <CardDescription>30 jours</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">—</p>
              </CardContent>
            </Card>
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
