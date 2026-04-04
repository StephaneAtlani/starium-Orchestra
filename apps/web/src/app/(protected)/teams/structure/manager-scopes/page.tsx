'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { humanResourceCatalogLabel } from '@/features/teams/collaborators/lib/collaborator-label-mappers';
import { listResources } from '@/services/resources';
import { usePutManagerScope } from '@/features/teams/work-teams/hooks/use-work-team-mutations';
import { useManagerScope } from '@/features/teams/work-teams/hooks/use-manager-scope';
import { useManagerScopePreview } from '@/features/teams/work-teams/hooks/use-manager-scope-preview';
import { useWorkTeamsList } from '@/features/teams/work-teams/hooks/use-work-teams-list';
import { managerScopeModeLabel } from '@/features/teams/work-teams/lib/work-team-label-mappers';
import type { ManagerScopeMode } from '@/features/teams/work-teams/types/work-team.types';

const MODES: ManagerScopeMode[] = ['DIRECT_REPORTS_ONLY', 'TEAM_SUBTREE', 'HYBRID'];

export default function ManagerScopesPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('teams.read');
  const canManageScopes = has('teams.manage_scopes');

  const [managerSearch, setManagerSearch] = useState('');
  const [managerResourceId, setManagerResourceId] = useState('');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const managersQuery = useQuery({
    queryKey: ['resources', 'human-managers-scope', activeClient?.id, managerSearch],
    queryFn: () =>
      listResources(authFetch, {
        type: 'HUMAN',
        search: managerSearch.trim() || undefined,
        limit: 80,
        offset: 0,
      }),
    enabled: permsSuccess && canRead && !!activeClient?.id,
  });

  const teamsForRoots = useWorkTeamsList(
    { limit: 500, offset: 0, includeArchived: false },
    { enabled: permsSuccess && canRead },
  );

  const scopeQuery = useManagerScope(managerResourceId);
  const putMutation = usePutManagerScope(managerResourceId);

  const [mode, setMode] = useState<ManagerScopeMode>('DIRECT_REPORTS_ONLY');
  const [includeDirectReports, setIncludeDirectReports] = useState(true);
  const [includeTeamSubtree, setIncludeTeamSubtree] = useState(false);
  const [rootTeamIds, setRootTeamIds] = useState<string[]>([]);

  const [previewOffset, setPreviewOffset] = useState(0);
  const [previewQ, setPreviewQ] = useState('');
  const previewLimit = 20;

  const previewParams = useMemo(
    () => ({
      limit: previewLimit,
      offset: previewOffset,
      q: previewQ.trim() || undefined,
    }),
    [previewOffset, previewQ],
  );

  const previewQuery = useManagerScopePreview(managerResourceId, previewParams);

  useEffect(() => {
    const d = scopeQuery.data;
    if (!d || !managerResourceId) return;
    setMode(d.mode);
    setIncludeDirectReports(d.includeDirectReports);
    setIncludeTeamSubtree(d.includeTeamSubtree);
    setRootTeamIds(d.rootTeams.map((r) => r.workTeamId));
  }, [scopeQuery.data, managerResourceId]);

  function toggleRootTeam(id: string) {
    setRootTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!managerResourceId || !canManageScopes) return;
    try {
      await putMutation.mutateAsync({
        mode,
        includeDirectReports,
        includeTeamSubtree,
        rootTeamIds,
      });
      toast.success('Périmètre enregistré');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const teamOptions = teamsForRoots.data?.items ?? [];
  const previewTotal = previewQuery.data?.total ?? 0;
  const previewItems = previewQuery.data?.items ?? [];
  const previewPage = Math.floor(previewOffset / previewLimit) + 1;
  const previewTotalPages = Math.max(1, Math.ceil(previewTotal / previewLimit));

  return (
    <>
      <PageHeader
        title="Périmètres managers"
        description="Définition du périmètre de pilotage (directs, équipes, prévisualisation) pour un manager."
      />

      {permsLoading && <LoadingState rows={2} />}
      {permsSuccess && !canRead && (
        <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Permission requise : <code>teams.read</code>.
          </AlertDescription>
        </Alert>
      )}

      {permsSuccess && canRead && (
        <div className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">Manager</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ms-search">Recherche ressource Humaine</Label>
                <Input
                  id="ms-search"
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  placeholder="Nom ou email…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ms-manager">Manager (Resource HUMAN)</Label>
                <select
                  id="ms-manager"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={managerResourceId}
                  onChange={(e) => {
                    setManagerResourceId(e.target.value);
                    setPreviewOffset(0);
                  }}
                >
                  <option value="">— Choisir une ressource —</option>
                  {(managersQuery.data?.items ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {humanResourceCatalogLabel(r)}
                      {r.email ? ` — ${r.email}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {!managerResourceId && (
            <p className="text-sm text-muted-foreground">
              Sélectionnez une ressource Humaine (manager) pour charger ou configurer son périmètre.
            </p>
          )}

          {managerResourceId && scopeQuery.isLoading && <LoadingState rows={3} />}
          {managerResourceId && scopeQuery.error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{(scopeQuery.error as Error).message}</AlertTitle>
            </Alert>
          )}

          {managerResourceId && scopeQuery.data && (
            <form onSubmit={onSave}>
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-base">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ms-mode">Mode</Label>
                    <select
                      id="ms-mode"
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as ManagerScopeMode)}
                      disabled={!canManageScopes}
                    >
                      {MODES.map((m) => (
                        <option key={m} value={m}>
                          {managerScopeModeLabel(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeDirectReports}
                      onChange={(e) => setIncludeDirectReports(e.target.checked)}
                      disabled={!canManageScopes}
                    />
                    Inclure les collaborateurs en hiérarchie directe (N+1)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeTeamSubtree}
                      onChange={(e) => setIncludeTeamSubtree(e.target.checked)}
                      disabled={!canManageScopes}
                    />
                    Inclure les membres des équipes (sous-arborescence depuis racines)
                  </label>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Racines d’équipes</p>
                    <p className="text-xs text-muted-foreground">
                      Cochez les équipes racines dont la descendance compte pour le périmètre étendu.
                    </p>
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border/60 p-3">
                      {teamOptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune équipe active.</p>
                      ) : (
                        teamOptions.map((t) => (
                          <label key={t.id} className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={rootTeamIds.includes(t.id)}
                              onChange={() => toggleRootTeam(t.id)}
                              disabled={!canManageScopes}
                            />
                            <span>
                              <span className="font-medium">{t.name}</span>
                              <span className="block text-xs text-muted-foreground">{t.pathLabel}</span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
                {canManageScopes && (
                  <CardFooter className="justify-end">
                    <Button type="submit" disabled={putMutation.isPending}>
                      Enregistrer
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </form>
          )}

          {managerResourceId && canRead && (
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-base">Aperçu du périmètre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="pv-q">Filtrer</Label>
                    <Input
                      id="pv-q"
                      value={previewQ}
                      onChange={(e) => {
                        setPreviewQ(e.target.value);
                        setPreviewOffset(0);
                      }}
                      placeholder="Nom ou email…"
                    />
                  </div>
                </div>
                {previewQuery.isLoading && !previewQuery.data && (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                )}
                {previewQuery.error && (
                  <Alert variant="destructive">
                    <AlertTitle>{(previewQuery.error as Error).message}</AlertTitle>
                  </Alert>
                )}
                {previewQuery.data && previewItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune ressource dans l’aperçu.</p>
                )}
                {previewQuery.data && previewItems.length > 0 && (
                  <div className="overflow-auto rounded-md border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewItems.map((row) => (
                          <TableRow key={row.resourceId}>
                            <TableCell className="font-medium">{row.displayName}</TableCell>
                            <TableCell className="text-muted-foreground">{row.email ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              {previewQuery.data && previewTotal > previewLimit && (
                <CardFooter className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {previewOffset + 1}–{Math.min(previewOffset + previewLimit, previewTotal)} sur{' '}
                    {previewTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={previewPage <= 1}
                      onClick={() => setPreviewOffset(Math.max(0, previewOffset - previewLimit))}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={previewPage >= previewTotalPages}
                      onClick={() => setPreviewOffset(previewOffset + previewLimit)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      )}
    </>
  );
}
