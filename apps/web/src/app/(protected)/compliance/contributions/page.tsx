'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { useState } from 'react';
import {
  listMyComplianceContributions,
  patchComplianceContribution,
} from '@/features/compliance/api/compliance.api';

const STATUS_LABEL: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  SUBMITTED: 'Soumise',
  ACCEPTED: 'Acceptée',
  NEEDS_MORE: 'À compléter',
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

export default function ComplianceMyContributionsPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const listQ = useQuery({
    queryKey: ['compliance', 'contributions', 'mine', clientId],
    queryFn: () => listMyComplianceContributions(authFetch),
    enabled: Boolean(clientId),
  });

  const submitMut = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      patchComplianceContribution(authFetch, id, {
        status: 'SUBMITTED',
        response,
      }),
    onSuccess: async () => {
      toast.success('Contribution soumise');
      await queryClient.invalidateQueries({
        queryKey: ['compliance', 'contributions', 'mine', clientId],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startMut = useMutation({
    mutationFn: (id: string) =>
      patchComplianceContribution(authFetch, id, { status: 'IN_PROGRESS' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['compliance', 'contributions', 'mine', clientId],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          eyebrow="Gouvernance › Conformité"
          title="Mes contributions"
          description="Demandes qui vous sont assignées : consignes, échéances et réponses."
        />

        {listQ.isLoading ? (
          <LoadingState rows={4} />
        ) : listQ.isError ? (
          <ErrorState
            message={
              listQ.error instanceof Error
                ? listQ.error.message
                : 'Impossible de charger vos contributions.'
            }
            onRetry={() => void listQ.refetch()}
          />
        ) : (listQ.data ?? []).length === 0 ? (
        <EmptyState
          title="Aucune contribution"
          description="Les demandes qui vous sont assignées apparaîtront ici."
        />
        ) : (
          <ul className="starium-stack space-y-3">
            {(listQ.data ?? []).map((c) => {
              const editable =
                c.status === 'TODO' ||
                c.status === 'IN_PROGRESS' ||
                c.status === 'NEEDS_MORE' ||
                c.status === 'BLOCKED';
              return (
                <li
                  key={c.id}
                  className="rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 shadow-[var(--shadow-1)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        {displayLabel(c.requirementCode, 'Exigence')} —{' '}
                        {displayLabel(c.requirementTitle, 'sans titre')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {displayLabel(c.frameworkName, 'Référentiel')} · échéance{' '}
                        {formatDate(c.dueAt)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm">{c.instruction}</p>
                  {c.response && !editable ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Votre réponse : {c.response}
                    </p>
                  ) : null}
                  {editable ? (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor={`resp-${c.id}`}>Votre réponse</Label>
                      <Textarea
                        id={`resp-${c.id}`}
                        className="min-h-24 text-foreground"
                        value={drafts[c.id] ?? c.response ?? ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        {c.status === 'TODO' ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 sm:min-h-9"
                            disabled={startMut.isPending}
                            onClick={() => startMut.mutate(c.id)}
                          >
                            Démarrer
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          className="min-h-11 sm:min-h-9"
                          disabled={
                            submitMut.isPending ||
                            !(drafts[c.id] ?? c.response ?? '').trim()
                          }
                          onClick={() =>
                            submitMut.mutate({
                              id: c.id,
                              response: (drafts[c.id] ?? c.response ?? '').trim(),
                            })
                          }
                        >
                          Soumettre
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
