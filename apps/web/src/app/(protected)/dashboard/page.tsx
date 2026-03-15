'use client';

import React from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { TableToolbar } from '@/components/layout/table-toolbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, CirclePlus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const backNextClass =
  'h-8 rounded-md border border-[#E6E8EF] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1B1B1B] hover:bg-[#F8F9FC]';
const viewMoreClass =
  'h-8 rounded-md border border-[#6F4BB8] bg-[#FFFFFF] px-3 text-sm font-medium text-[#6F4BB8] hover:bg-[#EFE7FB]';

export default function DashboardPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <Tabs defaultValue="start" className="w-full space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <TabsList variant="line" className="h-9 gap-0 bg-transparent p-0">
                <TabsTrigger value="start" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[active]:border-[#3B82F6] data-[active]:text-[#1B1B1B] data-[active]:shadow-none">
                  Start
                </TabsTrigger>
                <TabsTrigger value="views" className="rounded-none border-b-2 border-transparent px-4 py-2 text-[#6B7280] data-[active]:border-[#3B82F6] data-[active]:text-[#1B1B1B]">
                  Views
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className={backNextClass}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Back
                </Button>
                <Button variant="outline" size="sm" className={backNextClass}>
                  Next
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <time dateTime="2023-03-30">March 30, 2023</time>
              <a href="#" className="text-[#3B82F6] hover:underline">Chat now</a>
            </div>
          </div>
        <PageHeader
          title="Dashboard"
          description="Vue d’ensemble du cockpit."
          actions={
            <Button size="sm" variant="outline" className="hidden h-8 border-[#6F4BB8] text-[#6F4BB8] hover:bg-[#EFE7FB] sm:flex">
              <CirclePlus className="mr-1.5 h-4 w-4" />
              <span>Quick Create</span>
            </Button>
          }
        />

          <TabsContent value="start" className="mt-0 space-y-8">
        <section className="space-y-5">
          <h2 className="text-sm font-medium uppercase tracking-wider text-[#6B7280]">
            Vue d'ensemble
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-[#1B1B1B]">Total Revenue</CardTitle>
                <CardDescription className="text-[#6B7280]">Ce mois</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-semibold text-[#1B1B1B]">—</p>
                <Button variant="outline" size="sm" className={viewMoreClass}>
                  View more
                </Button>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-[#1B1B1B]">New Customers</CardTitle>
                <CardDescription className="text-[#6B7280]">30 jours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-semibold text-[#1B1B1B]">—</p>
                <Button variant="outline" size="sm" className={viewMoreClass}>
                  View more
                </Button>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-[#1B1B1B]">Active Accounts</CardTitle>
                <CardDescription className="text-[#6B7280]">30 jours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-semibold text-[#1B1B1B]">—</p>
                <Button variant="outline" size="sm" className={viewMoreClass}>
                  View more
                </Button>
              </CardContent>
            </Card>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-[#1B1B1B]">Growth Rate</CardTitle>
                <CardDescription className="text-[#6B7280]">30 jours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-semibold text-[#1B1B1B]">—</p>
                <Button variant="outline" size="sm" className={viewMoreClass}>
                  View more
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-sm font-medium uppercase tracking-wider text-[#6B7280]">Documents</h2>
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Vue “dashboard (placeholder).</CardDescription>
            </CardHeader>
            <CardContent>
              <TableToolbar>
              <div className="text-sm text-[#6B7280]">
                0 of 0 row(s) selected.
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Columns
                </Button>
                <Button variant="outline" size="sm" className="border-[#6F4BB8] text-[#6F4BB8] hover:bg-[#EFE7FB]">
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
        </section>
          </TabsContent>
          <TabsContent value="views" className="mt-0">
            <p className="text-[#6B7280]">Vues personnalisées (à venir).</p>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </RequireActiveClient>
  );
}
