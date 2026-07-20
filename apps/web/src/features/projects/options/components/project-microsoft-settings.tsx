'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { MicrosoftTeamResolveDialog } from './microsoft-team-resolve-dialog';
import type { UpdateProjectMicrosoftLinkPayload } from '../types/project-options.types';
import { getMicrosoftTeamsProvisioningSettings } from '../api/microsoft-teams-provisioning-settings.api';
import { projectOptionsKeys } from '../lib/project-options-query-keys';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import {
  canConfigureExistingTeam,
  canStartNewProvisioning,
  isConfirmedNotCreated,
  isRetryableError,
  isUnknownUnresolved,
  type ProvisioningGatingDeps,
} from '../lib/microsoft-teams-provisioning.constants';

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
  const [confirmNotCreatedOpen, setConfirmNotCreatedOpen] = useState(false);
  const [teamResolveOpen, setTeamResolveOpen] = useState(false);

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
  const link = linkQuery.data ?? null;

  const gatingDeps = useMemo((): ProvisioningGatingDeps => {
    return {
      link,
      settingsEnabled: Boolean(provisioningSettingsQuery.data?.isEnabled),
      connectionActive,
    };
  }, [link, provisioningSettingsQuery.data?.isEnabled, connectionActive]);

  const canCreateNewTeam = canStartNewProvisioning(provisioning, gatingDeps);
  const canConfigureTeam = canConfigureExistingTeam(provisioning, gatingDeps);
  const unknownUnresolved = isUnknownUnresolved(provisioning);
  const confirmedNotCreated = isConfirmedNotCreated(provisioning);

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

  const provisioningInProgress =
    provisioning?.status === 'PENDING' ||
    provisioning?.status === 'IN_PROGRESS' ||
    startProvisioningMutation.isPending ||
    retryProvisioningMutation.isPending;

  const blockActions = !canEdit || !connectionActive;
  const provisionDisabled = !canEdit || !canCreateNewTeam || provisioningInProgress;
  const configureDisabled = blockActions || !canConfigureTeam || provisioningInProgress;
  const dissociateDisabled = blockActions || !link || provisioningInProgress;

  const provisioningStatusLabel = provisioningInProgress
    ? 'Provisioning Teams en cours… Création et rattachement temporairement indisponibles.'
    : provisioning?.status === 'PARTIAL'
      ? 'Provisioning partiel : la Team existe, certains éléments restent à finaliser.'
      : provisioning?.status === 'FAILED' && !unknownUnresolved
        ? provisioning.errorMessage || 'Dernier provisioning en échec.'
        : null;

  const lockedTeamId =
    provisioning?.status === 'PARTIAL' ? provisioning.microsoftTeamId : null;

  return (
    <div className="space-y-6">
      <MicrosoftConnectionStatusCard
        connection={connection}
        isLoading={connectionQuery.isLoading}
        canEdit={canEdit}
        onConnect={() =>
          void handleConnect().catch((e) =>
            toast.error(e instanceof Error ? e.message : 'Connexion impossible'),
          )
        }
      />

      {unknownUnresolved && provisioning ? (
        <Alert>
          <AlertTitle>Résultat Teams inconnu</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              La création Teams a peut-être réussi côté Microsoft sans retour exploitable. Vérifiez
              la Team créée, puis confirmez sa présence ou son absence avant un nouveau provisioning.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={() => setConfirmNotCreatedOpen(true)}
              >
                Confirmer qu’aucune Team n’a été créée
              </Button>
              {provisioning.microsoftTeamId ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  disabled={resolveProvisioningMutation.isPending}
                  onClick={() =>
                    resolveProvisioningMutation.mutate({
                      provisioningId: provisioning.id,
                      body: {
                        resolutionType: 'TEAM_FOUND',
                        teamId: provisioning.microsoftTeamId!,
                      },
                    })
                  }
                >
                  Confirmer la Team retrouvée
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setTeamResolveOpen(true)}
                >
                  Team retrouvée : la rattacher
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {provisioning?.status === 'FAILED' &&
      !unknownUnresolved &&
      isRetryableError(provisioning.errorCode) ? (
        <Alert variant="destructive">
          <AlertTitle>Provisioning Teams en échec</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{provisioning.errorMessage || 'Le provisioning n’a pas abouti.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11"
                onClick={() => retryProvisioningMutation.mutate(provisioning.id)}
                disabled={retryProvisioningMutation.isPending}
              >
                Relancer le provisioning
              </Button>
              {canCreateNewTeam ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setProvisionConfirmOpen(true)}
                  disabled={startProvisioningMutation.isPending}
                >
                  Créer une nouvelle équipe
                </Button>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {provisioning?.status === 'FAILED' &&
      !unknownUnresolved &&
      !isRetryableError(provisioning.errorCode) ? (
        <Alert variant="destructive">
          <AlertTitle>Provisioning Teams en échec</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{provisioning.errorMessage || 'Le provisioning n’a pas abouti.'}</p>
            <div className="flex flex-wrap gap-2">
              {canCreateNewTeam ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setProvisionConfirmOpen(true)}
                  disabled={startProvisioningMutation.isPending}
                >
                  Créer une nouvelle équipe
                </Button>
              ) : null}
              {canConfigureTeam ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setConfigureOpen(true)}
                >
                  Rattacher une équipe existante
                </Button>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {confirmedNotCreated && canCreateNewTeam ? (
        <Alert>
          <AlertTitle>Aucune Team créée côté Microsoft</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Vous pouvez lancer un nouveau provisioning ou rattacher manuellement une équipe
              existante.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                onClick={() => setProvisionConfirmOpen(true)}
                disabled={startProvisioningMutation.isPending}
              >
                Créer une nouvelle équipe
              </Button>
            </div>
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                onClick={() => retryProvisioningMutation.mutate(provisioning.id)}
                disabled={retryProvisioningMutation.isPending}
              >
                Finaliser les canaux
              </Button>
              {canConfigureTeam ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setConfigureOpen(true)}
                >
                  Rattacher une équipe existante
                </Button>
              ) : null}
            </div>
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
          provisioning={provisioning}
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
              disabled={startProvisioningMutation.isPending || !canCreateNewTeam}
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

      <StariumModal
        open={confirmNotCreatedOpen}
        onOpenChange={setConfirmNotCreatedOpen}
        title="Confirmer l’absence de Team Microsoft ?"
        description="Cette action est définitive pour ce run de provisioning. Vous pourrez ensuite lancer une nouvelle création si nécessaire."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setConfirmNotCreatedOpen(false)}
              disabled={resolveProvisioningMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={resolveProvisioningMutation.isPending || !provisioning}
              onClick={() => {
                if (!provisioning) return;
                resolveProvisioningMutation.mutate(
                  {
                    provisioningId: provisioning.id,
                    body: {
                      resolutionType: 'CONFIRMED_NOT_CREATED',
                      confirmation: true,
                    },
                  },
                  { onSuccess: () => setConfirmNotCreatedOpen(false) },
                );
              }}
            >
              {resolveProvisioningMutation.isPending
                ? 'Confirmation…'
                : 'Confirmer l’absence de Team'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Utilisez cette option uniquement si vous avez vérifié dans Microsoft 365 qu’aucune équipe
          n’a été créée pour ce projet.
        </p>
      </StariumModal>

      {provisioning ? (
        <MicrosoftTeamResolveDialog
          open={teamResolveOpen}
          onOpenChange={setTeamResolveOpen}
          connectionActive={connectionActive}
          isSubmitting={resolveProvisioningMutation.isPending}
          onConfirm={(teamId) =>
            resolveProvisioningMutation.mutate(
              {
                provisioningId: provisioning.id,
                body: { resolutionType: 'TEAM_FOUND', teamId },
              },
              { onSuccess: () => setTeamResolveOpen(false) },
            )
          }
        />
      ) : null}

      <MicrosoftLinkConfigureDialog
        open={configureOpen}
        onOpenChange={setConfigureOpen}
        link={link}
        connectionActive={connectionActive}
        canEdit={canEdit}
        isSubmitting={updateMutation.isPending}
        lockedTeamId={lockedTeamId}
        onSave={handleSaveConfigure}
      />
    </div>
  );
}
