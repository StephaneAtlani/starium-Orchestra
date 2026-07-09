'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDirectoryConnectionsQuery } from '@/features/team-sync/hooks/use-team-sync-queries';
import { useTeamSyncMutations } from '@/features/team-sync/hooks/use-team-sync-mutations';
import type { DirectorySyncExecution } from '@/features/team-sync/types/team-sync.types';
import { TeamSyncRunPanel } from '@/features/team-sync/components/team-sync-run-panel';
import { useActiveClient } from '@/hooks/use-active-client';
import { clientRbacKeys } from '../query-keys';

export function MembersSyncDialog() {
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const activeClientId = activeClient?.id ?? '';
  const [open, setOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [lastExecution, setLastExecution] = useState<DirectorySyncExecution | null>(null);
  const connectionsQuery = useDirectoryConnectionsQuery();
  const { previewSyncMutation, executeSyncMutation } = useTeamSyncMutations();

  const connections = useMemo(
    () => connectionsQuery.data ?? [],
    [connectionsQuery.data],
  );
  const resolvedConnectionId = useMemo(() => {
    if (selectedConnectionId && connections.some((c) => c.id === selectedConnectionId)) {
      return selectedConnectionId;
    }
    return connections[0]?.id ?? null;
  }, [connections, selectedConnectionId]);
  const selectedConnection = useMemo(
    () => connections.find((c) => c.id === resolvedConnectionId) ?? null,
    [connections, resolvedConnectionId],
  );

  const getConnectionLabel = (connection: { id: string; name: string }) => {
    const raw = connection.name?.trim();
    return raw && raw.length > 0 ? raw : `Connexion ${connection.id.slice(0, 8)}`;
  };

  const handlePreview = async () => {
    if (!resolvedConnectionId) return;
    try {
      await previewSyncMutation.mutateAsync(resolvedConnectionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Previsualisation impossible.');
    }
  };

  const handleExecute = async () => {
    if (!resolvedConnectionId) return;
    try {
      const result = await executeSyncMutation.mutateAsync(resolvedConnectionId);
      setLastExecution(result);
      await queryClient.invalidateQueries({
        queryKey: clientRbacKeys.members(activeClientId),
      });
      toast.success('Synchronisation executee.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Synchronisation impossible.');
    }
  };

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Synchronisation
      </Button>
      <StariumModal
        open={open}
        onOpenChange={setOpen}
        title="Synchronisation ADDS"
        description="Lance une previsualisation puis une synchronisation depuis l'annuaire."
        icon={RefreshCw}
        size="xl"
        bodyClassName="max-h-[60vh] overflow-y-auto"
        footer={
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => setOpen(false)}
          >
            Fermer
          </Button>
        }
      >
        {connectionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des connexions annuaire...</p>
        ) : connections.length === 0 ? (
          <Alert className="border-border bg-muted/20">
            <AlertTitle>Aucune connexion annuaire</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Aucune connexion annuaire configuree pour ce client.</p>
              <Link
                href="/client/administration/team-sync"
                className="inline-flex text-sm font-medium underline"
                onClick={() => setOpen(false)}
              >
                Ouvrir la configuration annuaire
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <Card size="sm" className="overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-sm font-medium">Actions de synchronisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="mb-2 text-sm font-medium">Connexion annuaire</p>
                <Select
                  value={resolvedConnectionId ?? ''}
                  onValueChange={(value) => setSelectedConnectionId(value)}
                >
                  <SelectTrigger className="w-full border-input">
                    <SelectValue placeholder="Selectionner une connexion">
                      {selectedConnection ? getConnectionLabel(selectedConnection) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((connection) => (
                      <SelectItem key={connection.id} value={connection.id}>
                        {getConnectionLabel(connection)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TeamSyncRunPanel
                selectedConnectionId={resolvedConnectionId}
                preview={previewSyncMutation.data ?? null}
                execution={lastExecution}
                loadingPreview={previewSyncMutation.isPending}
                loadingExecute={executeSyncMutation.isPending}
                onPreview={handlePreview}
                onExecute={handleExecute}
              />
            </CardContent>
          </Card>
        )}
      </StariumModal>
    </>
  );
}
