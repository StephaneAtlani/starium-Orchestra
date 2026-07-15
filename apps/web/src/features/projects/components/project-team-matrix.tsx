'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { AlertCircle, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
  circleShortLabel,
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
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap justify-end gap-0.5">
      {circles.map((circle) => (
        <RegistryBadge
          key={circle.id}
          title={governanceCircleDisplayLabel(circle)}
          className="h-4 border border-violet-500/25 bg-violet-500/10 px-1 text-[9px] font-normal text-foreground dark:border-violet-400/30 dark:bg-violet-500/15"
        >
          {circleShortLabel(circle)}
        </RegistryBadge>
      ))}
    </div>
  );
}

type TeamRoleActionsMenuProps = {
  roleName: string;
  canDeleteRole: boolean;
  busy: boolean;
  deleteRolePending: boolean;
  deleteRoleConfirmMessage: string;
  onAddMember: () => void;
  onDeleteRole: () => void;
};

function TeamRoleActionsMenu({
  roleName,
  canDeleteRole,
  busy,
  deleteRolePending,
  deleteRoleConfirmMessage,
  onAddMember,
  onDeleteRole,
}: TeamRoleActionsMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!el.open) return;
      const target = event.target as Node | null;
      if (target && el.contains(target)) return;
      el.open = false;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !el.open) return;
      el.open = false;
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details
      ref={menuRef}
      className="group/details relative inline-block group-open/details:z-[120]"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <summary
        className="starium-dt-dots-btn size-8 [&::-webkit-details-marker]:hidden"
        aria-label={`Actions pour le rôle ${roleName}`}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </summary>
      <div
        className={cn(
          'starium-dropdown-panel starium-dropdown-panel--floating starium-dropdown-panel--compact',
          'absolute right-0 z-[120] mt-1 min-w-[10rem] shadow-lg',
          'pointer-events-none translate-y-1 scale-[0.98] opacity-0 transition-all duration-150 ease-out',
          'group-open/details:pointer-events-auto group-open/details:translate-y-0 group-open/details:scale-100 group-open/details:opacity-100',
        )}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className="starium-dropdown-item"
          disabled={busy}
          onClick={() => {
            onAddMember();
            if (menuRef.current) menuRef.current.open = false;
          }}
        >
          <Plus className="shrink-0" strokeWidth={1.75} aria-hidden />
          Affecter une ressource
        </button>
        {canDeleteRole ? (
          <>
            <div className="starium-dropdown-divider" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="starium-dropdown-item starium-dropdown-item--danger"
              disabled={deleteRolePending}
              onClick={() => {
                if (!confirm(deleteRoleConfirmMessage)) return;
                onDeleteRole();
                if (menuRef.current) menuRef.current.open = false;
              }}
            >
              <Trash2 className="shrink-0" strokeWidth={1.75} aria-hidden />
              Supprimer le rôle
            </button>
          </>
        ) : null}
      </div>
    </details>
  );
}

function removeMemberConfirmMessage(
  member: ProjectTeamMemberApi,
  role: ProjectTeamRoleApi,
): string {
  const base = `Retirer ${member.displayName} du rôle « ${role.name} » ?`;
  if (role.systemKind != null) {
    return `${base} Les champs sponsor / responsable projet (portefeuille) seront recalculés.`;
  }
  return base;
}

type TeamRoleRowProps = {
  role: ProjectTeamRoleApi;
  rowMembers: ProjectTeamMemberApi[];
  governanceCircleOptions: ProjectGovernanceCircleApi[];
  canEdit: boolean;
  busy: boolean;
  editingMemberId: string | null;
  circlesPending: boolean;
  deleteRolePending: boolean;
  deleteRoleConfirmMessage: string;
  onSetEditingMemberId: (id: string | null) => void;
  onAddMember: () => void;
  onDeleteRole: () => void;
  onRemoveMember: (memberId: string) => void;
  onCirclesChange: (memberId: string, circleIds: string[]) => void;
};

function TeamRoleRow({
  role,
  rowMembers,
  governanceCircleOptions,
  canEdit,
  busy,
  editingMemberId,
  circlesPending,
  deleteRolePending,
  deleteRoleConfirmMessage,
  onSetEditingMemberId,
  onAddMember,
  onDeleteRole,
  onRemoveMember,
  onCirclesChange,
}: TeamRoleRowProps) {
  const editingMember = rowMembers.find((member) => member.id === editingMemberId) ?? null;

  return (
    <>
      <TableRow className="align-middle hover:bg-muted/20">
        <TableCell
          scope="row"
          className="w-[34%] max-w-[9rem] border-r border-border/50 py-1.5 align-middle whitespace-normal"
        >
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-xs font-medium text-foreground" title={role.name}>
              {role.name}
            </span>
            {role.systemKind != null ? (
              <span
                className="size-1.5 shrink-0 rounded-full bg-violet-500/70"
                title="Rôle système"
                aria-label="Rôle système"
              />
            ) : null}
          </div>
        </TableCell>
        <TableCell className="min-w-0 py-1.5 align-middle whitespace-normal">
          {rowMembers.length === 0 ? (
            <span className="text-[11px] italic text-muted-foreground">Vacant</span>
          ) : (
            <ul className="space-y-0.5">
              {rowMembers.map((member) => {
                const circles = member.governanceCircles ?? [];
                return (
                  <li
                    key={member.id}
                    className="flex min-w-0 items-center gap-1.5 rounded-sm py-0.5"
                  >
                    <UserInitialsAvatar
                      displayName={member.displayName}
                      seed={member.email || member.id}
                      size="sm"
                      className="size-6 shrink-0 text-[9px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-xs leading-tight text-foreground"
                        title={member.displayName}
                      >
                        {member.displayName}
                      </p>
                      {member.memberKind === 'NAMED' && member.affiliation ? (
                        <p className="text-[9px] leading-none text-muted-foreground">
                          {member.affiliation === 'INTERNAL' ? 'Interne' : 'Externe'}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0">
                      <GovernanceCircleBadges circles={circles} />
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 items-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          disabled={busy || circlesPending}
                          aria-expanded={editingMemberId === member.id}
                          aria-label={`Appartenances de ${member.displayName}`}
                          onClick={() =>
                            onSetEditingMemberId(
                              editingMemberId === member.id ? null : member.id,
                            )
                          }
                        >
                          <Users className="size-3" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          disabled={busy}
                          aria-label={`Retirer ${member.displayName}`}
                          onClick={() => {
                            if (!confirm(removeMemberConfirmMessage(member, role))) return;
                            onRemoveMember(member.id);
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </TableCell>
        <TableCell className="w-10 py-1.5 text-right align-middle">
          {canEdit ? (
            <TeamRoleActionsMenu
              roleName={role.name}
              canDeleteRole={rowMembers.length === 0}
              busy={busy}
              deleteRolePending={deleteRolePending}
              deleteRoleConfirmMessage={deleteRoleConfirmMessage}
              onAddMember={onAddMember}
              onDeleteRole={onDeleteRole}
            />
          ) : (
            <span className="sr-only">Lecture seule</span>
          )}
        </TableCell>
      </TableRow>
      {canEdit && editingMember ? (
        <TableRow className="bg-muted/15 hover:bg-muted/15">
          <TableCell colSpan={3} className="py-2 whitespace-normal">
            <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
              Appartenances — {editingMember.displayName}
            </p>
            <ProjectTeamGovernanceCirclesField
              idPrefix={`team-member-${editingMember.id}`}
              options={governanceCircleOptions}
              value={(editingMember.governanceCircles ?? []).map((circle) => circle.id)}
              compact
              disabled={circlesPending || busy}
              onChange={(circleIds) => onCirclesChange(editingMember.id, circleIds)}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function ProjectTeamMatrix({
  projectId,
  readOnly = false,
}: {
  projectId: string;
  readOnly?: boolean;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has('projects.update') && !readOnly;

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

  const deleteRoleConfirmMessageFor = (role: ProjectTeamRoleApi) =>
    role.systemKind != null
      ? 'Supprimer ce rôle système ? Aucun membre ne doit y être affecté. Les champs sponsor / responsable projet (portefeuille) seront recalculés.'
      : 'Supprimer ce rôle ? (aucun membre ne doit y être affecté)';

  const renderTeamTableRows = () => {
    const busy = addMemberMutation.isPending || removeMemberMutation.isPending;

    return sortedRoles.map((role) => {
      const rowMembers = byRole.get(role.id) ?? [];
      const deleteRoleConfirmMessage = deleteRoleConfirmMessageFor(role);

      return (
        <TeamRoleRow
          key={role.id}
          role={role}
          rowMembers={rowMembers}
          governanceCircleOptions={governanceCircleOptions}
          canEdit={canEdit}
          busy={busy}
          editingMemberId={editingMemberId}
          circlesPending={updateCirclesMutation.isPending}
          deleteRolePending={deleteRoleMutation.isPending}
          deleteRoleConfirmMessage={deleteRoleConfirmMessage}
          onSetEditingMemberId={setEditingMemberId}
          onAddMember={() => openAddMemberDialog(role.id)}
          onDeleteRole={() => deleteRoleMutation.mutate(role.id)}
          onRemoveMember={(memberId) => removeMemberMutation.mutate(memberId)}
          onCirclesChange={(memberId, circleIds) =>
            updateCirclesMutation.mutate({ memberId, circleIds })
          }
        />
      );
    });
  };

  return (
    <>
      <Card
        size="sm"
        className="gap-0 overflow-hidden border border-border/80 border-l-[3px] border-l-violet-500/70 shadow-sm"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b border-border/60 px-3 py-2">
          <div className="min-w-0">
            <CardTitle
              id="project-team-matrix-title"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Équipe projet
            </CardTitle>
            {!canEdit ? (
              <CardDescription className="text-[10px] text-muted-foreground">
                Lecture seule
              </CardDescription>
            ) : null}
          </div>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2 text-xs"
              onClick={() => setRoleDialogOpen(true)}
            >
              <Plus className="size-3.5" aria-hidden />
              Rôle
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="min-w-0 px-0 pt-0 pb-0">
          {rolesQuery.isLoading || teamQuery.isLoading ? (
            <div className="px-3 py-3">
              <LoadingState rows={3} />
            </div>
          ) : rolesQuery.error || teamQuery.error ? (
            <div className="px-3 py-3">
              <Alert variant="destructive" className="border-destructive/40">
                <AlertCircle aria-hidden />
                <AlertTitle>Équipe indisponible</AlertTitle>
                <AlertDescription>
                  Impossible de charger les rôles ou les membres. Réessayez plus tard.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/25 hover:bg-muted/25">
                  <TableHead
                    scope="col"
                    className="h-7 border-r border-border/50 py-1 text-[10px]"
                  >
                    Rôle
                  </TableHead>
                  <TableHead scope="col" className="h-7 py-1 text-[10px]">
                    Ressource
                  </TableHead>
                  <TableHead scope="col" className="h-7 w-10 py-1 text-right text-[10px]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody aria-labelledby="project-team-matrix-title">
                {renderTeamTableRows()}
              </TableBody>
            </Table>
          )}
        </CardContent>
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
