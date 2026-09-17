'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import {
  getComplianceFrameworkOverview,
  listComplianceFrameworks,
} from '@/features/compliance/api/compliance.api';
import { frameworkDisplayLabel } from '@/features/compliance/lib/compliance-labels';
import { ComplianceFrameworkDetailHero } from '@/features/compliance/components/compliance-framework-detail-hero';
import { ComplianceFrameworkDomainTree } from '@/features/compliance/components/compliance-framework-domain-tree';
import { ComplianceFrameworkDetailRail } from '@/features/compliance/components/compliance-framework-detail-rail';
import { ComplianceRemediationModal } from '@/features/compliance/components/compliance-remediation-modal';
import { ComplianceRequirementDetailModal } from '@/features/compliance/components/compliance-requirement-detail-modal';

export default function ComplianceFrameworkDetailPage() {
  const params = useParams();
  const frameworkId = typeof params.id === 'string' ? params.id : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [remediationOpen, setRemediationOpen] = useState(false);

  const overviewQ = useQuery({
    queryKey: ['compliance', 'framework', clientId, frameworkId, 'overview'],
    queryFn: () => getComplianceFrameworkOverview(authFetch, frameworkId),
    enabled: Boolean(clientId) && Boolean(frameworkId),
  });

  const frameworksQ = useQuery({
    queryKey: ['compliance', 'frameworks', clientId],
    queryFn: () => listComplianceFrameworks(authFetch),
    enabled: Boolean(clientId),
  });

  const navigationIds = useMemo(
    () => overviewQ.data?.requirements.map((r) => r.id) ?? [],
    [overviewQ.data?.requirements],
  );

  const selectedPreview = useMemo(() => {
    const row = overviewQ.data?.requirements.find((r) => r.id === selectedReqId);
    if (!row || !overviewQ.data) return null;
    return {
      code: row.code,
      title: row.title,
      framework: {
        id: overviewQ.data.framework.id,
        name: overviewQ.data.framework.name,
        version: overviewQ.data.framework.version,
        isActive: overviewQ.data.framework.isActive,
      },
    };
  }, [overviewQ.data, selectedReqId]);

  const frameworkLabel = overviewQ.data
    ? frameworkDisplayLabel(overviewQ.data.framework)
    : 'Référentiel';

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <PageHeader
          eyebrow="Gouvernance › Conformité"
          title={
            overviewQ.data
              ? displayLabel(overviewQ.data.framework.name, 'Référentiel')
              : 'Référentiel'
          }
          description={
            overviewQ.data
              ? `Version ${displayLabel(overviewQ.data.framework.version, '—')} — évaluation opérationnelle`
              : 'Chargement du référentiel…'
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/compliance/frameworks"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Tous les référentiels
              </Link>
              <Link
                href="/compliance/requirements"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Exigences
              </Link>
            </div>
          }
        />

        {(frameworksQ.data?.length ?? 0) > 1 ? (
          <nav
            className="starium-tab-group flex max-w-full flex-wrap gap-1 overflow-x-auto"
            aria-label="Référentiels actifs"
          >
            {(frameworksQ.data ?? []).map((fw) => {
              const active = fw.id === frameworkId;
              return (
                <Link
                  key={fw.id}
                  href={`/compliance/frameworks/${fw.id}`}
                  className={cn(
                    'starium-tab-btn min-h-11 shrink-0 px-3 text-sm sm:min-h-9',
                    active && 'starium-tab-btn--active',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {displayLabel(fw.name, 'Référentiel')}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {overviewQ.isLoading ? (
          <LoadingState rows={6} />
        ) : overviewQ.isError ? (
          <ErrorState
            message={
              overviewQ.error instanceof Error
                ? overviewQ.error.message
                : 'Impossible de charger le référentiel.'
            }
            onRetry={() => void overviewQ.refetch()}
          />
        ) : overviewQ.data ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
            <div className="min-w-0 space-y-4">
              <ComplianceFrameworkDetailHero overview={overviewQ.data} />
              <section className="space-y-2" aria-labelledby="fw-tree-heading">
                <h2 id="fw-tree-heading" className="text-sm font-semibold text-foreground">
                  Domaines et exigences
                </h2>
                <ComplianceFrameworkDomainTree
                  domains={overviewQ.data.domains}
                  requirements={overviewQ.data.requirements}
                  onSelectRequirement={setSelectedReqId}
                />
              </section>
            </div>
            <ComplianceFrameworkDetailRail
              overview={overviewQ.data}
              onOpenRemediation={() => setRemediationOpen(true)}
            />
          </div>
        ) : null}

        <ComplianceRequirementDetailModal
          open={selectedReqId != null}
          onOpenChange={(next) => {
            if (!next) setSelectedReqId(null);
          }}
          requirementId={selectedReqId}
          preview={selectedPreview}
          navigationIds={navigationIds}
          onNavigate={setSelectedReqId}
        />

        <ComplianceRemediationModal
          open={remediationOpen}
          onOpenChange={setRemediationOpen}
          frameworkLabel={frameworkLabel}
          items={overviewQ.data?.remediation ?? []}
          onEvaluate={(id) => {
            setSelectedReqId(id);
            void queryClient.invalidateQueries({
              queryKey: ['compliance', 'framework', clientId, frameworkId, 'overview'],
            });
          }}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
