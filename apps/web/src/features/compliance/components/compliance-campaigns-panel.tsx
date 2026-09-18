'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  listComplianceCampaigns,
  type ComplianceCampaignStatusApi,
} from '../api/compliance.api';

const STATUS_LABEL: Record<ComplianceCampaignStatusApi, string> = {
  DRAFT: 'Brouillon',
  OPEN: 'Ouverte',
  CLOSED: 'Clôturée',
  ARCHIVED: 'Archivée',
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

export function ComplianceCampaignsPanel() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id;

  const campaignsQ = useQuery({
    queryKey: ['compliance', 'campaigns', clientId, 'all'],
    queryFn: () => listComplianceCampaigns(authFetch),
    enabled: Boolean(clientId),
    staleTime: 30_000,
  });

  const items = campaignsQ.data ?? [];
  const openOrDraft = items.filter(
    (c) => c.status === 'OPEN' || c.status === 'DRAFT',
  );
  const recent = (openOrDraft.length > 0 ? openOrDraft : items).slice(0, 8);

  return (
    <section
      className="starium-section space-y-4"
      aria-labelledby="compliance-campaigns-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList
            className="size-5 text-[color:var(--brand-gold)]"
            aria-hidden
          />
          <h2
            id="compliance-campaigns-heading"
            className="text-base font-semibold tracking-tight"
          >
            Revues et campagnes
          </h2>
        </div>
        <Link
          href="/compliance/frameworks"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'min-h-11 sm:min-h-9',
          )}
        >
          Voir les référentiels
        </Link>
      </div>

      {campaignsQ.isLoading ? (
        <LoadingState rows={3} />
      ) : campaignsQ.isError ? (
        <ErrorState
          message={
            campaignsQ.error instanceof Error
              ? campaignsQ.error.message
              : 'Impossible de charger les revues.'
          }
          onRetry={() => void campaignsQ.refetch()}
        />
      ) : recent.length === 0 ? (
        <EmptyState
          title="Aucune revue"
          description="Démarrez une revue depuis la fiche d’un référentiel pour ouvrir un cycle d’évaluation borné."
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {recent.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">
                  {displayLabel(c.name, 'Revue')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {displayLabel(c.frozenFrameworkName, 'Référentiel')} (
                  {displayLabel(c.frozenFrameworkVersion, '—')}) ·{' '}
                  {c._count.snapshots} instantané
                  {c._count.snapshots > 1 ? 's' : ''} · ouverte{' '}
                  {formatDate(c.openedAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant="secondary">{STATUS_LABEL[c.status]}</Badge>
                <Link
                  href={`/compliance/campaigns/${c.id}`}
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'sm' }),
                    'min-h-11 sm:min-h-9',
                  )}
                >
                  Ouvrir la revue
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
