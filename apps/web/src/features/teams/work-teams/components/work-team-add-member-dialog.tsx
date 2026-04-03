'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { useCollaboratorManagerOptions } from '@/features/teams/collaborators/hooks/use-collaborator-manager-options';
import { collaboratorManagerSecondaryLabel } from '@/features/teams/collaborators/lib/collaborator-label-mappers';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import type { ApiFormError } from '@/features/teams/collaborators/api/collaborators.api';
import { listResources } from '@/services/resources';
import { useAddWorkTeamMember } from '../hooks/use-work-team-mutations';
import { resolveCollaboratorIdFromHumanResource } from '../lib/resolve-human-resource-to-collaborator';
import { workTeamMemberRoleLabel } from '../lib/work-team-label-mappers';
import type { WorkTeamMemberRole } from '../types/work-team.types';

const ROLES: WorkTeamMemberRole[] = ['MEMBER', 'LEAD', 'DEPUTY'];

type MemberSource = 'collaborator' | 'human_resource';

export function WorkTeamAddMemberDialog({
  open,
  onOpenChange,
  teamId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isSuccess: permsOk } = usePermissions();

  const [memberSource, setMemberSource] = useState<MemberSource>('collaborator');
  const [search, setSearch] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [role, setRole] = useState<WorkTeamMemberRole>('MEMBER');

  /** Membres d’équipe = ressources du catalogue « Humaine » ; lecture catalogue requise pour ce flux. */
  const canReadResources = permsOk && has('resources.read');

  const managersQuery = useCollaboratorManagerOptions(search, {
    enabled: open && memberSource === 'collaborator',
  });

  const humanResourcesQuery = useQuery({
    queryKey: ['resources', 'human-for-team-member', clientId, teamId],
    queryFn: () =>
      listResources(authFetch, { type: 'HUMAN', limit: 200, offset: 0 }),
    enabled: open && memberSource === 'human_resource' && !!clientId && canReadResources,
  });

  const addMutation = useAddWorkTeamMember(teamId);

  /** Par défaut : catalogue Humaine (aligné métier « équipe = ressources Humaine »). */
  useEffect(() => {
    if (!open) return;
    if (canReadResources) {
      setMemberSource('human_resource');
    } else {
      setMemberSource('collaborator');
    }
  }, [open, canReadResources]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setCollaboratorId('');
      setResourceId('');
      setRole('MEMBER');
    }
  }, [open]);

  useEffect(() => {
    setCollaboratorId('');
    setResourceId('');
  }, [memberSource]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let resolvedCollaboratorId = collaboratorId;

      if (memberSource === 'human_resource') {
        if (!canReadResources) {
          toast.error('Permission catalogue ressources (resources.read) requise');
          return;
        }
        if (!resourceId) {
          toast.error('Choisissez une ressource Humaine');
          return;
        }
        const items = humanResourcesQuery.data?.items ?? [];
        const res = items.find((r) => r.id === resourceId);
        if (!res) {
          toast.error('Ressource introuvable');
          return;
        }
        try {
          resolvedCollaboratorId = await resolveCollaboratorIdFromHumanResource(authFetch, res);
        } catch (e) {
          const err = e as ApiFormError;
          if (err.status === 403) {
            toast.error(
              'Création collaborateur refusée : il faut collaborators.create si aucune fiche ne correspond à l’email de cette ressource.',
            );
            return;
          }
          throw e;
        }
      } else if (!collaboratorId) {
        toast.error('Choisissez un collaborateur');
        return;
      }

      await addMutation.mutateAsync({ collaboratorId: resolvedCollaboratorId, role });
      toast.success('Membre ajouté');
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const resourceItems = humanResourcesQuery.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>
              Une équipe regroupe des ressources du catalogue « Humaine » (prioritaire) ; le
              rattachement équipe réutilise ou crée une fiche Collaborateur (référentiel Équipes).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!canReadResources && (
              <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
                <AlertTitle className="text-amber-800 dark:text-amber-200">
                  Catalogue Humaine indisponible
                </AlertTitle>
                <AlertDescription className="text-sm">
                  Activez le module Ressources pour ce client et la permission{' '}
                  <code className="text-xs">resources.read</code> pour choisir des ressources Humaine. Sinon
                  utilisez la liste Collaborateur ci-dessous.
                </AlertDescription>
              </Alert>
            )}

            {canReadResources ? (
              <div className="space-y-2">
                <Label htmlFor="m-source">Source</Label>
                <select
                  id="m-source"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={memberSource}
                  onChange={(e) => setMemberSource(e.target.value as MemberSource)}
                >
                  <option value="human_resource">Humaine — catalogue ressources (recommandé)</option>
                  <option value="collaborator">Collaborateur — fiche déjà existante</option>
                </select>
              </div>
            ) : null}

            {memberSource === 'human_resource' && canReadResources && !has('collaborators.create') && (
              <Alert className="border-muted">
                <AlertTitle className="text-sm">Sans collaborators.create</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Si une fiche collaborateur existe déjà pour l’email de la ressource, le rattachement fonctionne.
                  Sinon, demandez la permission <code className="text-xs">collaborators.create</code>.
                </AlertDescription>
              </Alert>
            )}

            {memberSource === 'collaborator' || !canReadResources ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="m-search">Recherche</Label>
                  <Input
                    id="m-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom ou email…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-collab">Collaborateur</Label>
                  <select
                    id="m-collab"
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                    value={collaboratorId}
                    onChange={(e) => setCollaboratorId(e.target.value)}
                    required={memberSource === 'collaborator' || !canReadResources}
                  >
                    <option value="">—</option>
                    {(managersQuery.data?.items ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                        {collaboratorManagerSecondaryLabel(c)
                          ? ` — ${collaboratorManagerSecondaryLabel(c)}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="m-res">Ressource Humaine</Label>
                <select
                  id="m-res"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  disabled={humanResourcesQuery.isLoading}
                  required
                >
                  <option value="">— Choisir une ressource Humaine</option>
                  {resourceItems.map((r) => {
                    const label =
                      [r.firstName?.trim(), r.name.trim()].filter(Boolean).join(' ') || r.name;
                    const sub = r.email?.trim() || null;
                    return (
                      <option key={r.id} value={r.id}>
                        {label}
                        {sub ? ` — ${sub}` : ''}
                      </option>
                    );
                  })}
                </select>
                {humanResourcesQuery.isError && (
                  <p className="text-xs text-destructive">Impossible de charger le catalogue ressources.</p>
                )}
                {humanResourcesQuery.isSuccess && resourceItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucune ressource Humaine pour ce client — créez-en dans Ressources ou Collaborateurs.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="m-role">Rôle dans l’équipe</Label>
              <select
                id="m-role"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as WorkTeamMemberRole)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {workTeamMemberRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
