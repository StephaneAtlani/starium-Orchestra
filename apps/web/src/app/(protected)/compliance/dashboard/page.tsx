'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  getComplianceDashboard,
  listComplianceFrameworkSummaries,
  listComplianceStatuses,
} from '@/features/compliance/api/compliance.api';
import { ComplianceKpiStrip } from '@/features/compliance/components/compliance-kpi-strip';
import { ComplianceFrameworkCards } from '@/features/compliance/components/compliance-framework-cards';
import { ComplianceControlsTable } from '@/features/compliance/components/compliance-controls-table';
import { ComplianceRequirementsModal } from '@/features/compliance/components/compliance-requirements-modal';
import { ComplianceCampaignsPanel } from '@/features/compliance/components/compliance-campaigns-panel';

export default function ComplianceDashboardPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const enabled = Boolean(clientId);
  const [requirementsOpen, setRequirementsOpen] = useState(false);

  const dashboardQ = useQuery({
    queryKey: ['compliance', clientId, 'dashboard'],
    queryFn: () => getComplianceDashboard(authFetch),
    enabled,
  });

  const frameworksQ = useQuery({
    queryKey: ['compliance', clientId, 'frameworks-summary'],
    queryFn: () => listComplianceFrameworkSummaries(authFetch),
    enabled,
    staleTime: 30_000,
  });

  const statusesQ = useQuery({
    queryKey: ['compliance', clientId, 'statuses'],
    queryFn: () => listComplianceStatuses(authFetch),
    enabled,
    staleTime: 30_000,
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          eyebrow="Gouvernance › Conformité"
          title="Conformité"
          description="Suivi des référentiels réglementaires et de l'avancement des contrôles."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/compliance/frameworks"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Référentiels
              </Link>
              <Link
                href="/compliance/contributions"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Mes contributions
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={() => setRequirementsOpen(true)}
              >
                Exigences
              </Button>
            </div>
          }
        />

        {dashboardQ.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Impossible de charger la synthèse de conformité</AlertTitle>
            <AlertDescription>
              {dashboardQ.error instanceof Error
                ? dashboardQ.error.message
                : 'Une erreur est survenue. Réessayez dans un instant.'}
            </AlertDescription>
          </Alert>
        ) : (
          <ComplianceKpiStrip dashboard={dashboardQ.data} isLoading={dashboardQ.isLoading} />
        )}

        {frameworksQ.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Impossible de charger les référentiels</AlertTitle>
            <AlertDescription>
              {frameworksQ.error instanceof Error
                ? frameworksQ.error.message
                : 'Une erreur est survenue. Réessayez dans un instant.'}
            </AlertDescription>
          </Alert>
        ) : (
          <ComplianceFrameworkCards
            summaries={frameworksQ.data}
            isLoading={frameworksQ.isLoading}
          />
        )}

        <ComplianceCampaignsPanel />

        <ComplianceControlsTable
          rows={statusesQ.data}
          isLoading={statusesQ.isLoading}
          error={statusesQ.error instanceof Error ? statusesQ.error : null}
          onRetry={() => void statusesQ.refetch()}
        />

        <ComplianceRequirementsModal
          open={requirementsOpen}
          onOpenChange={setRequirementsOpen}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
