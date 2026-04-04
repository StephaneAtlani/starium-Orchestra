'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
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
import { Label } from '@/components/ui/label';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import type { ApiFormError } from '@/features/teams/collaborators/api/collaborators.api';
import { getResource } from '@/services/resources';
import { useAddWorkTeamMember } from '../hooks/use-work-team-mutations';
import { useWorkTeamDetail } from '../hooks/use-work-team-detail';
import { resolveCollaboratorIdFromHumanResource } from '../lib/resolve-human-resource-to-collaborator';
import { workTeamMemberRoleLabel } from '../lib/work-team-label-mappers';
import type { WorkTeamMemberRole } from '../types/work-team.types';
import { HumanResourceCombobox } from './human-resource-combobox';

const ROLES: WorkTeamMemberRole[] = ['MEMBER', 'LEAD', 'DEPUTY'];

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
  const { has, isSuccess: permsOk } = usePermissions();

  const [resourceId, setResourceId] = useState('');
  const [role, setRole] = useState<WorkTeamMemberRole>('MEMBER');

  const canReadResources = permsOk && has('resources.read');

  const teamDetailQuery = useWorkTeamDetail(teamId);
  const leadCollaboratorId = teamDetailQuery.data?.leadCollaboratorId ?? null;

  const addMutation = useAddWorkTeamMember(teamId);

  useEffect(() => {
    if (!open) {
      setResourceId('');
      setRole('MEMBER');
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canReadResources) {
      toast.error('Permission catalogue ressources (resources.read) requise');
      return;
    }
    try {
      if (!resourceId) {
        toast.error('Choisissez une ressource Humaine');
        return;
      }
      let res;
      try {
        res = await getResource(authFetch, resourceId);
      } catch {
        toast.error('Ressource introuvable');
        return;
      }
      let resolvedCollaboratorId: string;
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

      if (leadCollaboratorId && resolvedCollaboratorId === leadCollaboratorId) {
        toast.error('Le responsable d’équipe ne peut pas être ajouté comme membre.');
        return;
      }

      await addMutation.mutateAsync({ collaboratorId: resolvedCollaboratorId, role });
      toast.success('Membre ajouté');
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const canSubmit = canReadResources && !!resourceId && !addMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>
              Choisissez une ressource du catalogue <strong>Humaine</strong> du client actif. Le
              rattachement équipe réutilise ou crée la fiche Collaborateur correspondante (référentiel
              Équipes).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!canReadResources && (
              <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
                <AlertTitle className="text-amber-800 dark:text-amber-200">
                  Catalogue ressources requis
                </AlertTitle>
                <AlertDescription className="text-sm">
                  Activez le module Ressources pour ce client et la permission{' '}
                  <code className="text-xs">resources.read</code> pour ajouter un membre depuis le catalogue
                  Humaine.
                </AlertDescription>
              </Alert>
            )}

            {canReadResources && !has('collaborators.create') && (
              <Alert className="border-muted">
                <AlertTitle className="text-sm">Sans collaborators.create</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Si une fiche collaborateur existe déjà pour l’email de la ressource, le rattachement
                  fonctionne. Sinon, demandez la permission{' '}
                  <code className="text-xs">collaborators.create</code>.
                </AlertDescription>
              </Alert>
            )}

            {canReadResources ? (
              <HumanResourceCombobox
                id="m-res"
                dialogOpen={open}
                value={resourceId}
                onChange={setResourceId}
                disabled={addMutation.isPending}
                excludeCollaboratorId={leadCollaboratorId}
              />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="m-role">Rôle dans l’équipe</Label>
              <select
                id="m-role"
                name="workTeamMemberRole"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as WorkTeamMemberRole)}
                disabled={!canReadResources}
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
            <Button type="submit" disabled={!canSubmit}>
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
