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
          actions={<Button>Quick Create</Button>}
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Revenue</CardTitle>
              <CardDescription>Ce mois</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>New Customers</CardTitle>
              <CardDescription>30 jours</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Accounts</CardTitle>
              <CardDescription>30 jours</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Growth Rate</CardTitle>
              <CardDescription>30 jours</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">—</CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Vue “dashboard” (placeholder) alignée shadcn.</CardDescription>
          </CardHeader>
          <CardContent>
            <TableToolbar>
              <div className="text-sm text-muted-foreground">
                0 of 0 row(s) selected.
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Columns
                </Button>
                <Button variant="outline" size="sm">
                  Add Section
                </Button>
              </div>
            </TableToolbar>
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
