'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { useAddWorkTeamMember } from '../hooks/use-work-team-mutations';
import { workTeamMemberRoleLabel } from '../lib/work-team-label-mappers';
import type { WorkTeamMemberRole } from '../types/work-team.types';

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
  const [search, setSearch] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [role, setRole] = useState<WorkTeamMemberRole>('MEMBER');
  const managersQuery = useCollaboratorManagerOptions(search);
  const addMutation = useAddWorkTeamMember(teamId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!collaboratorId) {
      toast.error('Choisissez un collaborateur');
      return;
    }
    try {
      await addMutation.mutateAsync({ collaboratorId, role });
      toast.success('Membre ajouté');
      setCollaboratorId('');
      setSearch('');
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>
              Rattacher un collaborateur à cette équipe organisationnelle.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
                required
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
