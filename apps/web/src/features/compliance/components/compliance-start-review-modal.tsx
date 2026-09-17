'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import {
  closeComplianceCampaign,
  createComplianceCampaign,
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

export function ComplianceStartReviewModal({
  open,
  onOpenChange,
  frameworkId,
  frameworkLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
  frameworkLabel: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id;
  const queryClient = useQueryClient();

  const listQ = useQuery({
    queryKey: ['compliance', 'campaigns', clientId, frameworkId],
    queryFn: () => listComplianceCampaigns(authFetch, frameworkId),
    enabled: open && Boolean(clientId) && Boolean(frameworkId),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['compliance', 'campaigns', clientId, frameworkId],
    });
  };

  const startMut = useMutation({
    mutationFn: () =>
      createComplianceCampaign(authFetch, {
        frameworkId,
        openImmediately: true,
        createSnapshot: true,
      }),
    onSuccess: async (camp) => {
      toast.success(
        `Revue démarrée — ${displayLabel(camp.name, 'Campagne')}`,
      );
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: (id: string) =>
      closeComplianceCampaign(authFetch, id, { createSnapshot: true }),
    onSuccess: async () => {
      toast.success('Revue clôturée (instantané créé)');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Lancer une revue"
      description={`Campagne d’audit sur ${frameworkLabel} — fige la version et photographie les évaluations.`}
      icon={ClipboardCheck}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={startMut.isPending}
            onClick={() => startMut.mutate()}
          >
            {startMut.isPending ? 'Création…' : 'Démarrer la revue'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          La revue ouvre une campagne, fige le nom et la version du référentiel,
          et crée un instantané initial des exigences / preuves du client actif.
        </p>

        <section aria-labelledby="campaigns-list-heading" className="space-y-2">
          <h3 id="campaigns-list-heading" className="text-sm font-semibold">
            Revues de ce référentiel
          </h3>
          {listQ.isLoading ? (
            <LoadingState rows={2} />
          ) : (listQ.data ?? []).length === 0 ? (
            <EmptyState
              title="Aucune revue"
              description="Démarrez une revue pour figer l’état d’évaluation actuel."
            />
          ) : (
            <ul className="space-y-2">
              {(listQ.data ?? []).map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">
                      {displayLabel(c.name, 'Revue')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {displayLabel(c.frozenFrameworkName, 'Référentiel')}{' '}
                      ({displayLabel(c.frozenFrameworkVersion, '—')}) ·{' '}
                      {c._count.snapshots} instantané
                      {c._count.snapshots > 1 ? 's' : ''} · ouverte{' '}
                      {formatDate(c.openedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {STATUS_LABEL[c.status]}
                    </Badge>
                    {c.status === 'OPEN' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 sm:min-h-9"
                        disabled={closeMut.isPending}
                        onClick={() => closeMut.mutate(c.id)}
                      >
                        Clôturer
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StariumModal>
  );
}
