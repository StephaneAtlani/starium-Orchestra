'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, usePathname } from 'next/navigation';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectMicrosoftLinkQuery } from '../hooks/use-project-microsoft-link-query';
import { useUpdateProjectMicrosoftLinkMutation } from '../hooks/use-project-microsoft-link-mutations';
import { MicrosoftConnectionStatusCard } from './microsoft-connection-status-card';
import { MicrosoftTeamsCard } from './microsoft-teams-card';
import { MicrosoftPlannerCard } from './microsoft-planner-card';
import { MicrosoftDocumentsCard } from './microsoft-documents-card';
import { MicrosoftLinkConfigureDialog } from './microsoft-link-configure-dialog';
import type { UpdateProjectMicrosoftLinkPayload } from '../types/project-options.types';

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

  const linkQuery = useProjectMicrosoftLinkQuery(projectId);
  const updateMutation = useUpdateProjectMicrosoftLinkMutation(projectId);

  const connectionQuery = useQuery({
    queryKey: ['microsoft-connection', clientId],
    queryFn: async () => {
      const res = await authFetch('/api/microsoft/connection');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string })?.message ??
            'Impossible de charger la connexion Microsoft.',
        );
      }
      return res.json() as Promise<{ connection: MicrosoftConnectionDto | null }>;
    },
    enabled: Boolean(clientId),
  });

  const connection = connectionQuery.data?.connection ?? null;
  const connectionActive = connection?.status === 'ACTIVE';

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
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { message?: string })?.message ??
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

  if (linkQuery.isLoading || connectionQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  if (linkQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {(linkQuery.error as Error)?.message ?? 'Impossible de charger la liaison Microsoft.'}
        </AlertDescription>
      </Alert>
    );
  }

  const link = linkQuery.data ?? null;
  const blockActions = !canEdit || !connectionActive;
  const configureDisabled = blockActions;
  const dissociateDisabled = blockActions || !link;

  return (
    <div className="space-y-6">
      <MicrosoftConnectionStatusCard
        connection={connection}
        isLoading={connectionQuery.isLoading}
        canEdit={canEdit}
        onConnect={() => void handleConnect().catch((e) => toast.error(e instanceof Error ? e.message : 'Connexion impossible'))}
      />

      {!link ? (
        <Alert>
          <AlertTitle>Aucune configuration Microsoft</AlertTitle>
          <AlertDescription>
            Enregistrez une liaison Teams / Planner pour ce projet via « Configurer » sur une des
            cartes ci-dessous (création du lien côté API).
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <MicrosoftTeamsCard
          teamName={link?.teamName ?? null}
          channelName={link?.channelName ?? null}
          canEdit={canEdit}
          configureDisabled={configureDisabled}
          dissociateDisabled={dissociateDisabled}
          onConfigure={() => setConfigureOpen(true)}
          onDissociate={handleDissociate}
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
