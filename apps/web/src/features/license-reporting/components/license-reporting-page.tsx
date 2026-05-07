'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { getClients } from '@/features/admin-studio/api/get-clients';
import type {
  LicenseReportingFilters,
  LicenseReportingMonthlyFilters,
} from '../api/license-reporting';
import {
  useLicenseReportingClients,
  useLicenseReportingMonthly,
  useLicenseReportingOverview,
} from '../hooks/use-license-reporting';
import {
  ClientsExportButtons,
  MonthlyExportButtons,
} from './export-buttons';
import { LicenseReportingClientsTable } from './license-reporting-clients-table';
import {
  initialReportingFilters,
  LicenseReportingFilters as FiltersBar,
  type ClientOption,
  type LicenseReportingFiltersUi,
} from './license-reporting-filters';
import { LicenseReportingKpiCards } from './license-reporting-kpi-cards';
import { LicenseReportingMonthlyTable } from './license-reporting-monthly-table';

function uiToApi(filters: LicenseReportingFiltersUi): LicenseReportingFilters {
  return {
    clientId: filters.clientId !== 'all' ? filters.clientId : undefined,
    licenseBillingMode:
      filters.licenseBillingMode !== 'all' ? filters.licenseBillingMode : undefined,
    subscriptionStatus:
      filters.subscriptionStatus !== 'all' ? filters.subscriptionStatus : undefined,
  };
}

function uiToMonthlyApi(
  filters: LicenseReportingFiltersUi,
): LicenseReportingMonthlyFilters {
  return {
    ...uiToApi(filters),
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

export function LicenseReportingPage() {
  const { user, accessToken } = useAuth();
  const authFetch = useAuthenticatedFetch();
  const isPlatformAdmin = user?.platformRole === 'PLATFORM_ADMIN';

  const [filters, setFilters] = useState<LicenseReportingFiltersUi>(
    initialReportingFilters,
  );
  const [tab, setTab] = useState<'overview' | 'clients' | 'monthly'>('overview');

  const apiFilters = useMemo(() => uiToApi(filters), [filters]);
  const monthlyFilters = useMemo(() => uiToMonthlyApi(filters), [filters]);

  const overviewQ = useLicenseReportingOverview(apiFilters);
  const clientsQ = useLicenseReportingClients(apiFilters);
  const monthlyQ = useLicenseReportingMonthly(monthlyFilters);

  const clientsListQ = useQuery<ClientOption[]>({
    queryKey: ['license-reporting', 'platform-clients'],
    queryFn: async () => {
      const list = await getClients(authFetch);
      return list.map((c) => ({ id: c.id, name: c.name, slug: c.slug ?? '' }));
    },
    enabled: !!accessToken && isPlatformAdmin,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!isPlatformAdmin && !!accessToken) {
      // Page protégée plateforme — message muet, pas de redirection ici.
    }
  }, [isPlatformAdmin, accessToken]);

  if (!isPlatformAdmin) {
    return (
      <PageContainer>
        <PageHeader
          title="Reporting commercial licences"
          description="Accès réservé aux administrateurs plateforme."
        />
        <p className="text-sm text-muted-foreground">
          Cette page nécessite le rôle Administrateur plateforme.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reporting commercial licences"
        description="KPI commerciaux, trajectoire mensuelle et exports plateforme (RFC-ACL-012)."
      />

      <div className="mb-4">
        <FiltersBar
          filters={filters}
          onChange={setFilters}
          clients={clientsListQ.data ?? []}
          showPeriod={tab === 'monthly'}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="clients">Par client</TabsTrigger>
          <TabsTrigger value="monthly">Trajectoire mensuelle</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {overviewQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : null}
          {overviewQ.isError ? (
            <p className="text-sm text-destructive">
              {(overviewQ.error as Error).message}
            </p>
          ) : null}
          <LicenseReportingKpiCards overview={overviewQ.data} />
          {overviewQ.data ? (
            <Card className="mt-4 p-4">
              <div className="text-xs text-muted-foreground">
                Données générées le{' '}
                {new Date(overviewQ.data.generatedAt).toLocaleString('fr-FR')}.
                Trajectoire mensuelle dérivée des dates de licence/abonnement
                (V1, sans table d&apos;agrégats).
              </div>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="clients" className="space-y-3">
          <ClientsExportButtons
            filters={apiFilters}
            jsonPayload={clientsQ.data ?? []}
          />
          {clientsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : null}
          {clientsQ.isError ? (
            <p className="text-sm text-destructive">
              {(clientsQ.error as Error).message}
            </p>
          ) : null}
          {clientsQ.data ? (
            <LicenseReportingClientsTable rows={clientsQ.data} />
          ) : null}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-3">
          <MonthlyExportButtons
            filters={monthlyFilters}
            jsonPayload={monthlyQ.data}
          />
          {monthlyQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : null}
          {monthlyQ.isError ? (
            <p className="text-sm text-destructive">
              {(monthlyQ.error as Error).message}
            </p>
          ) : null}
          <LicenseReportingMonthlyTable series={monthlyQ.data} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
