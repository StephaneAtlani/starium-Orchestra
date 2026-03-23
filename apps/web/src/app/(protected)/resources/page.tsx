'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/PermissionGate';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  RESOURCE_AFFILIATION_LABEL,
  RESOURCE_TYPE_LABEL,
  formatResourceDisplayName,
} from '@/lib/resource-labels';
import { deactivateResource, listResources } from '@/services/resources';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResourceRolesPanel } from './_components/resource-roles-panel';
import { AlertCircle, Plus } from 'lucide-react';

export default function ResourcesListPage() {
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canRead = has('resources.read');
  const enabled = !!clientId && permsSuccess && canRead;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['resources', 'list', clientId],
    queryFn: () => listResources(authFetch, { limit: 100, offset: 0 }),
    enabled,
  });

  const items = data?.items ?? [];
  const errMsg = error ? (error as Error).message : null;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Ressources"
          description="Catalogue ressources humaines et matériel (client actif)."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRolesModalOpen(true)}
              >
                Rôles métier
              </Button>
              <PermissionGate permission="resources.create">
                <Link
                  href="/resources/new"
                  className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
                >
                  <Plus className="size-4" />
                  Nouvelle ressource
                </Link>
              </PermissionGate>
            </div>
          }
        />

        <Dialog open={rolesModalOpen} onOpenChange={setRolesModalOpen}>
          <DialogContent
            className="flex max-h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-4 overflow-y-auto p-6 sm:max-w-[90vw]"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle>Rôles métier</DialogTitle>
              <DialogDescription>
                Catalogue ResourceRole pour ressources humaines.
              </DialogDescription>
            </DialogHeader>
            <ResourceRolesPanel queryEnabled={rolesModalOpen} />
          </DialogContent>
        </Dialog>

        {clientId && permsLoading && <LoadingState rows={3} />}
        {permsError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permissions</AlertTitle>
            <AlertDescription>Impossible de charger les droits.</AlertDescription>
          </Alert>
        )}
        {enabled && isLoading && <LoadingState rows={5} />}
        {enabled && errMsg && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{errMsg}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Réessayer
            </Button>
          </Alert>
        )}
        {enabled && !isLoading && !error && items.length === 0 && (
          <EmptyState
            title="Aucune ressource disponible"
            description="Créez une première ressource ou complétez le catalogue depuis ce module."
          />
        )}
        {enabled && !isLoading && !error && items.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Portée</th>
                  <th className="p-3 font-medium">Société</th>
                  <th className="p-3 font-medium">Rôle métier</th>
                  <th className="p-3 font-medium">Actif</th>
                  <th className="p-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <Link href={`/resources/${r.id}`} className="text-primary hover:underline">
                        {formatResourceDisplayName(r)}
                      </Link>
                    </td>
                    <td className="p-3">{RESOURCE_TYPE_LABEL[r.type]}</td>
                    <td className="p-3">
                      {r.type === 'HUMAN' && r.affiliation
                        ? RESOURCE_AFFILIATION_LABEL[r.affiliation]
                        : '—'}
                    </td>
                    <td className="p-3">
                      {r.type === 'HUMAN' && r.affiliation === 'EXTERNAL' && r.companyName
                        ? r.companyName
                        : '—'}
                    </td>
                    <td className="p-3">{r.role?.name ?? '—'}</td>
                    <td className="p-3">{r.isActive ? 'oui' : 'non'}</td>
                    <td className="p-3 text-right">
                      <PermissionGate permission="resources.update">
                        {!r.isActive ? null : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await deactivateResource(authFetch, r.id);
                                await refetch();
                              } catch {
                                /* toast optionnel */
                              }
                            }}
                          >
                            Désactiver
                          </Button>
                        )}
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
