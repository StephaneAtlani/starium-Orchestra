'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { AlertCircle, ChevronDown, Plus, Trash2, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
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
  updateProjectTeamMemberCircles,
  type AddProjectTeamMemberPayload,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import {
  useProjectTeamQuery,
  useProjectTeamRolesQuery,
} from '../hooks/use-project-team-queries';
import { useProjectGovernanceCirclesQuery } from '../hooks/use-project-governance-circles-query';
import type {
  ProjectGovernanceCircleApi,
  ProjectTeamMemberApi,
  ProjectTeamMemberGovernanceCircleRefApi,
  ProjectTeamRoleApi,
} from '../types/project.types';
import {
  governanceCircleDisplayLabel,
  ProjectTeamGovernanceCirclesField,
} from './project-team-governance-circles-field';

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

function GovernanceCircleBadges({
  circles,
}: {
  circles: ProjectTeamMemberGovernanceCircleRefApi[];
}) {
  if (circles.length === 0) {
    return (
      <span className="text-xs italic text-muted-foreground">Non renseignée</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {circles.map((circle) => (
        <RegistryBadge
          key={circle.id}
          className="border border-violet-500/30 bg-violet-500/10 px-2 py-0 text-[11px] text-foreground dark:border-violet-400/35 dark:bg-violet-500/15"
        >
          {governanceCircleDisplayLabel(circle)}
        </RegistryBadge>
      ))}
    </div>
  );
}

type TeamMemberRowProps = {
  member: ProjectTeamMemberApi;
  governanceCircleOptions: ProjectGovernanceCircleApi[];
  canEdit: boolean;
  busy: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onCirclesChange: (circleIds: string[]) => void;
  circlesPending: boolean;
};

function TeamMemberRow({
  member,
  governanceCircleOptions,
  canEdit,
  busy,
  isEditing,
  onToggleEdit,
  onRemove,
  onCirclesChange,
  circlesPending,
}: TeamMemberRowProps) {
  const circles = member.governanceCircles ?? [];

  return (
    <article className="rounded-lg border border-border/70 bg-muted/20 p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <UserInitialsAvatar
          displayName={member.displayName}
          seed={member.email || member.id}
          size="sm"
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="text-sm font-medium leading-snug text-foreground"
              title={member.displayName}
            >
              {member.displayName}
            </span>
            {member.memberKind === 'NAMED' && member.affiliation ? (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                {member.affiliation === 'INTERNAL' ? 'Interne' : 'Externe'}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="starium-overline">Appartenance</p>
            <GovernanceCircleBadges circles={circles} />
          </div>
          {canEdit && isEditing ? (
            <div className="rounded-md border border-border/60 bg-card p-3">
              <ProjectTeamGovernanceCirclesField
                idPrefix={`team-member-${member.id}`}
                options={governanceCircleOptions}
                value={circles.map((c) => c.id)}
                compact
                disabled={circlesPending || busy}
                onChange={onCirclesChange}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={onToggleEdit}
                >
                  Terminé
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1 px-2 text-xs text-muted-foreground"
              disabled={busy || circlesPending}
              aria-expanded={isEditing}
              onClick={onToggleEdit}
            >
              Appartenances
              <ChevronDown
                className={cn('size-3.5 transition-transform', isEditing && 'rotate-180')}
                aria-hidden
              />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={busy}
              aria-label={`Retirer ${member.displayName}`}
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

type TeamRoleBlockProps = {
  role: ProjectTeamRoleApi;
  rowMembers: ProjectTeamMemberApi[];
  governanceCircleOptions: ProjectGovernanceCircleApi[];
  canEdit: boolean;
  busy: boolean;
  editingMemberId: string | null;
  onSetEditingMemberId: (id: string | null) => void;
  onAddMember: () => void;
  onDeleteRole: () => void;
  onRemoveMember: (memberId: string) => void;
  onCirclesChange: (memberId: string, circleIds: string[]) => void;
  circlesPending: boolean;
  deleteRolePending: boolean;
  deleteRoleConfirmMessage: string;
};

function TeamRoleBlock({
  role,
  rowMembers,
  governanceCircleOptions,
  canEdit,
  busy,
  editingMemberId,
  onSetEditingMemberId,
  onAddMember,
  onDeleteRole,
  onRemoveMember,
  onCirclesChange,
  circlesPending,
  deleteRolePending,
  deleteRoleConfirmMessage,
}: TeamRoleBlockProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-snug text-foreground">{role.name}</p>
          {role.systemKind != null ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
              Rôle système
            </Badge>
          ) : null}
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={deleteRolePending}
            title="Supprimer ce rôle (aucun membre affecté)"
            aria-label={`Supprimer le rôle ${role.name}`}
            onClick={() => {
              if (!confirm(deleteRoleConfirmMessage)) return;
              onDeleteRole();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        {rowMembers.length > 0 ? (
          rowMembers.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              governanceCircleOptions={governanceCircleOptions}
              canEdit={canEdit}
              busy={busy}
              isEditing={editingMemberId === member.id}
              circlesPending={circlesPending}
              onToggleEdit={() =>
                onSetEditingMemberId(editingMemberId === member.id ? null : member.id)
              }
              onRemove={() => onRemoveMember(member.id)}
              onCirclesChange={(circleIds) => onCirclesChange(member.id, circleIds)}
            />
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-4 text-center text-xs italic text-muted-foreground">
            Aucun membre affecté à ce rôle
          </p>
        )}
      </div>

      {canEdit ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full gap-2 sm:w-auto"
          disabled={busy}
          aria-label={`Affecter une ressource humaine au rôle ${role.name}`}
          onClick={onAddMember}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          Affecter une ressource
        </Button>
      ) : null}
    </div>
  );
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
  const governanceCirclesQuery = useProjectGovernanceCirclesQuery(projectId);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [addMemberDialogRoleId, setAddMemberDialogRoleId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [teamOwnerResourceId, setTeamOwnerResourceId] = useState('');
  const [teamOwnerResourceDetails, setTeamOwnerResourceDetails] =
    useState<ResourceListItem | null>(null);
  const [pendingCircleIds, setPendingCircleIds] = useState<string[]>([]);

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const members = useMemo(() => teamQuery.data ?? [], [teamQuery.data]);
  const governanceCircleOptions = useMemo(
    () => governanceCirclesQuery.data?.items ?? [],
    [governanceCirclesQuery.data?.items],
  );

  const byRole = useMemo(() => membersByRole(members), [members]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.team(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.raciMatrix(clientId, projectId),
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
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.raciMatrix(clientId, projectId),
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
      setPendingCircleIds([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      removeProjectTeamMember(authFetch, projectId, memberId),
    onSuccess: () => {
      toast.success('Membre retiré');
      if (editingMemberId) setEditingMemberId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  const updateCirclesMutation = useMutation({
    mutationFn: ({
      memberId,
      circleIds,
    }: {
      memberId: string;
      circleIds: string[];
    }) => updateProjectTeamMemberCircles(authFetch, projectId, memberId, circleIds),
    onSuccess: () => {
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
      if (addMemberDialogRole.systemKind === 'SPONSOR') {
        if (!resource.linkedUserId) {
          toast.error(
            "Pour le rôle Sponsor, sélectionnez une ressource Humaine liée à un utilisateur du client.",
          );
          return;
        }
        addMemberMutation.mutate({
          roleId,
          userId: resource.linkedUserId,
          circleIds: pendingCircleIds,
        });
        return;
      }
      const freeLabel = formatResourceDisplayName(resource);
      const maxLen = 200;
      const label =
        freeLabel.length > maxLen ? `${freeLabel.slice(0, maxLen - 1)}…` : freeLabel;
      addMemberMutation.mutate({
        roleId,
        freeLabel: label,
        affiliation: resource.affiliation === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
        circleIds: pendingCircleIds,
      });
    },
    [addMemberDialogRole, addMemberMutation, pendingCircleIds],
  );

  const openAddMemberDialog = (roleId: string) => {
    setTeamOwnerResourceId('');
    setTeamOwnerResourceDetails(null);
    setPendingCircleIds([]);
    setAddMemberDialogRoleId(roleId);
  };

  const renderRoleBlock = (role: ProjectTeamRoleApi) => {
    const rowMembers = byRole.get(role.id) ?? [];
    const busy = addMemberMutation.isPending || removeMemberMutation.isPending;
    const deleteRoleConfirmMessage =
      role.systemKind != null
        ? 'Supprimer ce rôle système ? Aucun membre ne doit y être affecté. Les champs sponsor / responsable projet (portefeuille) seront recalculés.'
        : 'Supprimer ce rôle ? (aucun membre ne doit y être affecté)';

    return (
      <TeamRoleBlock
        key={role.id}
        role={role}
        rowMembers={rowMembers}
        governanceCircleOptions={governanceCircleOptions}
        canEdit={canEdit}
        busy={busy}
        editingMemberId={editingMemberId}
        deleteRoleConfirmMessage={deleteRoleConfirmMessage}
        deleteRolePending={deleteRoleMutation.isPending}
        circlesPending={updateCirclesMutation.isPending}
        onSetEditingMemberId={setEditingMemberId}
        onAddMember={() => openAddMemberDialog(role.id)}
        onDeleteRole={() => deleteRoleMutation.mutate(role.id)}
        onRemoveMember={(memberId) => removeMemberMutation.mutate(memberId)}
        onCirclesChange={(memberId, circleIds) =>
          updateCirclesMutation.mutate({ memberId, circleIds })
        }
      />
    );
  };

  return (
    <>
      <Card
        size="sm"
        className="overflow-hidden border border-border/80 border-l-[3px] border-l-violet-500/70 shadow-sm"
      >
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle
            id="project-team-matrix-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Composition de l&apos;équipe
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed text-muted-foreground">
            Rôles du client, ressources affectées et appartenance aux cercles de gouvernance
            (COPIL, COPROJ, cercles personnalisés). La matrice RASCI se trouve en bas de fiche.
          </CardDescription>
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
            <>
              <div className="starium-panel overflow-hidden rounded-[var(--ds-card-radius)] border border-border bg-card shadow-sm lg:hidden">
                <ul
                  className="divide-y divide-border/60"
                  aria-labelledby="project-team-matrix-title"
                >
                  {sortedRoles.map((role) => (
                    <li key={role.id} className="p-4">
                      {renderRoleBlock(role)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="starium-panel hidden overflow-hidden rounded-[var(--ds-card-radius)] border border-border bg-card shadow-sm lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead
                        scope="col"
                        className="starium-overline w-[11rem] min-w-[11rem] border-r border-border/60 align-middle"
                      >
                        Rôle
                      </TableHead>
                      <TableHead
                        scope="col"
                        className="starium-overline min-w-0 align-middle"
                      >
                        Membres & appartenance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody aria-labelledby="project-team-matrix-title">
                    {sortedRoles.map((role, rowIdx) => {
                      const rowMembers = byRole.get(role.id) ?? [];
                      const busy =
                        addMemberMutation.isPending || removeMemberMutation.isPending;
                      const deleteRoleConfirmMessage =
                        role.systemKind != null
                          ? 'Supprimer ce rôle système ? Aucun membre ne doit y être affecté. Les champs sponsor / responsable projet (portefeuille) seront recalculés.'
                          : 'Supprimer ce rôle ? (aucun membre ne doit y être affecté)';

                      return (
                        <TableRow
                          key={role.id}
                          className={cn(
                            'align-top',
                            rowIdx % 2 === 1 && 'bg-muted/15 hover:bg-muted/15',
                          )}
                        >
                          <TableCell
                            scope="row"
                            className="border-r border-border/60 py-4 align-top"
                          >
                            <div className="space-y-1.5">
                              <p className="text-sm font-semibold leading-snug text-foreground">
                                {role.name}
                              </p>
                              {role.systemKind != null ? (
                                <Badge
                                  variant="secondary"
                                  className="h-5 px-1.5 text-[10px] font-normal"
                                >
                                  Rôle système
                                </Badge>
                              ) : null}
                              {canEdit ? (
                                <div className="flex flex-col gap-1.5 pt-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-full justify-start gap-2"
                                    disabled={busy}
                                    aria-label={`Affecter une ressource humaine au rôle ${role.name}`}
                                    onClick={() => openAddMemberDialog(role.id)}
                                  >
                                    <Plus className="size-4 shrink-0" aria-hidden />
                                    Affecter
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
                                    disabled={deleteRoleMutation.isPending}
                                    aria-label={`Supprimer le rôle ${role.name}`}
                                    onClick={() => {
                                      if (!confirm(deleteRoleConfirmMessage)) return;
                                      deleteRoleMutation.mutate(role.id);
                                    }}
                                  >
                                    <Trash2 className="size-4 shrink-0" aria-hidden />
                                    Supprimer le rôle
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 align-top">
                            <div className="space-y-2">
                              {rowMembers.length > 0 ? (
                                rowMembers.map((member) => (
                                  <TeamMemberRow
                                    key={member.id}
                                    member={member}
                                    governanceCircleOptions={governanceCircleOptions}
                                    canEdit={canEdit}
                                    busy={busy}
                                    isEditing={editingMemberId === member.id}
                                    circlesPending={updateCirclesMutation.isPending}
                                    onToggleEdit={() =>
                                      setEditingMemberId(
                                        editingMemberId === member.id ? null : member.id,
                                      )
                                    }
                                    onRemove={() => removeMemberMutation.mutate(member.id)}
                                    onCirclesChange={(circleIds) =>
                                      updateCirclesMutation.mutate({
                                        memberId: member.id,
                                        circleIds,
                                      })
                                    }
                                  />
                                ))
                              ) : (
                                <p className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-4 text-center text-xs italic text-muted-foreground">
                                  Aucun membre affecté à ce rôle
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>

        {canEdit ? (
          <CardFooter className="border-t border-border/60 bg-muted/15 px-4 py-3">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-9 gap-1.5 shadow-sm"
              onClick={() => setRoleDialogOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Ajouter un rôle
            </Button>
          </CardFooter>
        ) : (
          <CardFooter className="border-t border-border/60 bg-muted/15 px-4 py-3">
            <p className="text-xs text-muted-foreground">Lecture seule — pas de modification.</p>
          </CardFooter>
        )}
      </Card>

      <StariumModal
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        title="Nouveau rôle d'équipe"
        icon={Users}
        size="md"
        footer={
          <>
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
          </>
        }
      >
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
      </StariumModal>

      <PersonCatalogPickerDialog
        open={addMemberDialogRoleId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddMemberDialogRoleId(null);
            setTeamOwnerResourceId('');
            setTeamOwnerResourceDetails(null);
            setPendingCircleIds([]);
          }
        }}
        queryKey={['resources', 'human', 'project-team-add', clientId]}
        queryEnabled={!!clientId}
        title="Affecter une ressource humaine"
        description={
          <>
            Choisis une ressource <strong>Humaine</strong> du catalogue du client actif ou crée-en une.
          </>
        }
        contextSlot={
          addMemberDialogRole ? (
            <div className="space-y-3 text-xs text-muted-foreground">
              <div>
                Rôle :{' '}
                <span className="font-medium text-foreground">{addMemberDialogRole.name}</span>
              </div>
              {addMemberDialogRole.systemKind === 'SPONSOR' ? (
                <div>Le Sponsor doit être lié à un utilisateur du client.</div>
              ) : null}
              <ProjectTeamGovernanceCirclesField
                idPrefix="project-team-add-circles"
                options={governanceCircleOptions}
                value={pendingCircleIds}
                disabled={addMemberMutation.isPending || governanceCirclesQuery.isLoading}
                onChange={setPendingCircleIds}
              />
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
            Ressources <strong>Humaine</strong> du catalogue — même référentiel que la page
            Ressources.
          </>
        }
        filterHint={
          <>Clique une ligne pour l’ajouter au rôle (ou crée une ressource Humaine).</>
        }
        emptyStateNoFilter={{
          title: 'Aucune ressource Humaine disponible',
          description:
            'Aucune ressource Humaine n’est disponible pour ce rôle (ou déjà affectée).',
        }}
        emptyStateFiltered={{
          title: 'Aucun résultat',
          description: 'Aucune ressource Humaine ne correspond à ce filtre pour ce rôle.',
        }}
      />
    </>
  );
}
