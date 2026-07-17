'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, usePathname } from 'next/navigation';
import { toast } from '@/lib/toast';
import { readApiErrorMessageFromResponse } from '@/lib/read-api-error-message';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectMicrosoftLinkQuery } from '../hooks/use-project-microsoft-link-query';
import {
  useResolveProjectMicrosoftTeamsProvisioningMutation,
  useRetryProjectMicrosoftTeamsProvisioningMutation,
  useStartProjectMicrosoftTeamsProvisioningMutation,
  useUpdateProjectMicrosoftLinkMutation,
} from '../hooks/use-project-microsoft-link-mutations';
import { useProjectMicrosoftTeamsProvisioningQuery } from '../hooks/use-project-microsoft-teams-provisioning-query';
import { MicrosoftConnectionStatusCard } from './microsoft-connection-status-card';
import { MicrosoftTeamsCard } from './microsoft-teams-card';
import { MicrosoftPlannerCard } from './microsoft-planner-card';
import { MicrosoftDocumentsCard } from './microsoft-documents-card';
import { MicrosoftLinkConfigureDialog } from './microsoft-link-configure-dialog';
import type { UpdateProjectMicrosoftLinkPayload } from '../types/project-options.types';
import { getMicrosoftTeamsProvisioningSettings } from '../api/microsoft-teams-provisioning-settings.api';
import { projectOptionsKeys } from '../lib/project-options-query-keys';
import { StariumModal } from '@/components/layout/form-dialog-shell';

type MicrosoftConnectionDto = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  status: string;
};

type Props = {
  projectId: string;
};

export function ProjectMicrosoftSettings({ projectId }: Props) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [configureOpen, setConfigureOpen] = useState(false);
  const [provisionConfirmOpen, setProvisionConfirmOpen] = useState(false);

  const linkQuery = useProjectMicrosoftLinkQuery(projectId);
  const provisioningQuery = useProjectMicrosoftTeamsProvisioningQuery(projectId);
  const updateMutation = useUpdateProjectMicrosoftLinkMutation(projectId);
  const startProvisioningMutation = useStartProjectMicrosoftTeamsProvisioningMutation(projectId);
  const retryProvisioningMutation = useRetryProjectMicrosoftTeamsProvisioningMutation(projectId);
  const resolveProvisioningMutation = useResolveProjectMicrosoftTeamsProvisioningMutation(projectId);

  const connectionQuery = useQuery({
    queryKey: ['microsoft-connection', clientId],
    queryFn: async () => {
      const res = await authFetch('/api/microsoft/connection');
      if (!res.ok) {
        throw new Error(
          (await readApiErrorMessageFromResponse(res)) ||
            'Impossible de charger la connexion Microsoft.',
        );
      }
      return res.json() as Promise<{ connection: MicrosoftConnectionDto | null }>;
    },
    enabled: Boolean(clientId),
  });
  const provisioningSettingsQuery = useQuery({
    queryKey: projectOptionsKeys.microsoftTeamsProvisioningSettings(clientId),
    queryFn: () => getMicrosoftTeamsProvisioningSettings(authFetch),
    enabled: Boolean(clientId),
    retry: false,
  });

  const connection = connectionQuery.data?.connection ?? null;
  const connectionActive = connection?.status === 'ACTIVE';
  const provisioning = provisioningQuery.data ?? null;

  useEffect(() => {
    const m = searchParams.get('microsoft');
    if (m === 'connected') {
      void connectionQuery.refetch();
      toast.success('Connexion Microsoft enregistrée.');
      window.history.replaceState({}, '', pathname);
    } else if (m === 'error') {
      toast.error('Échec ou annulation de la connexion Microsoft.');
      window.history.replaceState({}, '', pathname);
    }
  }, [searchParams, connectionQuery, pathname]);

  const handleConnect = useCallback(async () => {
    const res = await authFetch('/api/microsoft/auth/url');
    if (!res.ok) {
      throw new Error(
        (await readApiErrorMessageFromResponse(res)) ||
          'Impossible de démarrer la connexion Microsoft.',
      );
    }
    const json = (await res.json()) as { authorizationUrl: string };
    window.location.href = json.authorizationUrl;
  }, [authFetch]);

  const handleDissociate = useCallback(() => {
    updateMutation.mutate(
      { isEnabled: false },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: ['microsoft-connection', clientId],
          });
        },
      },
    );
  }, [updateMutation, queryClient, clientId]);

  const handleSaveConfigure = useCallback(
    (payload: UpdateProjectMicrosoftLinkPayload) => {
      updateMutation.mutate(payload, {
        onSuccess: () => setConfigureOpen(false),
      });
    },
    [updateMutation],
  );

  if (
    linkQuery.isLoading ||
    connectionQuery.isLoading ||
    provisioningQuery.isLoading ||
    provisioningSettingsQuery.isLoading
  ) {
    return <LoadingState rows={5} />;
  }

  if (
    linkQuery.isError ||
    connectionQuery.isError ||
    provisioningQuery.isError ||
    provisioningSettingsQuery.isError
  ) {
    const errorMessage =
      (linkQuery.error as Error | undefined)?.message ??
      (connectionQuery.error as Error | undefined)?.message ??
      (provisioningQuery.error as Error | undefined)?.message ??
      (provisioningSettingsQuery.error as Error | undefined)?.message ??
      'Impossible de charger la liaison Microsoft.';

    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  const link = linkQuery.data ?? null;
  const provisioningInProgress =
    provisioning?.status === 'PENDING' ||
    provisioning?.status === 'IN_PROGRESS' ||
    startProvisioningMutation.isPending ||
    retryProvisioningMutation.isPending;
  const canCreateTeams =
    Boolean(
      provisioningSettingsQuery.data?.isEnabled &&
        connectionActive &&
        !link?.teamId &&
        !provisioningInProgress &&
        !(provisioning?.status === 'PARTIAL' && provisioning?.microsoftTeamId),
    ) && canEdit;
  const blockActions = !canEdit || !connectionActive;
  const configureDisabled =
    blockActions ||
    provisioningInProgress ||
    (provisioning?.status === 'PARTIAL' && Boolean(provisioning.microsoftTeamId));
  const dissociateDisabled = blockActions || !link || provisioningInProgress;
  const provisionDisabled = !canCreateTeams;

  const provisioningStatusLabel =
    provisioningInProgress
      ? 'Provisioning Teams en cours… Création et rattachement temporairement indisponibles.'
      : provisioning?.status === 'PARTIAL'
        ? 'Provisioning partiel : la Team existe, certains éléments restent à finaliser.'
        : provisioning?.status === 'FAILED'
          ? provisioning.errorMessage || 'Dernier provisioning en échec.'
          : null;

  return (
    <div className="space-y-6">
      <MicrosoftConnectionStatusCard
        connection={connection}
        isLoading={connectionQuery.isLoading}
        canEdit={canEdit}
        onConnect={() => void handleConnect().catch((e) => toast.error(e instanceof Error ? e.message : 'Connexion impossible'))}
      />

      {provisioning?.status === 'FAILED' &&
      provisioning.errorCode === 'TEAM_CREATION_OUTCOME_UNKNOWN' &&
      !provisioning.resolvedAt ? (
        <Alert>
          <AlertTitle>Résultat Teams inconnu</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              La création Teams a peut-être réussi côté Microsoft sans retour exploitable. Vérifiez
              la Team créée, puis confirmez sa présence ou son absence avant un nouveau retry.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  resolveProvisioningMutation.mutate({
                    provisioningId: provisioning.id,
                    body: { resolutionType: 'CONFIRMED_NOT_CREATED' },
                  })
                }
              >
                Confirmer qu’aucune Team n’a été créée
              </Button>
              {provisioning.microsoftTeamId ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    resolveProvisioningMutation.mutate({
                      provisioningId: provisioning.id,
                      body: {
                        resolutionType: 'TEAM_FOUND',
                        teamId: provisioning.microsoftTeamId ?? undefined,
                      },
                    })
                  }
                >
                  Confirmer la Team retrouvée
                </Button>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {provisioning?.status === 'FAILED' &&
      provisioning.errorCode !== 'TEAM_CREATION_OUTCOME_UNKNOWN' ? (
        <Alert variant="destructive">
          <AlertTitle>Provisioning Teams en échec</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{provisioning.errorMessage || 'Le provisioning n’a pas abouti.'}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => retryProvisioningMutation.mutate(provisioning.id)}
              disabled={retryProvisioningMutation.isPending}
            >
              Relancer le provisioning
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {provisioning?.status === 'PARTIAL' ? (
        <Alert>
          <AlertTitle>Provisioning Teams partiel</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              La Team Microsoft est déjà rattachée à ce projet
              {provisioning.microsoftTeamId && link?.teamName
                ? ` (« ${link.teamName} »)`
                : ''}
              . Certains canaux n’ont pas pu être créés : finalisez-les sans créer une nouvelle
              équipe.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => retryProvisioningMutation.mutate(provisioning.id)}
              disabled={retryProvisioningMutation.isPending}
            >
              Finaliser les canaux
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!link?.teamId ? (
        <Alert>
          <AlertTitle>Aucune équipe Teams liée</AlertTitle>
          <AlertDescription>
            {provisioningSettingsQuery.data?.isEnabled
              ? 'Choisissez « Créer l’équipe Teams » (nouvelle équipe) ou « Rattacher une équipe existante ».'
              : 'Vous pouvez rattacher une équipe existante. Pour créer une nouvelle équipe depuis Starium, activez d’abord le provisioning dans Options projets → Équipes Microsoft.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <MicrosoftTeamsCard
          teamName={link?.teamName ?? null}
          channelName={link?.channelName ?? null}
          canEdit={canEdit}
          provisioningFeatureEnabled={Boolean(provisioningSettingsQuery.data?.isEnabled)}
          connectionActive={connectionActive}
          configureDisabled={configureDisabled}
          dissociateDisabled={dissociateDisabled}
          provisionDisabled={provisionDisabled}
          provisioningInProgress={provisioningInProgress}
          provisioningStatusLabel={provisioningStatusLabel}
          onConfigure={() => setConfigureOpen(true)}
          onDissociate={handleDissociate}
          onProvision={() => setProvisionConfirmOpen(true)}
        />
        <MicrosoftPlannerCard
          plannerPlanTitle={link?.plannerPlanTitle ?? null}
          canEdit={canEdit}
          configureDisabled={configureDisabled}
          dissociateDisabled={dissociateDisabled}
          onConfigure={() => setConfigureOpen(true)}
          onDissociate={handleDissociate}
        />
        <MicrosoftDocumentsCard
          filesDriveId={link?.filesDriveId ?? null}
          filesFolderId={link?.filesFolderId ?? null}
          canEdit={canEdit}
          configureDisabled={configureDisabled}
          dissociateDisabled={dissociateDisabled}
          onConfigure={() => setConfigureOpen(true)}
          onDissociate={handleDissociate}
        />
      </div>

      <StariumModal
        open={provisionConfirmOpen}
        onOpenChange={setProvisionConfirmOpen}
        title="Créer une équipe Microsoft Teams ?"
        description="Une nouvelle équipe sera créée dans votre tenant Microsoft selon le modèle et les canaux configurés."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setProvisionConfirmOpen(false)}
              disabled={startProvisioningMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={startProvisioningMutation.isPending}
              onClick={() => {
                startProvisioningMutation.mutate(undefined, {
                  onSuccess: () => setProvisionConfirmOpen(false),
                });
              }}
            >
              {startProvisioningMutation.isPending
                ? 'Lancement…'
                : 'Confirmer la création'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p>
            Cette action crée une équipe Teams réelle dans Microsoft 365. Elle ne peut pas être
            annulée automatiquement depuis Starium.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Modèle de nom :{' '}
              <code className="text-foreground">
                {provisioningSettingsQuery.data?.teamNameTemplate ?? '{{code}} - {{name}}'}
              </code>
            </li>
            <li>Canaux créés selon les templates définis dans Options projets.</li>
            <li>Propriétaire Microsoft = compte OAuth reconnecté (pas le chef de projet Starium).</li>
          </ul>
        </div>
      </StariumModal>

      <MicrosoftLinkConfigureDialog
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        link={link}
        connectionActive={connectionActive}
        canEdit={canEdit}
        isSubmitting={updateMutation.isPending}
        onSave={handleSaveConfigure}
      />
    </div>
  );
}
