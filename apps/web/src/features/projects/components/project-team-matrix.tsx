'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, Plus, Trash2, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatResourceDisplayName } from '@/lib/resource-labels';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import type { ResourceListItem } from '@/services/resources';
import { PersonCatalogPickerDialog } from './person-catalog-picker-dialog';
import {
  addProjectTeamMember,
  createProjectTeamRole,
  deleteProjectTeamRole,
  removeProjectTeamMember,
  type AddProjectTeamMemberPayload,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectTeamQuery, useProjectTeamRolesQuery } from '../hooks/use-project-team-queries';
import type {
  ProjectTeamMemberApi,
  ProjectTeamRoleApi,
} from '../types/project.types';

function membersByRole(
  members: ProjectTeamMemberApi[],
): Map<string, ProjectTeamMemberApi[]> {
  const m = new Map<string, ProjectTeamMemberApi[]>();
  for (const row of members) {
    const cur = m.get(row.roleId) ?? [];
    cur.push(row);
    m.set(row.roleId, cur);
  }
  return m;
}

export function ProjectTeamMatrix({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has('projects.update');

  const rolesQuery = useProjectTeamRolesQuery();
  const teamQuery = useProjectTeamQuery(projectId);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [addMemberDialogRoleId, setAddMemberDialogRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [teamOwnerResourceId, setTeamOwnerResourceId] = useState('');
  const [teamOwnerResourceDetails, setTeamOwnerResourceDetails] =
    useState<ResourceListItem | null>(null);

  const roles = rolesQuery.data ?? [];
  const members = teamQuery.data ?? [];

  const byRole = useMemo(() => membersByRole(members), [members]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.team(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.detail(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.sheet(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.teamRoles(clientId),
    });
    void queryClient.invalidateQueries({
      queryKey: [...projectQueryKeys.all, 'list', clientId],
    });
  };

  const createRoleMutation = useMutation({
    mutationFn: () =>
      createProjectTeamRole(authFetch, { name: newRoleName.trim(), sortOrder: roles.length }),
    onSuccess: () => {
      toast.success('Rôle créé');
      setRoleDialogOpen(false);
      setNewRoleName('');
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.teamRoles(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => deleteProjectTeamRole(authFetch, roleId),
    onSuccess: () => {
      toast.success('Rôle supprimé');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const addMemberMutation = useMutation({
    mutationFn: async (payload: AddProjectTeamMemberPayload) => {
      return addProjectTeamMember(authFetch, projectId, payload);
    },
    onSuccess: () => {
      toast.success('Membre ajouté');
      setAddMemberDialogRoleId(null);
      setTeamOwnerResourceId('');
      setTeamOwnerResourceDetails(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      removeProjectTeamMember(authFetch, projectId, memberId),
    onSuccess: () => {
      toast.success('Membre retiré');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [roles],
  );

  const addMemberDialogRole = useMemo(
    () => sortedRoles.find((r) => r.id === addMemberDialogRoleId) ?? null,
    [sortedRoles, addMemberDialogRoleId],
  );

  const membersInAddRole = useMemo(() => {
    if (!addMemberDialogRoleId) return [];
    return members.filter((m) => m.roleId === addMemberDialogRoleId);
  }, [members, addMemberDialogRoleId]);

  const takenEmailsInRole = useMemo(() => {
    return new Set(
      membersInAddRole
        .map((m) => m.email?.trim().toLowerCase())
        .filter(Boolean) as string[],
    );
  }, [membersInAddRole]);

  const filterTeamCatalogResources = useCallback(
    (items: ResourceListItem[]) =>
      items.filter(
        (r) =>
          !r.email?.trim() ||
          !takenEmailsInRole.has(r.email.trim().toLowerCase()),
      ),
    [takenEmailsInRole],
  );

  const commitTeamMember = useCallback(
    (resource: ResourceListItem) => {
      if (!addMemberDialogRole) return;
      const roleId = addMemberDialogRole.id;
      const freeLabel = formatResourceDisplayName(resource);
      const maxLen = 200;
      const label =
        freeLabel.length > maxLen ? `${freeLabel.slice(0, maxLen - 1)}…` : freeLabel;
      addMemberMutation.mutate({
        roleId,
        freeLabel: label,
        affiliation: resource.affiliation === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
      });
    },
    [addMemberDialogRole, addMemberMutation],
  );

  return (
    <>
      <Card
        size="sm"
        className="overflow-hidden border-l-[3px] border-l-violet-500/70 shadow-sm"
      >
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-violet-500/10 text-violet-800 shadow-inner dark:text-violet-300"
              aria-hidden
            >
              <Users className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle
                id="project-team-matrix-title"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                Composition de l&apos;équipe
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                Chaque ligne est un <strong>rôle équipe</strong> du client. Les deux rôles{' '}
                <strong>système</strong> (créés à la création du client) sont{' '}
                <strong>Sponsor</strong> et <strong>Responsable de projet</strong> : repérez-les au
                badge dédié — ils restent alignés sur les champs sponsor / responsable du
                portefeuille. Les autres lignes sont des rôles métier ou personnalisés.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 pt-4">
          {rolesQuery.isLoading || teamQuery.isLoading ? (
            <LoadingState rows={5} />
          ) : rolesQuery.error || teamQuery.error ? (
            <Alert variant="destructive" className="border-destructive/40">
              <AlertCircle aria-hidden />
              <AlertTitle>Équipe indisponible</AlertTitle>
              <AlertDescription>
                Impossible de charger les rôles ou les membres. Réessayez plus tard.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
              {/* En-tête (desktop) */}
              <div
                className={cn(
                  'hidden gap-4 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid lg:items-center',
                  canEdit
                    ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_auto_auto]'
                    : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]',
                )}
                aria-hidden
              >
                <span>Rôle</span>
                <span>Personnes</span>
                {canEdit ? (
                  <>
                    <span className="text-center">Affecter</span>
                    <span className="w-9 text-center" />
                  </>
                ) : null}
              </div>

              <ul className="divide-y divide-border/60" aria-labelledby="project-team-matrix-title">
                {sortedRoles.map((role: ProjectTeamRoleApi, idx: number) => {
                  const rowMembers = byRole.get(role.id) ?? [];
                  const busy =
                    addMemberMutation.isPending || removeMemberMutation.isPending;
                  const deleteRoleConfirmMessage =
                    role.systemKind != null
                      ? 'Supprimer ce rôle système ? Aucun membre ne doit y être affecté. Les champs sponsor / responsable projet (portefeuille) seront recalculés.'
                      : 'Supprimer ce rôle ? (aucun membre ne doit y être affecté)';

                  return (
                    <li
                      key={role.id}
                      className={cn(
                        'min-w-0 px-3 py-3.5 sm:px-4 sm:py-4 lg:grid lg:gap-4 lg:items-start',
                        canEdit
                          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_auto_auto]'
                          : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]',
                        idx % 2 === 1 && 'bg-muted/25',
                      )}
                    >
                      {/* Mobile : rôle + suppression sur une ligne ; desktop : col. 1 */}
                      <div className="mb-3 flex min-w-0 items-start justify-between gap-2 border-b border-border/60 pb-3 lg:mb-0 lg:block lg:border-0 lg:pb-0">
                        <div className="min-w-0 flex flex-col gap-1">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
                            Rôle
                          </span>
                          <span className="font-medium leading-snug text-foreground">
                            {role.name}
                          </span>
                        </div>
                        {canEdit ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-9 shrink-0 text-muted-foreground hover:text-destructive lg:hidden"
                            disabled={deleteRoleMutation.isPending}
                            title="Supprimer ce rôle (aucun membre affecté)"
                            aria-label={`Supprimer le rôle ${role.name}`}
                            onClick={() => {
                              if (!confirm(deleteRoleConfirmMessage)) return;
                              deleteRoleMutation.mutate(role.id);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>

                      <div className="mb-3 lg:mb-0">
                        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
                          Personnes
                        </span>
                        <ul className="flex flex-wrap gap-1.5">
                          {rowMembers.map((m) => (
                            <li
                              key={m.id}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-xs"
                            >
                              <span className="min-w-0 truncate" title={m.displayName}>
                                {m.displayName}
                              </span>
                              {m.memberKind === 'NAMED' && m.affiliation ? (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 px-1.5 py-0 text-[10px] font-normal"
                                >
                                  {m.affiliation === 'INTERNAL' ? 'Interne' : 'Externe'}
                                </Badge>
                              ) : null}
                              {canEdit ? (
                                <button
                                  type="button"
                                  className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  disabled={busy || removeMemberMutation.isPending}
                                  aria-label={`Retirer ${m.displayName}`}
                                  onClick={() => removeMemberMutation.mutate(m.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              ) : null}
                            </li>
                          ))}
                          {rowMembers.length === 0 ? (
                            <li className="list-none text-xs italic text-muted-foreground">
                              Aucune personne
                            </li>
                          ) : null}
                        </ul>
                      </div>

                      {canEdit ? (
                        <>
                          <div className="min-w-0 lg:hidden">
                            <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Affectation
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full gap-2 sm:w-auto"
                              disabled={busy}
                              aria-label={`Affecter une personne au rôle ${role.name}`}
                              onClick={() => {
                                setTeamOwnerResourceId('');
                                setTeamOwnerResourceDetails(null);
                                setAddMemberDialogRoleId(role.id);
                              }}
                            >
                              <Plus className="size-4 shrink-0" aria-hidden />
                              Affecter une personne
                            </Button>
                          </div>
                          <div className="hidden min-w-0 items-start justify-center pt-0 lg:flex">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="size-9 shrink-0"
                              disabled={busy}
                              title={`Affecter une personne — ${role.name}`}
                              aria-label={`Affecter une personne au rôle ${role.name}`}
                              onClick={() => {
                                setTeamOwnerResourceId('');
                                setTeamOwnerResourceDetails(null);
                                setAddMemberDialogRoleId(role.id);
                              }}
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                        </>
                      ) : null}

                      {canEdit ? (
                        <div className="hidden lg:flex lg:mt-0 lg:justify-end lg:pt-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-9 text-muted-foreground hover:text-destructive"
                            disabled={deleteRoleMutation.isPending}
                            title="Supprimer ce rôle (aucun membre affecté)"
                            aria-label={`Supprimer le rôle ${role.name}`}
                            onClick={() => {
                              if (!confirm(deleteRoleConfirmMessage)) return;
                              deleteRoleMutation.mutate(role.id);
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {canEdit ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1.5 shadow-sm"
              onClick={() => setRoleDialogOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Ajouter un rôle
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau rôle d&apos;équipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-role-name">Nom du rôle</Label>
            <Input
              id="new-role-name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Ex. : RSSI, MOA…"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
              onClick={() => createRoleMutation.mutate()}
            >
              {createRoleMutation.isPending ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PersonCatalogPickerDialog
        open={addMemberDialogRoleId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddMemberDialogRoleId(null);
            setTeamOwnerResourceId('');
            setTeamOwnerResourceDetails(null);
          }
        }}
        queryKey={['resources', 'human', 'project-team-add', clientId]}
        queryEnabled={!!clientId}
        title="Affecter une personne"
        description={
          <>
            Choisis une personne du catalogue <strong>Personne</strong> du client actif ou crée-en une.
          </>
        }
        contextSlot={
          addMemberDialogRole ? (
            <div className="text-xs text-muted-foreground">
              Rôle :{' '}
              <span className="font-medium text-foreground">{addMemberDialogRole.name}</span>
            </div>
          ) : null
        }
        filterFetchedResources={filterTeamCatalogResources}
        selectedResourceId={teamOwnerResourceId}
        selectedResourceDetails={teamOwnerResourceDetails}
        onSelectionChange={(id, resource) => {
          setTeamOwnerResourceId(id);
          setTeamOwnerResourceDetails(resource);
          if (resource) {
            commitTeamMember(resource);
          }
        }}
        footerVariant="done-only"
        doneLabel="Fermer"
        tableInteractionDisabled={addMemberMutation.isPending}
        newPersonFormPrefix="project-team-new-person"
        newPersonDialogDescription={
          <>
            Création dans le catalogue ressources (client actif), puis affectation au rôle d’équipe.
          </>
        }
        catalogIntro={
          <>
            Ressources <strong>Personne</strong> du catalogue — même référentiel que la page
            Ressources.
          </>
        }
        filterHint={
          <>Clique une ligne pour l’ajouter au rôle (ou crée une personne).</>
        }
        emptyStateNoFilter={{
          title: 'Aucune personne disponible',
          description:
            'Aucune ressource Personne n’est disponible pour ce rôle (ou déjà affectée).',
        }}
        emptyStateFiltered={{
          title: 'Aucun résultat',
          description: 'Aucune personne ne correspond à ce filtre pour ce rôle.',
        }}
      />
    </>
  );
}
