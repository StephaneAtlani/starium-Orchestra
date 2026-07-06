'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { AlertCircle, Info, Plus, Trash2, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  updateProjectTeamRaci,
  type AddProjectTeamMemberPayload,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import {
  PROJECT_RACI_DESCRIPTION,
  PROJECT_RACI_FULL_LABEL,
  PROJECT_RACI_HELP_DETAIL,
  PROJECT_RACI_HELP_INTRO,
  PROJECT_RACI_KINDS,
  PROJECT_RACI_SHORT_LABEL,
} from '../lib/project-raci-labels';
import {
  useProjectTeamQuery,
  useProjectTeamRaciQuery,
  useProjectTeamRolesQuery,
} from '../hooks/use-project-team-queries';
import type {
  ProjectRaciKind,
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

const TEAM_GRID_COLS_EDIT =
  'lg:grid-cols-[minmax(0,10.5rem)_5.75rem_minmax(0,1fr)_2.25rem_2.25rem]';
const TEAM_GRID_COLS_READ =
  'lg:grid-cols-[minmax(0,10.5rem)_5.75rem_minmax(0,1fr)]';

function ProjectTeamRaciHelpTrigger() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Qu’est-ce que le RACI ?"
          >
            <Info className="size-4" aria-hidden />
          </button>
        }
      />
      <TooltipContent side="bottom" align="start" className="max-w-sm space-y-2 text-xs">
        <p className="font-medium text-foreground">Matrice RACI</p>
        <p className="text-muted-foreground">{PROJECT_RACI_HELP_INTRO}</p>
        <ul className="space-y-1 text-muted-foreground">
          {PROJECT_RACI_KINDS.map((kind) => (
            <li key={kind} className="flex gap-2">
              <span className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-border/70 bg-muted/30 text-[10px] font-bold text-foreground">
                {PROJECT_RACI_SHORT_LABEL[kind]}
              </span>
              <span>
                <span className="font-medium text-foreground">
                  {PROJECT_RACI_FULL_LABEL[kind]}
                </span>
                {' — '}
                {PROJECT_RACI_DESCRIPTION[kind]}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">{PROJECT_RACI_HELP_DETAIL}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ProjectTeamRaciLegend() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-0.5">
        <span className="text-xs font-semibold text-foreground">RACI</span>
        <ProjectTeamRaciHelpTrigger />
      </div>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
        aria-label="Légende des lettres RACI"
      >
        {PROJECT_RACI_KINDS.map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1">
            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-border/70 bg-muted/30 text-[10px] font-bold text-foreground">
              {PROJECT_RACI_SHORT_LABEL[kind]}
            </span>
            <span>{PROJECT_RACI_FULL_LABEL[kind]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ProjectTeamRaciToggles({
  roleName,
  kinds,
  persisted,
  disabled,
  canEdit,
  onToggle,
}: {
  roleName: string;
  kinds: ProjectRaciKind[];
  persisted: boolean;
  disabled: boolean;
  canEdit: boolean;
  onToggle: (kind: ProjectRaciKind, checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'grid w-full max-w-full grid-cols-4 overflow-hidden rounded-md border border-border/70 sm:max-w-[6.5rem] lg:max-w-[5.75rem]',
        !persisted && kinds.length > 0 && 'border-dashed',
      )}
      role="group"
      aria-label={`RACI pour le rôle ${roleName}`}
    >
      {PROJECT_RACI_KINDS.map((kind, index) => {
        const checked = kinds.includes(kind);
        const short = PROJECT_RACI_SHORT_LABEL[kind];
        const full = PROJECT_RACI_FULL_LABEL[kind];
        const description = PROJECT_RACI_DESCRIPTION[kind];
        const controlId = `raci-${roleName}-${kind}`.replace(/\s+/g, '-').toLowerCase();

        const toggle = (
          <label
            htmlFor={canEdit ? controlId : undefined}
            className={cn(
              'flex min-h-11 min-w-0 items-center justify-center text-[11px] font-bold transition-colors sm:min-h-10 lg:min-h-9',
              index > 0 && 'border-l border-border/70',
              checked
                ? 'bg-violet-900/35 text-violet-950 dark:bg-violet-950/55 dark:text-violet-100'
                : 'bg-muted/15 text-muted-foreground',
              canEdit && !disabled && 'cursor-pointer hover:bg-muted/40',
              (!canEdit || disabled) && 'opacity-80',
            )}
            title={`${full} — ${description}`}
          >
            {canEdit ? (
              <Checkbox
                id={controlId}
                checked={checked}
                disabled={disabled}
                className="sr-only"
                onCheckedChange={(value) => onToggle(kind, value === true)}
                aria-label={`${full} (${short}) pour ${roleName}`}
              />
            ) : null}
            <span aria-hidden>{short}</span>
          </label>
        );

        return (
          <Tooltip key={kind}>
            <TooltipTrigger render={toggle} />
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p className="font-medium">
                {short} — {full}
              </p>
              <p className="text-muted-foreground">{description}</p>
              {!persisted && checked ? (
                <p className="mt-1 text-muted-foreground">Valeur suggérée (non enregistrée)</p>
              ) : null}
            </TooltipContent>
          </Tooltip>
        );
      })}
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
  const raciQuery = useProjectTeamRaciQuery(projectId);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [addMemberDialogRoleId, setAddMemberDialogRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [teamOwnerResourceId, setTeamOwnerResourceId] = useState('');
  const [teamOwnerResourceDetails, setTeamOwnerResourceDetails] =
    useState<ResourceListItem | null>(null);

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const members = useMemo(() => teamQuery.data ?? [], [teamQuery.data]);

  const byRole = useMemo(() => membersByRole(members), [members]);

  const raciByRole = useMemo(() => {
    const m = new Map<string, { kinds: ProjectRaciKind[]; persisted: boolean }>();
    for (const row of raciQuery.data ?? []) {
      m.set(row.roleId, { kinds: row.kinds, persisted: row.persisted });
    }
    return m;
  }, [raciQuery.data]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.team(clientId, projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: projectQueryKeys.teamRaci(clientId, projectId),
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

  const raciMutation = useMutation({
    mutationFn: (payload: { roleId: string; kind: ProjectRaciKind; enabled: boolean }) =>
      updateProjectTeamRaci(authFetch, projectId, payload),
    onSuccess: (rows) => {
      queryClient.setQueryData(projectQueryKeys.teamRaci(clientId, projectId), rows);
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
      });
    },
    [addMemberDialogRole, addMemberMutation],
  );

  return (
    <TooltipProvider delay={250}>
      <Card
        size="sm"
        className="overflow-hidden border-l-[3px] border-l-violet-950 shadow-sm dark:border-l-violet-800"
      >
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-violet-900/35 bg-violet-900/20 text-violet-950 shadow-inner dark:border-violet-700/40 dark:bg-violet-950/50 dark:text-violet-100"
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
                Chaque ligne est un <strong>rôle équipe</strong> du client. Les bordures en
                pointillés indiquent des suggestions RACI non encore enregistrées. Les rôles{' '}
                <strong>système</strong> Sponsor et Responsable de projet restent alignés sur le
                portefeuille.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 pt-4">
          {rolesQuery.isLoading || teamQuery.isLoading || raciQuery.isLoading ? (
            <LoadingState rows={5} />
          ) : rolesQuery.error || teamQuery.error || raciQuery.error ? (
            <Alert variant="destructive" className="border-destructive/40">
              <AlertCircle aria-hidden />
              <AlertTitle>Équipe indisponible</AlertTitle>
              <AlertDescription>
                Impossible de charger les rôles ou les membres. Réessayez plus tard.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="min-w-0 max-w-full rounded-xl border border-border/70 bg-card shadow-sm">
              <div className="border-b border-border/60 bg-muted/20 px-3 py-2 sm:px-4">
                <ProjectTeamRaciLegend />
              </div>

              {/* En-tête (desktop) */}
              <div
                className={cn(
                  'hidden gap-3 border-b border-border/60 bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:px-4 lg:grid lg:items-center',
                  canEdit ? TEAM_GRID_COLS_EDIT : TEAM_GRID_COLS_READ,
                )}
              >
                <span>Rôle</span>
                <span className="text-center">RACI</span>
                <span>Membres</span>
                {canEdit ? (
                  <>
                    <span className="sr-only">Affecter</span>
                    <span className="sr-only">Supprimer</span>
                  </>
                ) : null}
              </div>

              <ul className="divide-y divide-border/60" aria-labelledby="project-team-matrix-title">
                {sortedRoles.map((role: ProjectTeamRoleApi, idx: number) => {
                  const rowMembers = byRole.get(role.id) ?? [];
                  const raciRow = raciByRole.get(role.id);
                  const raciKinds = raciRow?.kinds ?? [];
                  const raciPersisted = raciRow?.persisted ?? false;
                  const busy =
                    addMemberMutation.isPending ||
                    removeMemberMutation.isPending ||
                    raciMutation.isPending;
                  const deleteRoleConfirmMessage =
                    role.systemKind != null
                      ? 'Supprimer ce rôle système ? Aucun membre ne doit y être affecté. Les champs sponsor / responsable projet (portefeuille) seront recalculés.'
                      : 'Supprimer ce rôle ? (aucun membre ne doit y être affecté)';

                  return (
                    <li
                      key={role.id}
                      className={cn(
                        'min-w-0 px-3 py-3.5 sm:px-4 sm:py-3 lg:grid lg:items-center lg:gap-3',
                        canEdit ? TEAM_GRID_COLS_EDIT : TEAM_GRID_COLS_READ,
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

                      <div className="mb-3 min-w-0 lg:mb-0">
                        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
                          RACI
                        </span>
                        <ProjectTeamRaciToggles
                          roleName={role.name}
                          kinds={raciKinds}
                          persisted={raciPersisted}
                          disabled={busy || raciMutation.isPending}
                          canEdit={canEdit}
                          onToggle={(kind, checked) => {
                            raciMutation.mutate({
                              roleId: role.id,
                              kind,
                              enabled: checked,
                            });
                          }}
                        />
                      </div>

                      <div className="mb-3 lg:mb-0">
                        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
                          Membres
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
                                <RegistryBadge className="shrink-0 border border-border px-1.5 py-0 text-[10px] text-foreground">
                                  {m.affiliation === 'INTERNAL' ? 'Interne' : 'Externe'}
                                </RegistryBadge>
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
                              Aucun membre
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
                              aria-label={`Affecter une ressource humaine au rôle ${role.name}`}
                              onClick={() => {
                                setTeamOwnerResourceId('');
                                setTeamOwnerResourceDetails(null);
                                setAddMemberDialogRoleId(role.id);
                              }}
                            >
                              <Plus className="size-4 shrink-0" aria-hidden />
                              Affecter une ressource humaine
                            </Button>
                          </div>
                          <div className="hidden min-w-0 items-center justify-center lg:flex">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="size-9 shrink-0"
                              disabled={busy}
                              title={`Affecter une ressource humaine — ${role.name}`}
                              aria-label={`Affecter une ressource humaine au rôle ${role.name}`}
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
                        <div className="hidden items-center justify-center lg:flex">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
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
        title="Affecter une ressource humaine"
        description={
          <>
            Choisis une ressource <strong>Humaine</strong> du catalogue du client actif ou crée-en une.
          </>
        }
        contextSlot={
          addMemberDialogRole ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>
                Rôle : <span className="font-medium text-foreground">{addMemberDialogRole.name}</span>
              </div>
              {addMemberDialogRole.systemKind === 'SPONSOR' ? (
                <div>Le Sponsor doit être lié à un utilisateur du client.</div>
              ) : null}
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
    </TooltipProvider>
  );
}
