'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  addProjectTeamMember,
  createProjectTeamRole,
  deleteProjectTeamRole,
  removeProjectTeamMember,
  type AddProjectTeamMemberPayload,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectTeamQuery, useProjectTeamRolesQuery } from '../hooks/use-project-team-queries';
import type {
  ProjectAssignableUser,
  ProjectTeamMemberAffiliationApi,
  ProjectTeamMemberApi,
  ProjectTeamRoleApi,
} from '../types/project.types';

const NONE = '__none__';

const AFFILIATION_LABEL: Record<ProjectTeamMemberAffiliationApi, string> = {
  INTERNAL: 'Interne',
  EXTERNAL: 'Externe',
};

function formatUserLabel(m: ProjectAssignableUser): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return n || m.email;
}

/** Libellé affiché dans le select utilisateur (jamais l’id brut). */
function userPickLabel(
  pick: string,
  assignable: ProjectAssignableUser[],
): string | undefined {
  if (pick === NONE) return undefined;
  const u = assignable.find((x) => x.id === pick);
  return u ? formatUserLabel(u) : 'Compte non disponible dans la liste';
}

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
  const assignableQuery = useProjectAssignableUsers();

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [pickUserByRole, setPickUserByRole] = useState<Record<string, string>>({});
  const [assignModeByRole, setAssignModeByRole] = useState<Record<string, 'user' | 'free'>>({});
  const [freeNameByRole, setFreeNameByRole] = useState<Record<string, string>>({});
  const [freeAffiliationByRole, setFreeAffiliationByRole] = useState<
    Record<string, ProjectTeamMemberAffiliationApi>
  >({});

  const roles = rolesQuery.data ?? [];
  const members = teamQuery.data ?? [];
  const assignable = assignableQuery.data ?? [];
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
      setPickUserByRole((prev) => ({ ...prev }));
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

  const userIdsInRole = (roleId: string) =>
    new Set(
      (byRole.get(roleId) ?? [])
        .filter((m) => m.memberKind === 'USER' && m.userId)
        .map((m) => m.userId as string),
    );

  const selectableUsersForRole = (roleId: string) => {
    const taken = userIdsInRole(roleId);
    return assignable.filter((u) => !taken.has(u.id));
  };

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" aria-hidden />
            Composition de l&apos;équipe
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Rôles du client (Sponsor, Responsable, Métier, rôles personnalisés) et personnes
            affectées. Les rôles système synchronisent le portefeuille (sponsor / responsable).
          </p>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          {rolesQuery.isLoading || teamQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : rolesQuery.error || teamQuery.error ? (
            <p className="text-sm text-destructive">Impossible de charger l&apos;équipe.</p>
          ) : (
            <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
              {/* En-tête (desktop) */}
              <div
                className={cn(
                  'hidden gap-4 border-b border-border/70 bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid lg:items-center',
                  canEdit
                    ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.6fr)_auto]'
                    : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]',
                )}
                aria-hidden
              >
                <span>Rôle</span>
                <span>Personnes</span>
                {canEdit ? (
                  <>
                    <span>Ajouter</span>
                    <span className="w-9 text-center" />
                  </>
                ) : null}
              </div>

              <ul className="divide-y divide-border/70">
                {sortedRoles.map((role: ProjectTeamRoleApi, idx: number) => {
                  const rowMembers = byRole.get(role.id) ?? [];
                  const pick = pickUserByRole[role.id] ?? NONE;
                  const mode = assignModeByRole[role.id] ?? 'user';
                  const freeName = freeNameByRole[role.id] ?? '';
                  const freeAff =
                    freeAffiliationByRole[role.id] ??
                    ('INTERNAL' as ProjectTeamMemberAffiliationApi);
                  const canDeleteRole = canEdit && role.systemKind == null;
                  const busy =
                    addMemberMutation.isPending || removeMemberMutation.isPending;

                  return (
                    <li
                      key={role.id}
                      className={cn(
                        'min-w-0 px-3 py-3.5 sm:px-4 sm:py-4 lg:grid lg:gap-4 lg:items-start',
                        canEdit
                          ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.6fr)_auto]'
                          : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]',
                        idx % 2 === 1 && 'bg-muted/20',
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
                          {role.systemKind ? (
                            <Badge variant="secondary" className="w-fit text-[10px] font-normal">
                              Rôle système
                            </Badge>
                          ) : null}
                        </div>
                        {canEdit && canDeleteRole ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-9 shrink-0 text-muted-foreground hover:text-destructive lg:hidden"
                            disabled={deleteRoleMutation.isPending}
                            title="Supprimer ce rôle (doit être vide)"
                            aria-label={`Supprimer le rôle ${role.name}`}
                            onClick={() => {
                              if (
                                !confirm(
                                  'Supprimer ce rôle ? (aucun membre ne doit y être affecté)',
                                )
                              )
                                return;
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
                              className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/80 bg-muted/35 px-2 py-1 text-xs"
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
                        <div className="min-w-0 lg:pt-0">
                          <span className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
                            Affectation
                          </span>
                          <Tabs
                            value={mode}
                            onValueChange={(v) => {
                              const next = v as 'user' | 'free';
                              setAssignModeByRole((prev) => ({
                                ...prev,
                                [role.id]: next,
                              }));
                            }}
                            className="w-full min-w-0 max-w-full"
                          >
                            <TabsList className="mb-2 grid h-9 w-full min-w-0 grid-cols-2">
                              <TabsTrigger value="user" className="text-xs">
                                Utilisateur
                              </TabsTrigger>
                              <TabsTrigger value="free" className="text-xs">
                                Nom libre
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="user" className="mt-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                <Select
                                  value={pick}
                                  onValueChange={(v) =>
                                    setPickUserByRole((prev) => ({
                                      ...prev,
                                      [role.id]: v ?? NONE,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 w-full min-w-0 text-left text-sm sm:min-w-[12rem] sm:max-w-[20rem]">
                                    <SelectValue placeholder="Choisir un utilisateur…">
                                      {userPickLabel(pick, assignable)}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NONE}>— Choisir dans la liste</SelectItem>
                                    {selectableUsersForRole(role.id).map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {formatUserLabel(u)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-9 shrink-0 gap-1.5"
                                  disabled={
                                    busy ||
                                    pick === NONE ||
                                    !pick ||
                                    addMemberMutation.isPending
                                  }
                                  onClick={() => {
                                    if (pick === NONE || !pick) return;
                                    addMemberMutation.mutate(
                                      { roleId: role.id, userId: pick },
                                      {
                                        onSettled: () =>
                                          setPickUserByRole((prev) => ({
                                            ...prev,
                                            [role.id]: NONE,
                                          })),
                                      },
                                    );
                                  }}
                                >
                                  <UserPlus className="size-3.5" aria-hidden />
                                  Ajouter
                                </Button>
                              </div>
                            </TabsContent>
                            <TabsContent value="free" className="mt-0">
                              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                                <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[12rem]">
                                  <Label
                                    htmlFor={`free-name-${role.id}`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    Nom affiché
                                  </Label>
                                  <Input
                                    id={`free-name-${role.id}`}
                                    className="h-9"
                                    placeholder="Ex. prestataire, MOA…"
                                    value={freeName}
                                    maxLength={200}
                                    autoComplete="off"
                                    onChange={(e) =>
                                      setFreeNameByRole((prev) => ({
                                        ...prev,
                                        [role.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="w-full space-y-1.5 sm:w-36">
                                  <Label className="text-xs text-muted-foreground">Portée</Label>
                                  <Select
                                    value={freeAff}
                                    onValueChange={(v) =>
                                      setFreeAffiliationByRole((prev) => ({
                                        ...prev,
                                        [role.id]: (v ??
                                          'INTERNAL') as ProjectTeamMemberAffiliationApi,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 w-full">
                                      <SelectValue placeholder="Interne ou externe…">
                                        {AFFILIATION_LABEL[freeAff]}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="INTERNAL">Interne</SelectItem>
                                      <SelectItem value="EXTERNAL">Externe</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-9 gap-1.5 sm:shrink-0"
                                  disabled={
                                    busy ||
                                    !freeName.trim() ||
                                    addMemberMutation.isPending
                                  }
                                  onClick={() => {
                                    const label = freeName.trim();
                                    if (!label) return;
                                    addMemberMutation.mutate(
                                      {
                                        roleId: role.id,
                                        freeLabel: label,
                                        affiliation: freeAff,
                                      },
                                      {
                                        onSettled: () =>
                                          setFreeNameByRole((prev) => ({
                                            ...prev,
                                            [role.id]: '',
                                          })),
                                      },
                                    );
                                  }}
                                >
                                  <UserPlus className="size-3.5" aria-hidden />
                                  Ajouter
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      ) : null}

                      {canEdit ? (
                        <div className="hidden lg:flex lg:mt-0 lg:justify-end lg:pt-0">
                          {canDeleteRole ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-9 text-muted-foreground hover:text-destructive"
                              disabled={deleteRoleMutation.isPending}
                              title="Supprimer ce rôle (doit être vide)"
                              aria-label={`Supprimer le rôle ${role.name}`}
                              onClick={() => {
                                if (
                                  !confirm(
                                    'Supprimer ce rôle ? (aucun membre ne doit y être affecté)',
                                  )
                                )
                                  return;
                                deleteRoleMutation.mutate(role.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
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
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setRoleDialogOpen(true)}
            >
              <Plus className="size-4" />
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
    </>
  );
}
