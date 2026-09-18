'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  createComplianceCampaignSnapshot,
  downloadComplianceCampaignSnapshotZip,
  getComplianceCampaign,
  getComplianceFrameworkOverview,
  type ComplianceCampaignModalityApi,
  type ComplianceCampaignOwnerApi,
  type ComplianceCampaignStatusApi,
} from '../api/compliance.api';
import {
  normalizeScopeDomainKeys,
  scopeComplianceOverview,
} from '../lib/compliance-campaign-scope';
import { ComplianceFrameworkDetailHero } from './compliance-framework-detail-hero';
import { ComplianceFrameworkDomainTree } from './compliance-framework-domain-tree';
import { ComplianceFrameworkDetailRail } from './compliance-framework-detail-rail';
import { ComplianceRemediationModal } from './compliance-remediation-modal';
import { ComplianceRequirementDetailModal } from './compliance-requirement-detail-modal';
import { ComplianceCampaignCloseModal } from './compliance-campaign-close-modal';

const STATUS_LABEL: Record<ComplianceCampaignStatusApi, string> = {
  DRAFT: 'Brouillon',
  OPEN: 'Ouverte',
  CLOSED: 'Clôturée',
  ARCHIVED: 'Archivée',
};

const MODALITY_LABEL: Record<ComplianceCampaignModalityApi, string> = {
  SELF_ASSESSMENT: 'Auto-évaluation',
  INTERNAL_AUDIT: 'Audit interne',
  EXTERNAL_AUDIT: 'Audit externe',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function ownerLabel(owner: ComplianceCampaignOwnerApi | null): string {
  if (!owner) return 'Responsable non renseigné';
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim();
  const base = firstDisplayLabel([name, owner.email], 'Membre retiré');
  const job = owner.jobTitle?.trim();
  return job ? `${base} — ${job}` : base;
}

export function ComplianceCampaignWorkspace({
  campaignId,
}: {
  campaignId: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [remediationOpen, setRemediationOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [openDomainKeys, setOpenDomainKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [treeInitFor, setTreeInitFor] = useState<string | null>(null);

  const campaignQ = useQuery({
    queryKey: ['compliance', 'campaign-detail', clientId, campaignId],
    queryFn: () => getComplianceCampaign(authFetch, campaignId),
    enabled: Boolean(clientId) && Boolean(campaignId),
  });

  const frameworkId = campaignQ.data?.framework.id ?? '';

  const overviewQ = useQuery({
    queryKey: [
      'compliance',
      'framework',
      clientId,
      frameworkId,
      'overview',
    ],
    queryFn: () => getComplianceFrameworkOverview(authFetch, frameworkId),
    enabled: Boolean(clientId) && Boolean(frameworkId),
  });

  const scopeKeys = useMemo(
    () => normalizeScopeDomainKeys(campaignQ.data?.scopeDomainKeys ?? null),
    [campaignQ.data?.scopeDomainKeys],
  );

  const scopedOverview = useMemo(() => {
    if (!overviewQ.data) return null;
    return scopeComplianceOverview(overviewQ.data, scopeKeys);
  }, [overviewQ.data, scopeKeys]);

  const domainKeys = useMemo(
    () => scopedOverview?.domains.map((d) => d.key) ?? [],
    [scopedOverview?.domains],
  );

  useEffect(() => {
    if (!scopedOverview || treeInitFor === campaignId) return;
    const first = scopedOverview.domains[0]?.key;
    setOpenDomainKeys(first ? new Set([first]) : new Set());
    setTreeInitFor(campaignId);
  }, [scopedOverview, campaignId, treeInitFor]);

  const allDomainsOpen =
    domainKeys.length > 0 && domainKeys.every((k) => openDomainKeys.has(k));

  const navigationIds = useMemo(
    () => scopedOverview?.requirements.map((r) => r.id) ?? [],
    [scopedOverview?.requirements],
  );

  const selectedPreview = useMemo(() => {
    const row = scopedOverview?.requirements.find((r) => r.id === selectedReqId);
    if (!row || !scopedOverview) return null;
    return {
      code: row.code,
      title: row.title,
      framework: {
        id: scopedOverview.framework.id,
        name: scopedOverview.framework.name,
        version: scopedOverview.framework.version,
        isActive: scopedOverview.framework.isActive,
      },
    };
  }, [scopedOverview, selectedReqId]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['compliance', 'campaign-detail', clientId, campaignId],
    });
    await queryClient.invalidateQueries({
      queryKey: ['compliance', 'campaigns', clientId],
    });
    if (frameworkId) {
      await queryClient.invalidateQueries({
        queryKey: [
          'compliance',
          'framework',
          clientId,
          frameworkId,
          'overview',
        ],
      });
    }
  };

  const snapMut = useMutation({
    mutationFn: () =>
      createComplianceCampaignSnapshot(authFetch, campaignId, {
        label: `Instantané ${new Date().toLocaleString('fr-FR')}`,
      }),
    onSuccess: async () => {
      toast.success('Instantané créé');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadMut = useMutation({
    mutationFn: (snapshotId: string) =>
      downloadComplianceCampaignSnapshotZip(authFetch, campaignId, snapshotId),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const campaign = campaignQ.data;
  const isOpen = campaign?.status === 'OPEN';
  const isClosed =
    campaign?.status === 'CLOSED' || campaign?.status === 'ARCHIVED';

  if (campaignQ.isLoading) {
    return <LoadingState rows={6} />;
  }

  if (campaignQ.isError || !campaign) {
    return (
      <ErrorState
        message={
          campaignQ.error instanceof Error
            ? campaignQ.error.message
            : 'Campagne introuvable.'
        }
        onRetry={() => void campaignQ.refetch()}
      />
    );
  }

  const campaignTitle = displayLabel(campaign.name, 'Revue');

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Gouvernance › Conformité › Revue"
        title={campaignTitle}
        description={`${displayLabel(campaign.frozenFrameworkName, 'Référentiel')} · v${displayLabel(campaign.frozenFrameworkVersion, '—')}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{STATUS_LABEL[campaign.status]}</Badge>
            <Link
              href={`/compliance/frameworks/${campaign.framework.id}`}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'min-h-11 gap-1.5 sm:min-h-9',
              )}
            >
              Référentiel
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            {isOpen ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 gap-1.5 sm:min-h-9"
                  disabled={snapMut.isPending}
                  onClick={() => snapMut.mutate()}
                >
                  <Camera className="size-3.5" aria-hidden />
                  Instantané
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  onClick={() => setCloseOpen(true)}
                >
                  Clôturer
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <dl className="grid gap-3 rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="starium-overline text-muted-foreground">Modalité</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {MODALITY_LABEL[campaign.modality] ?? 'Modalité non renseignée'}
          </dd>
        </div>
        <div>
          <dt className="starium-overline text-muted-foreground">Responsable</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {ownerLabel(campaign.owner)}
          </dd>
        </div>
        <div>
          <dt className="starium-overline text-muted-foreground">Échéance</dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
            {formatDate(campaign.dueAt)}
          </dd>
        </div>
        <div>
          <dt className="starium-overline text-muted-foreground">Périmètre</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {scopeKeys
              ? `${scopeKeys.length} domaine${scopeKeys.length > 1 ? 's' : ''}`
              : 'Référentiel complet'}
          </dd>
        </div>
      </dl>

      {isClosed ? (
        <p
          className="rounded-[var(--radius-md)] border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          Revue clôturée le {formatDate(campaign.closedAt)}. Consultation et
          export d’instantanés disponibles ; les évaluations se poursuivent sur
          le référentiel.
        </p>
      ) : null}

      {overviewQ.isLoading ? (
        <LoadingState rows={5} />
      ) : overviewQ.isError ? (
        <ErrorState
          message={
            overviewQ.error instanceof Error
              ? overviewQ.error.message
              : 'Impossible de charger le périmètre.'
          }
          onRetry={() => void overviewQ.refetch()}
        />
      ) : scopedOverview && scopedOverview.requirementCount === 0 ? (
        <EmptyState
          title="Aucune exigence dans le périmètre"
          description="Les domaines sélectionnés ne contiennent pas d’exigences."
        />
      ) : scopedOverview ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="min-w-0 space-y-4">
            <ComplianceFrameworkDetailHero overview={scopedOverview} />
            <section className="space-y-2" aria-labelledby="camp-tree-heading">
              <div className="flex min-h-11 items-center justify-between gap-3">
                <h2
                  id="camp-tree-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Domaines et exigences du périmètre
                </h2>
                {domainKeys.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 shrink-0 sm:min-h-9"
                    aria-expanded={allDomainsOpen}
                    aria-controls="camp-domain-tree"
                    onClick={() => {
                      setOpenDomainKeys(
                        allDomainsOpen ? new Set() : new Set(domainKeys),
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
              <div id="camp-domain-tree">
                <ComplianceFrameworkDomainTree
                  domains={scopedOverview.domains}
                  requirements={scopedOverview.requirements}
                  onSelectRequirement={setSelectedReqId}
                  openKeys={openDomainKeys}
                  onOpenKeysChange={setOpenDomainKeys}
                />
              </div>
            </section>
          </div>
          <ComplianceFrameworkDetailRail
            overview={scopedOverview}
            onOpenRemediation={() => setRemediationOpen(true)}
          />
        </div>
      ) : null}

      <section
        className="starium-section space-y-3 p-4"
        aria-labelledby="camp-snapshots-heading"
      >
        <h2
          id="camp-snapshots-heading"
          className="text-sm font-semibold text-foreground"
        >
          Instantanés
        </h2>
        {campaign.snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun instantané pour cette revue.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {campaign.snapshots.map((snap) => (
              <li
                key={snap.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayLabel(snap.label, 'Instantané')}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(snap.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 gap-1.5 sm:min-h-9"
                  disabled={downloadMut.isPending}
                  onClick={() => downloadMut.mutate(snap.id)}
                >
                  <Download className="size-3.5" aria-hidden />
                  Export ZIP
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
        frameworkLabel={displayLabel(
          campaign.frozenFrameworkName,
          'Référentiel',
        )}
        items={scopedOverview?.remediation ?? []}
        onEvaluate={(id) => {
          setSelectedReqId(id);
          void invalidate();
        }}
      />

      <ComplianceCampaignCloseModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        campaignId={campaignId}
        campaignName={campaignTitle}
        onClosed={() => void invalidate()}
      />
    </div>
  );
}
