'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { createResourceRole, listResourceRoles } from '@/services/resources';
import { AlertCircle } from 'lucide-react';

export type ResourceRolesPanelProps = {
  /** Si false, pas de requête (ex. modale fermée). */
  queryEnabled?: boolean;
};

export function ResourceRolesPanel({ queryEnabled = true }: ResourceRolesPanelProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('resources.read');
  const enabled = queryEnabled && !!clientId && permsSuccess && canRead;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['resource-roles', clientId],
    queryFn: () => listResourceRoles(authFetch, { limit: 100, offset: 0 }),
    enabled,
  });

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createResourceRole(authFetch, { name: name.trim() });
      setName('');
      await refetch();
    } finally {
      setCreating(false);
    }
  }

  const items = data?.items ?? [];

  return (
    <>
      {enabled && isLoading && <LoadingState rows={4} />}
      {enabled && error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <PermissionGate permission="resources.create">
        <form onSubmit={onCreate} className="mb-6 flex max-w-lg flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="newName">Nouveau rôle</Label>
            <Input
              id="newName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Intitulé"
            />
          </div>
          <Button type="submit" disabled={creating || !name.trim()}>
            {creating ? 'Création…' : 'Ajouter'}
          </Button>
        </form>
      </PermissionGate>

      {enabled && !isLoading && !error && items.length === 0 && (
        <EmptyState title="Aucun rôle métier" description="Ajoutez un intitulé ci-dessus." />
      )}
      {enabled && !isLoading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="p-3 font-medium">Nom</th>
                <th className="p-3 font-medium">Code</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-white/5">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.code ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
