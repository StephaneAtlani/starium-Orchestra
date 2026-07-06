'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionGate } from '@/components/PermissionGate';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { createResourceRole, listResourceRoles } from '@/services/resources';
import { AlertCircle } from 'lucide-react';

type ResourceRoleRow = { id: string; name: string; code: string | null };

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

  const columns = useMemo<DataTableColumn<ResourceRoleRow>[]>(
    () => [
      { key: 'name', header: 'Nom', mobilePriority: 'primary' },
      {
        key: 'code',
        header: 'Code',
        mobilePriority: 'secondary',
        cell: (row) => row.code ?? '—',
      },
    ],
    [],
  );

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

  const items: ResourceRoleRow[] = data?.items ?? [];

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
        <form onSubmit={onCreate} className="mb-6 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 space-y-2 sm:min-w-[12rem]">
            <Label htmlFor="newName">Nouveau rôle</Label>
            <Input
              id="newName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Intitulé"
            />
          </div>
          <Button type="submit" disabled={creating || !name.trim()} className="min-h-11">
            {creating ? 'Création…' : 'Ajouter'}
          </Button>
        </form>
      </PermissionGate>

      {enabled && !isLoading && !error && items.length === 0 && (
        <EmptyState title="Aucun rôle métier" description="Ajoutez un intitulé ci-dessus." />
      )}
      {enabled && !isLoading && !error && items.length > 0 && (
        <DataTable
          columns={columns}
          data={items}
          getRowId={(row) => row.id}
          mobileCardsAriaLabel="Rôles métier des ressources"
        />
      )}
    </>
  );
}
