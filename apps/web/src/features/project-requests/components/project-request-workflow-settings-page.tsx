'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  fetchWorkflowSettings,
  patchWorkflowSettings,
} from '../api/project-requests.api';

const TARGET_OPTIONS = [
  {
    value: 'MANUAL_DECISION',
    label: 'Décision manuelle',
    description:
      'La demande reste approuvée en attente. Un routeur choisit ensuite la destination.',
  },
  {
    value: 'DRAFT_PROJECT',
    label: 'Créer le projet immédiatement',
    description:
      'À l’approbation, un projet brouillon est créé automatiquement dans le portefeuille.',
  },
  {
    value: 'PROJECT_BACKLOG',
    label: 'Backlog projet',
    description: 'Marque la demande comme routée vers le backlog (sans création auto).',
  },
  {
    value: 'PILOTING_CYCLE',
    label: 'Pool cycle de pilotage',
    description:
      'Ajoute un candidat au cycle sélectionné si le module et le cycle sont actifs ; sinon la demande reste en attente.',
  },
] as const;

const CYCLE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PREPARING: 'Préparation',
  TO_ARBITRATE: 'À arbitrer',
  ARBITRATED: 'Arbitré',
  IN_EXECUTION: 'En exécution',
  CLOSED: 'Clôturé',
  ARCHIVED: 'Archivé',
};

export function ProjectRequestWorkflowSettingsPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const isClientAdmin = activeClient?.role === 'CLIENT_ADMIN';
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-request-workflow-settings', clientId],
    queryFn: () => fetchWorkflowSettings(authFetch),
    enabled: !!clientId,
  });

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      patchWorkflowSettings(authFetch, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['project-request-workflow-settings', clientId],
      });
    },
  });

  if (!isClientAdmin) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <PageHeader title="Workflow demandes projet" />
          <Alert variant="destructive">
            <AlertTitle>Réservé à l’administrateur client</AlertTitle>
            <AlertDescription>
              Seul un administrateur client peut configurer le routage après approbation.
            </AlertDescription>
          </Alert>
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const target = data?.resolved.defaultApprovedTarget ?? 'MANUAL_DECISION';
  const cycleId = data?.resolved.defaultGovernanceCycleId ?? '';
  const options = data?.options;
  const pilotingAvailable = options?.pilotingCycleTargetAvailable ?? false;

  const patchTarget = (value: string) => {
    if (value === 'PILOTING_CYCLE' && !pilotingAvailable) return;
    mutation.mutate({
      defaultApprovedTarget: value,
      ...(value !== 'PILOTING_CYCLE' ? { defaultGovernanceCycleId: null } : {}),
    });
  };

  const patchCycle = (value: string) => {
    mutation.mutate({ defaultGovernanceCycleId: value || null });
  };

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Workflow demandes projet"
          description="Définissez la destination automatique après validation d’une demande."
        />
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : error ? (
          <p className="text-sm text-destructive">Chargement impossible.</p>
        ) : (
          <div className="max-w-2xl space-y-6">
            <div className="space-y-2">
              <Label>Cible après approbation</Label>
              <Select value={target} onValueChange={patchTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_OPTIONS.map((o) => {
                    const disabled =
                      o.value === 'PILOTING_CYCLE' && !pilotingAvailable;
                    return (
                      <SelectItem key={o.value} value={o.value} disabled={disabled}>
                        {o.label}
                        {disabled ? ' (indisponible)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {TARGET_OPTIONS.find((o) => o.value === target)?.description}
              </p>
            </div>

            {target === 'PILOTING_CYCLE' ? (
              <div className="space-y-2">
                <Label>Cycle de pilotage cible</Label>
                <Select value={cycleId} onValueChange={patchCycle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un cycle actif" />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.governanceCycles ?? [])
                      .filter((c) => c.activeForProjectRequestPool)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.code ? ` (${c.code})` : ''} —{' '}
                          {CYCLE_STATUS_LABELS[c.status] ?? c.status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {!options?.governanceCyclesModuleEnabled ? (
                  <Alert>
                    <AlertTitle>Module cycles inactif</AlertTitle>
                    <AlertDescription>
                      Activez le module{' '}
                      <strong>Cycles de pilotage</strong> pour ce client dans
                      l’administration des modules.
                    </AlertDescription>
                  </Alert>
                ) : !pilotingAvailable ? (
                  <Alert>
                    <AlertTitle>Aucun cycle actif</AlertTitle>
                    <AlertDescription>
                      Créez ou rouvrez un cycle de pilotage (hors clôturé / archivé)
                      avant d’utiliser cette option.
                    </AlertDescription>
                  </Alert>
                ) : options.selectedGovernanceCycleActive === false && cycleId ? (
                  <Alert variant="destructive">
                    <AlertTitle>Cycle sélectionné inactif</AlertTitle>
                    <AlertDescription>
                      Le cycle choisi n’est plus actif. Choisissez un autre cycle ou
                      changez la cible après approbation.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    À l’approbation : création d’un projet brouillon lié + candidature
                    dans le pool du cycle (si toujours actif à ce moment-là).
                  </p>
                )}
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Configuration réservée à l’administrateur client. Voir aussi{' '}
              <Link href="/client/administration" className="underline">
                Administration client
              </Link>
              .
            </p>
          </div>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
