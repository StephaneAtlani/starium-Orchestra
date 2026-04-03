'use client';

import { useLayoutEffect, useMemo, useState } from 'react';
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
import { useCreateWorkTeam, useUpdateWorkTeam } from '../hooks/use-work-team-mutations';
import { useWorkTeamsList } from '../hooks/use-work-teams-list';
import type { WorkTeamDto } from '../types/work-team.types';
import { WorkTeamLeadCombobox } from './work-team-lead-combobox';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  team?: WorkTeamDto | null;
  defaultParentId?: string | null;
};

export function WorkTeamFormDialog({
  open,
  onOpenChange,
  mode,
  team,
  defaultParentId,
}: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [leadCollaboratorId, setLeadCollaboratorId] = useState<string>('');

  const parentsQuery = useWorkTeamsList(
    { limit: 500, offset: 0, includeArchived: true },
    { enabled: open },
  );
  const parentOptions = useMemo(() => {
    const items = parentsQuery.data?.items ?? [];
    if (mode === 'edit' && team) {
      return items.filter((t) => t.id !== team.id);
    }
    return items;
  }, [parentsQuery.data?.items, mode, team]);

  const createMutation = useCreateWorkTeam();
  const updateMutation = useUpdateWorkTeam(team?.id ?? '');

  useLayoutEffect(() => {
    if (!open) return;
    if (mode === 'edit' && team) {
      setName(team.name);
      setCode(team.code ?? '');
      setParentId(team.parentId ?? '');
      setLeadCollaboratorId(team.leadCollaboratorId ?? '');
    } else {
      setName('');
      setCode('');
      setParentId(defaultParentId ?? '');
      setLeadCollaboratorId('');
    }
  }, [open, mode, team, defaultParentId]);

  const busy = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Le nom est obligatoire');
      return;
    }
    try {
      if (mode === 'create') {
        if (!leadCollaboratorId) {
          toast.error('Choisissez un responsable d’équipe (manager)');
          return;
        }
        await createMutation.mutateAsync({
          name: trimmed,
          code: code.trim() || null,
          parentId: parentId ? parentId : null,
          leadCollaboratorId,
        });
        toast.success('Équipe créée');
      } else if (team) {
        if (team.status === 'ACTIVE' && !leadCollaboratorId) {
          toast.error('Une équipe active doit avoir un responsable (manager)');
          return;
        }
        await updateMutation.mutateAsync({
          name: trimmed,
          code: code.trim() || null,
          parentId: parentId ? parentId : null,
          leadCollaboratorId: leadCollaboratorId ? leadCollaboratorId : null,
        });
        toast.success('Équipe mise à jour');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Nouvelle équipe organisationnelle' : 'Modifier l’équipe'}
            </DialogTitle>
            <DialogDescription>
              Équipe métier Starium (distincte de Microsoft Teams). Hiérarchie et rattachements
              collaborateurs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wt-name">Nom</Label>
              <Input
                id="wt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wt-code">Code métier (optionnel)</Label>
              <Input
                id="wt-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={busy}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wt-parent">Équipe parente</Label>
              <select
                id="wt-parent"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={busy || parentsQuery.isLoading}
              >
                <option value="">Racine (aucun parent)</option>
                {parentOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.pathLabel}
                  </option>
                ))}
              </select>
            </div>
            <WorkTeamLeadCombobox
              id="wt-lead"
              value={leadCollaboratorId}
              onChange={setLeadCollaboratorId}
              fallbackLabel={mode === 'edit' ? team?.leadDisplayName ?? null : null}
              allowEmpty={mode === 'edit' && team?.status === 'ARCHIVED'}
              disabled={busy}
              dialogOpen={open}
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Annuler
            </Button>
            <Button type="submit" disabled={busy}>
              {mode === 'create' ? 'Créer' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
