'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useDirectoryConnectionsQuery, useDirectoryGroupScopesQuery, useDirectoryJobsQuery, useProviderGroupsQuery } from '../hooks/use-team-sync-queries';
import { useTeamSyncMutations } from '../hooks/use-team-sync-mutations';
import type { DirectorySyncExecution } from '../types/team-sync.types';
import { TeamSyncHistory } from './team-sync-history';
import { TeamSyncRunPanel } from './team-sync-run-panel';

export function TeamSyncSettings() {
  const authFetch = useAuthenticatedFetch();
  const connectionsQuery = useDirectoryConnectionsQuery();
  const jobsQuery = useDirectoryJobsQuery();
  const {
    createConnectionMutation,
    updateConnectionMutation,
    testConnectionMutation,
    addGroupScopeMutation,
    deleteGroupScopeMutation,
    previewSyncMutation,
    executeSyncMutation,
  } = useTeamSyncMutations();

  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedProviderGroupId, setSelectedProviderGroupId] = useState('');
  const [lastExecution, setLastExecution] = useState<DirectorySyncExecution | null>(null);

  const microsoftConnectionQuery = useQuery({
    queryKey: ['team-sync', 'microsoft-connection'],
    queryFn: async () => {
      const res = await authFetch('/api/microsoft/connection');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string })?.message ??
            'Impossible de charger la connexion Microsoft.',
        );
      }
      return (await res.json()) as {
        connection: { id: string; status: string; tenantId: string } | null;
      };
    },
  });

  const selectedConnection = useMemo(
    () =>
      connectionsQuery.data?.find((c) => c.id === selectedConnectionId) ??
      connectionsQuery.data?.[0] ??
      null,
    [connectionsQuery.data, selectedConnectionId],
  );

  const connectionId = selectedConnection?.id ?? null;
  const groupScopesQuery = useDirectoryGroupScopesQuery(connectionId);
  const providerGroupsQuery = useProviderGroupsQuery(connectionId);

  const handleInitializeDirectoryConnection = async () => {
    try {
      const created = await createConnectionMutation.mutateAsync({
        name: 'Annuaire principal',
        providerType: 'MICROSOFT_GRAPH',
        isActive: true,
        isSyncEnabled: false,
        lockSyncedCollaborators: true,
      });
      setSelectedConnectionId(created.id);
      toast.success('Synchronisation annuaire initialisée.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erreur initialisation synchronisation annuaire.',
      );
    }
  };

  const handleSavePolicy = async () => {
    if (!selectedConnection) return;
    try {
      await updateConnectionMutation.mutateAsync({
        id: selectedConnection.id,
        payload: {
          isSyncEnabled: selectedConnection.isSyncEnabled,
          lockSyncedCollaborators: selectedConnection.lockSyncedCollaborators,
        },
      });
      toast.success('Politique de synchronisation enregistrée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur mise à jour politique.');
    }
  };

  const handleTestConnection = async () => {
    if (!connectionId) return;
    try {
      const result = await testConnectionMutation.mutateAsync(connectionId);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur test connexion.');
    }
  };

  const handleAddGroup = async () => {
    if (!connectionId || !selectedProviderGroupId) return;
    const source = providerGroupsQuery.data?.find((g) => g.id === selectedProviderGroupId);
    try {
      await addGroupScopeMutation.mutateAsync({
        connectionId,
        groupId: selectedProviderGroupId,
        groupName: source?.name ?? selectedProviderGroupId,
      });
      setSelectedProviderGroupId('');
      toast.success('Groupe cible ajouté.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur ajout groupe cible.');
    }
  };

  const handlePreview = async () => {
    if (!connectionId) return;
    try {
      await previewSyncMutation.mutateAsync(connectionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Prévisualisation impossible.');
    }
  };

  const handleExecute = async () => {
    if (!connectionId) return;
    try {
      const result = await executeSyncMutation.mutateAsync(connectionId);
      setLastExecution(result);
      toast.success('Synchronisation exécutée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Synchronisation impossible.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration synchronisation annuaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!microsoftConnectionQuery.data?.connection && (
            <Alert>
              <AlertTitle>Connexion Microsoft 365 requise</AlertTitle>
              <AlertDescription>
                La synchronisation annuaire utilise la connexion Microsoft existante.
                Connecte d’abord le client dans{' '}
                <Link className="underline" href="/client/administration/microsoft-365">
                  Microsoft 365
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}

          {microsoftConnectionQuery.data?.connection &&
            connectionsQuery.data &&
            connectionsQuery.data.length === 0 && (
              <div className="rounded-md border border-border p-3 text-sm">
                <p className="text-muted-foreground">
                  Connexion Microsoft détectée (tenant{' '}
                  <span className="font-mono text-xs">
                    {microsoftConnectionQuery.data.connection.tenantId}
                  </span>
                  ). Initialise maintenant la configuration de synchronisation annuaire.
                </p>
                <Button
                  type="button"
                  className="mt-3"
                  onClick={handleInitializeDirectoryConnection}
                  disabled={createConnectionMutation.isPending}
                >
                  Initialiser la synchronisation annuaire
                </Button>
              </div>
            )}

          {connectionsQuery.data && connectionsQuery.data.length > 0 && (
            <div className="space-y-2">
              <Label>Connexion annuaire active</Label>
              <div className="rounded-md border border-border p-2 text-sm">
                {selectedConnection?.name ?? 'Annuaire principal'} (
                {selectedConnection?.providerType ?? 'MICROSOFT_GRAPH'})
              </div>
            </div>
          )}

          {selectedConnection && (
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-enabled">Synchronisation annuaire activée</Label>
                <input
                  id="sync-enabled"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedConnection.isSyncEnabled}
                  onChange={(event) =>
                    updateConnectionMutation.mutate({
                      id: selectedConnection.id,
                      payload: { isSyncEnabled: event.currentTarget.checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lock-enabled">Verrouiller les collaborators synchronisés</Label>
                <input
                  id="lock-enabled"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedConnection.lockSyncedCollaborators}
                  onChange={(event) =>
                    updateConnectionMutation.mutate({
                      id: selectedConnection.id,
                      payload: {
                        lockSyncedCollaborators: event.currentTarget.checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleTestConnection}>
                  Tester la connexion
                </Button>
                <Button type="button" onClick={handleSavePolicy}>
                  Enregistrer la politique
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Groupes cibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <select
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
              value={selectedProviderGroupId}
              onChange={(e) => setSelectedProviderGroupId(e.target.value)}
            >
              <option value="">Sélectionner un groupe</option>
              {providerGroupsQuery.data?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <Button onClick={handleAddGroup} type="button" disabled={!selectedProviderGroupId}>
              Ajouter
            </Button>
          </div>

          <div className="space-y-2">
            {groupScopesQuery.data?.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
              >
                <span>{g.groupName || g.groupId}</span>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() =>
                    deleteGroupScopeMutation.mutate({
                      connectionId: g.connectionId,
                      groupScopeId: g.id,
                    })
                  }
                >
                  Retirer
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prévisualisation et exécution</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamSyncRunPanel
            selectedConnectionId={connectionId}
            preview={previewSyncMutation.data ?? null}
            execution={lastExecution}
            loadingPreview={previewSyncMutation.isPending}
            loadingExecute={executeSyncMutation.isPending}
            onPreview={handlePreview}
            onExecute={handleExecute}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamSyncHistory jobs={jobsQuery.data} />
        </CardContent>
      </Card>
    </div>
  );
}
