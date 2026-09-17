'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
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
import { ComplianceStartReviewModal } from '@/features/compliance/components/compliance-start-review-modal';

export default function ComplianceFrameworkDetailPage() {
  const params = useParams();
  const frameworkId = typeof params.id === 'string' ? params.id : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [remediationOpen, setRemediationOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [openDomainKeys, setOpenDomainKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [treeInitFor, setTreeInitFor] = useState<string | null>(null);

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

  const domainKeys = useMemo(
    () => overviewQ.data?.domains.map((d) => d.key) ?? [],
    [overviewQ.data?.domains],
  );

  useEffect(() => {
    if (!overviewQ.data || treeInitFor === frameworkId) return;
    const first = overviewQ.data.domains[0]?.key;
    setOpenDomainKeys(first ? new Set([first]) : new Set());
    setTreeInitFor(frameworkId);
  }, [overviewQ.data, frameworkId, treeInitFor]);

  const allDomainsOpen =
    domainKeys.length > 0 && domainKeys.every((k) => openDomainKeys.has(k));

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
            <Button
              type="button"
              size="sm"
              className="min-h-11 sm:min-h-9"
              onClick={() => setReviewOpen(true)}
            >
              Lancer une revue
            </Button>
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
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <h2
                    id="fw-tree-heading"
                    className="text-sm font-semibold text-foreground"
                  >
                    Domaines et exigences
                  </h2>
                  {domainKeys.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 shrink-0 sm:min-h-9"
                      aria-expanded={allDomainsOpen}
                      aria-controls="fw-domain-tree"
                      onClick={() => {
                        setOpenDomainKeys(
                          allDomainsOpen
                            ? new Set()
                            : new Set(domainKeys),
                        );
                      }}
                    >
                      {allDomainsOpen ? 'Plier' : 'Déplier'}
                      {allDomainsOpen ? (
                        <ChevronUp className="size-4" aria-hidden />
                      ) : (
                        <ChevronDown className="size-4" aria-hidden />
                      )}
                    </Button>
                  ) : null}
                </div>
                <div id="fw-domain-tree">
                  <ComplianceFrameworkDomainTree
                    domains={overviewQ.data.domains}
                    requirements={overviewQ.data.requirements}
                    onSelectRequirement={setSelectedReqId}
                    openKeys={openDomainKeys}
                    onOpenKeysChange={setOpenDomainKeys}
                  />
                </div>
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

        <ComplianceStartReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          frameworkId={frameworkId}
          frameworkLabel={frameworkLabel}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
