'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, LayoutGrid, Network } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { WorkTeamFormDialog } from '@/features/teams/work-teams/components/work-team-form-dialog';
import { WorkTeamsTable } from '@/features/teams/work-teams/components/work-teams-table';
import { WorkTeamsTreePanel } from '@/features/teams/work-teams/components/work-teams-tree';
import { useWorkTeamsList } from '@/features/teams/work-teams/hooks/use-work-teams-list';

export default function WorkTeamsListPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canRead = has('teams.read');
  const canUpdate = has('teams.update');
  const enabled = permsSuccess && canRead;

  const [view, setView] = useState<'table' | 'tree'>('table');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const limit = 20;

  const listParams = useMemo(
    () => ({
      limit,
      offset,
      q: search.trim() || undefined,
      includeArchived,
    }),
    [limit, offset, search, includeArchived],
  );

  const listQuery = useWorkTeamsList(listParams, { enabled });

  const data = listQuery.data;
  const total = data?.total ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <PageHeader
        title="Équipes organisationnelles"
        description="Référentiel des équipes et de la hiérarchie pour le client actif."
        actions={
          canUpdate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Nouvelle équipe
            </Button>
          ) : null
        }
      />

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
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Permission requise : <code>teams.read</code>.
          </AlertDescription>
        </Alert>
      )}

      {enabled && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border p-0.5">
              <Button
                type="button"
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('table')}
              >
                <LayoutGrid className="mr-1 size-4" />
                Table
              </Button>
              <Button
                type="button"
                variant={view === 'tree' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('tree')}
              >
                <Network className="mr-1 size-4" />
                Arborescence
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => {
                  setIncludeArchived(e.target.checked);
                  setOffset(0);
                }}
              />
              Inclure les équipes archivées
            </label>
          </div>

          {view === 'table' && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="wt-search">
                Recherche (nom ou code)
              </label>
              <input
                id="wt-search"
                className="flex h-9 max-w-md rounded-lg border border-input bg-transparent px-3 text-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder="Filtrer…"
              />
            </div>
          )}

          {view === 'table' && listQuery.isLoading && !data && <LoadingState rows={5} />}
          {view === 'table' && listQuery.error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{(listQuery.error as Error).message}</AlertTitle>
            </Alert>
          )}

          {view === 'table' && !listQuery.error && data && data.items.length === 0 && (
            <EmptyState
              title="Aucune équipe"
              description={
                includeArchived
                  ? 'Aucune équipe ne correspond à la recherche.'
                  : 'Créez une équipe ou incluez les archives.'
              }
            />
          )}

          {view === 'table' && !listQuery.error && data && data.items.length > 0 && (
            <Card size="sm" className="overflow-hidden">
              <CardContent className="p-0 overflow-auto">
                <WorkTeamsTable items={data.items} />
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {offset + 1}–{Math.min(offset + limit, total)} sur {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setOffset(offset + limit)}
                  >
                    Suivant
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}

          {view === 'tree' && <WorkTeamsTreePanel includeArchived={includeArchived} />}
        </div>
      )}

      <WorkTeamFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />
    </>
  );
}
