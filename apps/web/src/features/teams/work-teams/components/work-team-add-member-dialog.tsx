'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/use-permissions';
import { useAddWorkTeamMember } from '../hooks/use-work-team-mutations';
import { useWorkTeamDetail } from '../hooks/use-work-team-detail';
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
  const { has, isSuccess: permsOk } = usePermissions();

  const [resourceId, setResourceId] = useState('');
  const [role, setRole] = useState<WorkTeamMemberRole>('MEMBER');

  const canReadResources = permsOk && has('resources.read');

  const teamDetailQuery = useWorkTeamDetail(teamId);
  const leadResourceId = teamDetailQuery.data?.leadResourceId ?? null;

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

      if (leadResourceId && resourceId === leadResourceId) {
        toast.error('Le responsable d’équipe ne peut pas être ajouté comme membre.');
        return;
      }

      await addMutation.mutateAsync({ resourceId, role });
      toast.success('Membre ajouté');
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const canSubmit = canReadResources && !!resourceId && !addMutation.isPending;

  const formId = 'work-team-add-member-form';

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter un membre"
      description={
        <>
          Choisissez une ressource du catalogue <strong>Humaine</strong> du client actif. Le membre
          d’équipe est identifié par <code className="text-xs">resourceId</code> (Resource HUMAN).
        </>
      }
      size="md"
      contentClassName="sm:max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form={formId} disabled={!canSubmit}>
            Ajouter
          </Button>
        </>
      }
    >
        <form id={formId} onSubmit={onSubmit}>
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

            {canReadResources ? (
              <HumanResourceCombobox
                id="m-res"
                dialogOpen={open}
                value={resourceId}
                onChange={setResourceId}
                disabled={addMutation.isPending}
                excludeResourceId={leadResourceId}
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
        </form>
    </StariumModal>
  );
}
