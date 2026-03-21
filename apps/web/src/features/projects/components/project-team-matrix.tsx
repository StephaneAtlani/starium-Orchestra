'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Users } from 'lucide-react';
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
import {
  addProjectTeamMember,
  createProjectTeamRole,
  deleteProjectTeamRole,
  removeProjectTeamMember,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectTeamQuery, useProjectTeamRolesQuery } from '../hooks/use-project-team-queries';
import type { ProjectAssignableUser, ProjectTeamMemberApi, ProjectTeamRoleApi } from '../types/project.types';

const NONE = '__none__';

function formatUserLabel(m: ProjectAssignableUser): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return n || m.email;
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
    mutationFn: async ({ roleId, userId }: { roleId: string; userId: string }) => {
      return addProjectTeamMember(authFetch, projectId, { roleId, userId });
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
    new Set((byRole.get(roleId) ?? []).map((m) => m.userId));

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
        <CardContent className="space-y-4">
          {rolesQuery.isLoading || teamQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : rolesQuery.error || teamQuery.error ? (
            <p className="text-sm text-destructive">Impossible de charger l&apos;équipe.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Rôle</TableHead>
                    <TableHead>Membres</TableHead>
                    {canEdit ? <TableHead className="w-[220px]">Ajouter</TableHead> : null}
                    {canEdit ? <TableHead className="w-[52px]" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRoles.map((role: ProjectTeamRoleApi) => {
                    const rowMembers = byRole.get(role.id) ?? [];
                    const pick = pickUserByRole[role.id] ?? NONE;
                    const canDeleteRole = canEdit && role.systemKind == null;
                    const busy =
                      addMemberMutation.isPending || removeMemberMutation.isPending;

                    return (
                      <TableRow key={role.id}>
                        <TableCell className="align-top font-medium">
                          {role.name}
                          {role.systemKind ? (
                            <span className="ml-1.5 text-[10px] font-normal uppercase text-muted-foreground">
                              (système)
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="align-top">
                          <ul className="flex flex-wrap gap-2">
                            {rowMembers.map((m) => (
                              <li
                                key={m.id}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-px text-xs"
                              >
                                <span>{m.displayName}</span>
                                {canEdit ? (
                                  <button
                                    type="button"
                                    className="rounded p-0.5 text-muted-foreground hover:text-destructive"
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
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : null}
                          </ul>
                        </TableCell>
                        {canEdit ? (
                          <TableCell className="align-top">
                            <div className="flex flex-wrap items-center gap-2">
                              <Select
                                value={pick}
                                onValueChange={(v) =>
                                  setPickUserByRole((prev) => ({ ...prev, [role.id]: v }))
                                }
                              >
                                <SelectTrigger className="h-8 min-w-[160px] max-w-[220px] text-left">
                                  <SelectValue placeholder="Choisir…" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NONE}>—</SelectItem>
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
                                variant="secondary"
                                className="h-8"
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
                                OK
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                        {canEdit ? (
                          <TableCell className="align-top text-right">
                            {canDeleteRole ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                disabled={deleteRoleMutation.isPending}
                                title="Supprimer le rôle (vide)"
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
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
