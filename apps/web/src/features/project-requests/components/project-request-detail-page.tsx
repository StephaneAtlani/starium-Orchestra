'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  getProjectRequest,
  postProjectRequestDecision,
  submitProjectRequest,
} from '../api/project-requests.api';
import {
  PROJECT_REQUEST_STATUS_LABELS,
  PROJECT_REQUEST_URGENCY_LABELS,
} from '../constants/project-request-labels';

export function ProjectRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();
  const { user } = useAuth();
  const { has } = usePermissions();
  const canSubmit =
    has('project_requests.create') || has('project_requests.update');

  const decisionMutation = useMutation({
    mutationFn: (outcome: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO') =>
      postProjectRequestDecision(authFetch, id, { outcome }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-request', clientId, id] });
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-request', clientId, id],
    queryFn: () => getProjectRequest(authFetch, id),
    enabled: !!clientId && !!id,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitProjectRequest(authFetch, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-request', clientId, id] });
    },
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error || !data ? (
          <p className="text-sm text-destructive">Demande introuvable.</p>
        ) : (
          <>
            <PageHeader
              title={data.title}
              description={
                PROJECT_REQUEST_STATUS_LABELS[data.status] ?? data.status
              }
            />
            <div className="max-w-2xl space-y-4 text-sm">
              <p>
                <span className="text-muted-foreground">Demandeur : </span>
                {data.requesterSummary.displayName}
              </p>
              {data.validatorSummary ? (
                <p>
                  <span className="text-muted-foreground">Validateur : </span>
                  {data.validatorSummary.displayName}
                </p>
              ) : null}
              {data.description ? (
                <p className="whitespace-pre-wrap">{data.description}</p>
              ) : null}
              {data.expectedBenefits ? (
                <div>
                  <p className="text-muted-foreground">Gain métier attendu</p>
                  <p className="whitespace-pre-wrap">{data.expectedBenefits}</p>
                </div>
              ) : null}
              {data.businessContext ? (
                <div>
                  <p className="text-muted-foreground">Contexte métier</p>
                  <p className="whitespace-pre-wrap">{data.businessContext}</p>
                </div>
              ) : null}
              {data.riskIfNotDone ? (
                <div>
                  <p className="text-muted-foreground">Risque si non réalisé</p>
                  <p className="whitespace-pre-wrap">{data.riskIfNotDone}</p>
                </div>
              ) : null}
              {data.urgency ? (
                <p>
                  <span className="text-muted-foreground">Urgence : </span>
                  {PROJECT_REQUEST_URGENCY_LABELS[data.urgency] ?? data.urgency}
                </p>
              ) : null}
              {data.estimatedBudget != null ? (
                <p>
                  <span className="text-muted-foreground">Budget estimé : </span>
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(data.estimatedBudget)}
                </p>
              ) : null}
              {data.convertedProjectSummary ? (
                <p>
                  <span className="text-muted-foreground">Projet : </span>
                  <Link
                    href={`/projects/${data.convertedProjectSummary.id}`}
                    className="underline"
                  >
                    {data.convertedProjectSummary.name} ({data.convertedProjectSummary.code})
                  </Link>
                </p>
              ) : null}
              {(data.status === 'DRAFT' || data.status === 'NEEDS_MORE_INFO') &&
                canSubmit && (
                  <Button
                    size="sm"
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                  >
                    Soumettre pour validation
                  </Button>
                )}
              {data.status === 'SUBMITTED' &&
                user?.id != null &&
                data.validatorSummary?.id === user.id && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => decisionMutation.mutate('APPROVED')}
                    disabled={decisionMutation.isPending}
                  >
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decisionMutation.mutate('NEEDS_MORE_INFO')}
                    disabled={decisionMutation.isPending}
                  >
                    Demander des précisions
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => decisionMutation.mutate('REJECTED')}
                    disabled={decisionMutation.isPending}
                  >
                    Refuser
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
