'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { getComplianceDashboard } from '@/features/compliance/api/compliance.api';

export default function ComplianceDashboardPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();

  const q = useQuery({
    queryKey: ['compliance', 'dashboard', activeClient?.id],
    queryFn: () => getComplianceDashboard(authFetch),
    enabled: !!activeClient?.id,
  });

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-6">
        <PageHeader
          title="Conformité"
          description="Cockpit — référentiels actifs, exigences évaluées et liens risques critiques"
        />
        <div className="flex flex-wrap gap-2">
          <Link href="/compliance/frameworks" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Référentiels
          </Link>
          <Link
            href="/compliance/requirements"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Exigences
          </Link>
        </div>

        {q.isLoading ? (
          <LoadingState rows={4} />
        ) : q.error ? (
          <p className="text-sm text-destructive">{(q.error as Error).message}</p>
        ) : q.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conformité (évalué)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {q.data.compliancePercent != null ? `${q.data.compliancePercent} %` : '—'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Numérateur : conformes / dénominateur : évalués (hors N/A)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Non-conformités</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{q.data.nonCompliantCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Partiellement conformes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {q.data.partiallyCompliantCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Exigences non évaluées</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {q.data.notAssessedRequirementCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sans preuve</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">
                  {q.data.requirementsWithoutEvidence}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Risques critiques (lien conformité)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{q.data.criticalRisksLinked}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
