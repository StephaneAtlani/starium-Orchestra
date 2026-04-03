'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { NewResourceForm } from '@/app/(protected)/resources/_components/new-resource-form';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/PermissionGate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useCollaboratorManagerOptions } from '@/features/teams/collaborators/hooks/use-collaborator-manager-options';
import { useCollaboratorsList } from '@/features/teams/collaborators/hooks/use-collaborators-list';
import { CollaboratorFiltersBar } from '@/features/teams/collaborators/components/collaborator-filters-bar';
import { CollaboratorsListTable } from '@/features/teams/collaborators/components/collaborators-list-table';
import type {
  CollaboratorSource,
  CollaboratorStatus,
  CollaboratorsListParams,
} from '@/features/teams/collaborators/types/collaborator.types';

function parseCsv(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parseFilters(searchParams: URLSearchParams): CollaboratorsListParams {
  return {
    search: searchParams.get('search') ?? undefined,
    status: parseCsv(searchParams.get('status')) as CollaboratorStatus[] | undefined,
    source: parseCsv(searchParams.get('source')) as CollaboratorSource[] | undefined,
    tag: parseCsv(searchParams.get('tag')),
    managerId: searchParams.get('managerId') ?? undefined,
    offset: Number(searchParams.get('offset') ?? 0),
    limit: Number(searchParams.get('limit') ?? 20),
  };
}

function toSearchParams(filters: CollaboratorsListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.source?.length) params.set('source', filters.source.join(','));
  if (filters.tag?.length) params.set('tag', filters.tag.join(','));
  if (filters.managerId) params.set('managerId', filters.managerId);
  if (filters.offset) params.set('offset', String(filters.offset));
  if (filters.limit && filters.limit !== 20) params.set('limit', String(filters.limit));
  return params;
}

export default function CollaboratorsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialFilters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [filters, setFilters] = useState<CollaboratorsListParams>(initialFilters);
  const [newPersonModalOpen, setNewPersonModalOpen] = useState(false);
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } = usePermissions();

  const canRead = has('collaborators.read');
  const enabled = permsSuccess && canRead;
  const listQuery = useCollaboratorsList(filters);
  const managersQuery = useCollaboratorManagerOptions('');

  useEffect(() => {
    const next = toSearchParams(filters).toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname);
    }
  }, [filters, pathname, router, searchParams]);

  const data = listQuery.data;
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const total = data?.total ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Collaborateurs"
          description="Référentiel collaborateurs du client actif."
          actions={
            enabled ? (
              <div className="flex flex-wrap gap-2">
                <PermissionGate permission="resources.create">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setNewPersonModalOpen(true)}
                  >
                    <Plus className="size-4" />
                    Nouvelle humaine
                  </Button>
                </PermissionGate>
              </div>
            ) : null
          }
        />

        <Dialog open={newPersonModalOpen} onOpenChange={setNewPersonModalOpen}>
          <DialogContent
            className="flex max-h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-4 overflow-y-auto p-6 sm:max-w-lg"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle>Nouvelle humaine</DialogTitle>
              <DialogDescription>
                Création d’une ressource de type Humaine (catalogue projet). Vous pouvez en parallèle
                rattacher un collaborateur Équipes (manager, équipe) si vos droits le permettent.
              </DialogDescription>
            </DialogHeader>
            {newPersonModalOpen ? (
              <NewResourceForm
                formIdPrefix="collaborators-new-person"
                forceType="HUMAN"
                className="w-full max-w-full space-y-4"
                onSuccess={() => {
                  void listQuery.refetch();
                  setNewPersonModalOpen(false);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        {permsLoading && <LoadingState rows={2} />}
        {permsError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permissions indisponibles</AlertTitle>
            <AlertDescription>Impossible de charger vos permissions.</AlertDescription>
          </Alert>
        )}

        {permsSuccess && !canRead && (
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Accès au module Equipes</AlertTitle>
            <AlertDescription>
              Votre rôle n&apos;inclut pas la permission <code>collaborators.read</code>.
            </AlertDescription>
          </Alert>
        )}

        {enabled && (
          <>
            <CollaboratorFiltersBar
              filters={filters}
              setFilters={setFilters}
              managerOptions={managersQuery.data?.items ?? []}
            />

            {listQuery.isLoading && !data && <LoadingState rows={5} />}
            {listQuery.error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>{(listQuery.error as Error).message}</AlertTitle>
                <AlertDescription>
                  <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
                    Réessayer
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!listQuery.error && data && data.items.length === 0 && (
              <EmptyState
                title="Aucun collaborateur"
                description="Aucun collaborateur ne correspond aux filtres."
              />
            )}

            {!listQuery.error && data && data.items.length > 0 && (
              <Card size="sm" className="overflow-hidden">
                <CardContent className="p-0 overflow-auto">
                  <CollaboratorsListTable items={data.items} />
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {offset + 1}–{Math.min(offset + limit, total)} sur {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setFilters({ ...filters, offset: Math.max(0, offset - limit) })}
                    >
                      <ChevronLeft className="size-4" />
                      Précédent
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() => setFilters({ ...filters, offset: offset + limit })}
                    >
                      Suivant
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}

