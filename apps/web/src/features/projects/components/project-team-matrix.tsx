'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, Plus, Trash2, UserPlus, Users } from 'lucide-react';
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
  DialogDescription,
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
import { cn } from '@/lib/utils';
import { formatResourceDisplayName } from '@/lib/resource-labels';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { tryListResources, type ResourceListItem } from '@/services/resources';
import { NewResourceForm } from '@/app/(protected)/resources/_components/new-resource-form';
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
  ProjectTeamRoleSystemKind,
} from '../types/project.types';

const RESOURCE_NONE = '__none__';

/** Aligné sur `ProjectTeamRoleSystemKind` — une ligne par rôle système (sync sponsor / responsable). */
const SYSTEM_ROLE_BADGE: Record<ProjectTeamRoleSystemKind, string> = {
  SPONSOR: 'Sponsor — synchronisé portefeuille',
  OWNER: 'Responsable projet — synchronisé portefeuille',
};

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
  const [teamResourceSearch, setTeamResourceSearch] = useState('');
  const [teamOwnerResourceId, setTeamOwnerResourceId] = useState('');
  const [teamOwnerResourceDetails, setTeamOwnerResourceDetails] =
    useState<ResourceListItem | null>(null);
  const [newPersonDialogOpen, setNewPersonDialogOpen] = useState(false);

  const roles = rolesQuery.data ?? [];
  const members = teamQuery.data ?? [];

  const {
    data: resourcesOutcome,
    isLoading: resourcesLoading,
    refetch: refetchHumanResources,
  } = useQuery({
    queryKey: ['resources', 'human', 'project-team-add', clientId],
    queryFn: () => tryListResources(authFetch, { type: 'HUMAN', limit: 100, offset: 0 }),
    enabled: !!clientId && addMemberDialogRoleId !== null,
  });

  const humanResources = resourcesOutcome?.ok ? resourcesOutcome.data.items : [];
  const resourcesBlock =
    resourcesOutcome && !resourcesOutcome.ok ? resourcesOutcome : null;
  const resourceCatalogDenied = Boolean(resourcesBlock);
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
      setTeamResourceSearch('');
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

  const availableHumanResources = useMemo(() => {
    return humanResources.filter(
      (r) => !r.email?.trim() || !takenEmailsInRole.has(r.email.trim().toLowerCase()),
    );
  }, [humanResources, takenEmailsInRole]);

  const filteredTeamResources = useMemo(() => {
    const q = teamResourceSearch.trim().toLowerCase();
    if (!q) return availableHumanResources;
    return availableHumanResources.filter((r) => {
      const label = formatResourceDisplayName(r).toLowerCase();
      const hay = [label, r.email ?? '', r.code ?? '', r.companyName ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [availableHumanResources, teamResourceSearch]);

  /** Résolution catalogue + détails (ex. personne créée juste avant le refetch). */
  const selectedTeamPerson = useMemo((): ResourceListItem | null => {
    if (!teamOwnerResourceId || teamOwnerResourceId === RESOURCE_NONE) return null;
    return (
      humanResources.find((x) => x.id === teamOwnerResourceId) ??
      (teamOwnerResourceDetails?.id === teamOwnerResourceId ? teamOwnerResourceDetails : null)
    );
  }, [teamOwnerResourceId, humanResources, teamOwnerResourceDetails]);

  const teamPersonTriggerLabel = useMemo(() => {
    if (!selectedTeamPerson) return null;
    return `${formatResourceDisplayName(selectedTeamPerson)}${selectedTeamPerson.email ? ` · ${selectedTeamPerson.email}` : ''}`;
  }, [selectedTeamPerson]);

  /** Garde un SelectItem pour la valeur courante même si le filtre masque la ligne (sinon l’ID s’affiche). */
  const resourcesForSelectDropdown = useMemo(() => {
    const ids = new Set(filteredTeamResources.map((r) => r.id));
    if (selectedTeamPerson && !ids.has(selectedTeamPerson.id)) {
      return [selectedTeamPerson, ...filteredTeamResources];
    }
    return filteredTeamResources;
  }, [filteredTeamResources, selectedTeamPerson]);

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
                          {role.systemKind ? (
                            <Badge variant="secondary" className="w-fit max-w-full text-left text-[10px] font-normal leading-snug">
                              {SYSTEM_ROLE_BADGE[role.systemKind]}
                            </Badge>
                          ) : null}
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
                                setTeamResourceSearch('');
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
                                setTeamResourceSearch('');
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

      <Dialog
        open={addMemberDialogRoleId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddMemberDialogRoleId(null);
            setTeamResourceSearch('');
            setTeamOwnerResourceId('');
            setTeamOwnerResourceDetails(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Affecter une personne</DialogTitle>
            <DialogDescription>
              Sélectionne une personne du catalogue (ressource type Personne). Tu peux en créer une
              nouvelle si besoin.
            </DialogDescription>
          </DialogHeader>

          {addMemberDialogRole ? (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Rôle :{' '}
                <span className="font-medium text-foreground">{addMemberDialogRole.name}</span>
              </div>

              {resourcesBlock ? (
                <Alert variant="destructive">
                  <AlertTitle>Impossible de charger le catalogue</AlertTitle>
                  <AlertDescription>
                    {resourcesBlock.status === 403
                      ? 'Tu n’as pas la permission de consulter le catalogue des ressources.'
                      : resourcesBlock.message}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="team-person-search">Personne</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setNewPersonDialogOpen(true)}
                    disabled={resourceCatalogDenied}
                  >
                    <UserPlus className="h-4 w-4" />
                    Nouvelle personne
                  </Button>
                </div>
                <Input
                  id="team-person-search"
                  value={teamResourceSearch}
                  onChange={(e) => setTeamResourceSearch(e.target.value)}
                  placeholder="Filtrer par nom, email, code…"
                  disabled={resourceCatalogDenied}
                />
                <Select
                  value={teamOwnerResourceId || RESOURCE_NONE}
                  onValueChange={(v) => {
                    const next = v ?? RESOURCE_NONE;
                    setTeamOwnerResourceId(next === RESOURCE_NONE ? '' : next);
                    if (next === RESOURCE_NONE) {
                      setTeamOwnerResourceDetails(null);
                      return;
                    }
                    const r =
                      humanResources.find((x) => x.id === next) ??
                      (teamOwnerResourceDetails?.id === next ? teamOwnerResourceDetails : null);
                    setTeamOwnerResourceDetails(r);
                  }}
                  disabled={resourceCatalogDenied || resourcesLoading}
                >
                  <SelectTrigger id="team-person-select" size="sm" className="h-auto min-h-8 w-full max-w-full min-w-0">
                    <SelectValue
                      placeholder={resourcesLoading ? 'Chargement…' : 'Choisir une personne'}
                    >
                      {resourcesLoading
                        ? 'Chargement…'
                        : teamOwnerResourceId
                          ? (teamPersonTriggerLabel ?? 'Personne')
                          : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RESOURCE_NONE}>— Choisir dans la liste —</SelectItem>
                    {resourcesForSelectDropdown.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {formatResourceDisplayName(r)}
                        {r.email ? ` · ${r.email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teamOwnerResourceDetails?.email ? (
                  <p className="text-xs text-muted-foreground">
                    Email : {teamOwnerResourceDetails.email}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddMemberDialogRoleId(null);
                    setTeamResourceSearch('');
                    setTeamOwnerResourceId('');
                    setTeamOwnerResourceDetails(null);
                  }}
                >
                  Fermer
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const roleId = addMemberDialogRole.id;
                    if (!teamOwnerResourceId || teamOwnerResourceId === RESOURCE_NONE) {
                      toast.error('Choisis une personne dans le catalogue');
                      return;
                    }
                    const r =
                      humanResources.find((x) => x.id === teamOwnerResourceId) ??
                      teamOwnerResourceDetails;
                    if (!r) {
                      toast.error('Personne introuvable');
                      return;
                    }
                    const freeLabel = formatResourceDisplayName(r);
                    const maxLen = 200;
                    const label =
                      freeLabel.length > maxLen ? `${freeLabel.slice(0, maxLen - 1)}…` : freeLabel;
                    addMemberMutation.mutate({
                      roleId,
                      freeLabel: label,
                      affiliation: r.affiliation === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
                    });
                  }}
                  disabled={addMemberMutation.isPending || resourceCatalogDenied}
                >
                  Ajouter
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={newPersonDialogOpen} onOpenChange={setNewPersonDialogOpen}>
        <DialogContent
          className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">Nouvelle personne</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Création dans le catalogue ressources (client actif), puis affectation au rôle d’équipe.
            </DialogDescription>
          </DialogHeader>
          {newPersonDialogOpen ? (
            <NewResourceForm
              formIdPrefix="project-team-new-person"
              forceType="HUMAN"
              className="w-full max-w-full space-y-4"
              onSuccess={(created) => {
                setTeamOwnerResourceId(created.id);
                setTeamOwnerResourceDetails(created);
                void refetchHumanResources();
                setNewPersonDialogOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
